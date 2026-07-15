import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Property, Inquiry } from "./models.js";
import { auth, requireRole, sign, publicUser } from "./auth.js";
import { upload, uploadBuffer } from "./cloudinary.js";
import { registerChatRoutes, initSocket } from "./chat.js";
import jwt from "jsonwebtoken";

const viewCache = new Set();
setInterval(() => {
  viewCache.clear();
}, 60 * 60 * 1000);

const app = express();
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : true;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins === true || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ----------- AUTH ----------- */
app.post("/api/auth/signup", upload.single("avatar"), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: "Missing fields" });
    if (!["buyer", "agent"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    if (await User.findOne({ email })) return res.status(409).json({ message: "Email already registered" });

    let avatarUrl = "";
    if (req.file) {
      avatarUrl = await uploadBuffer(req.file.buffer);
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role, phone, avatar: avatarUrl });
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put("/api/auth/profile", auth, upload.single("avatar"), async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email && email !== user.email) {
      if (await User.findOne({ email })) {
        return res.status(409).json({ message: "Email already registered" });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    if (role && ["buyer", "agent"].includes(role)) {
      user.role = role;
    }

    if (req.file) {
      user.avatar = await uploadBuffer(req.file.buffer);
    }

    await user.save();
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ----------- PROPERTIES ----------- */
app.get("/api/properties", async (req, res) => {
  try {
    const { q, city, type, status, min, max } = req.query;
    const filter = {};
    if (city) filter["location.city"] = new RegExp(city, "i");
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (min || max) filter.price = { ...(min && { $gte: Number(min) }), ...(max && { $lte: Number(max) }) };
    if (q) filter.$or = [
      { title: new RegExp(q, "i") },
      { description: new RegExp(q, "i") },
      { "location.city": new RegExp(q, "i") },
    ];
    const properties = await Property.find(filter).sort({ featured: -1, createdAt: -1 }).populate("agent", "name email phone avatar");
    res.json({ properties });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get("/api/properties/mine", auth, requireRole("agent"), async (req, res) => {
  const properties = await Property.find({ agent: req.user._id }).sort({ createdAt: -1 });
  res.json({ properties });
});

app.get("/api/properties/:id", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const cacheKey = `${ip}:${req.params.id}`;

    let isAgentOwner = false;
    const h = req.headers.authorization;
    if (h?.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(h.slice(7), process.env.JWT_SECRET);
        const property = await Property.findById(req.params.id);
        if (property && String(property.agent) === String(payload.id)) {
          isAgentOwner = true;
        }
      } catch (e) {
        // Ignore token verify error
      }
    }

    let property;
    if (isAgentOwner || viewCache.has(cacheKey)) {
      property = await Property.findById(req.params.id).populate("agent", "name email phone avatar");
    } else {
      property = await Property.findByIdAndUpdate(
        req.params.id, { $inc: { views: 1 } }, { new: true }
      ).populate("agent", "name email phone avatar");
      viewCache.add(cacheKey);
    }

    if (!property) return res.status(404).json({ message: "Not found" });
    res.json({ property });
  } catch (e) { res.status(400).json({ message: "Invalid id" }); }
});

app.post("/api/properties", auth, requireRole("agent"), upload.array("images", 6), async (req, res) => {
  try {
    const b = req.body;
    const images = req.files?.length
      ? await Promise.all(req.files.map((f) => uploadBuffer(f.buffer)))
      : [];
    const property = await Property.create({
      title: b.title,
      description: b.description,
      price: Number(b.price),
      type: b.type,
      status: b.status || "for-sale",
      location: { address: b.address, city: b.city },
      bedrooms: b.bedrooms ? Number(b.bedrooms) : undefined,
      bathrooms: b.bathrooms ? Number(b.bathrooms) : undefined,
      areaSqft: b.areaSqft ? Number(b.areaSqft) : undefined,
      images,
      agent: req.user._id,
    });
    res.json({ property });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete("/api/properties/:id", auth, requireRole("agent"), async (req, res) => {
  const p = await Property.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  if (String(p.agent) !== String(req.user._id)) return res.status(403).json({ message: "Not your listing" });
  await p.deleteOne();
  res.json({ ok: true });
});

app.put("/api/properties/:id", auth, requireRole("agent"), upload.array("images", 6), async (req, res) => {
  try {
    const p = await Property.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Not found" });
    if (String(p.agent) !== String(req.user._id)) return res.status(403).json({ message: "Not your listing" });

    const b = req.body;
    let keptImages = [];
    if (b.existingImages) {
      keptImages = Array.isArray(b.existingImages) ? b.existingImages : [b.existingImages];
    }

    const newImages = req.files?.length
      ? await Promise.all(req.files.map((f) => uploadBuffer(f.buffer)))
      : [];

    const finalImages = [...keptImages, ...newImages].slice(0, 6);

    p.title = b.title || p.title;
    p.description = b.description || p.description;
    p.price = Number(b.price) || p.price;
    p.type = b.type || p.type;
    p.status = b.status || p.status;
    p.location = { address: b.address || p.location.address, city: b.city || p.location.city };
    p.bedrooms = b.bedrooms ? Number(b.bedrooms) : undefined;
    p.bathrooms = b.bathrooms ? Number(b.bathrooms) : undefined;
    p.areaSqft = b.areaSqft ? Number(b.areaSqft) : undefined;
    p.images = finalImages;

    await p.save();
    res.json({ property: p });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put("/api/properties/:id/feature", auth, requireRole("agent"), async (req, res) => {
  try {
    const p = await Property.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Not found" });
    if (String(p.agent) !== String(req.user._id)) return res.status(403).json({ message: "Not your listing" });

    p.featured = true;
    await p.save();
    res.json({ property: p });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

/* ----------- INQUIRIES ----------- */
app.post("/api/inquiries", auth, requireRole("buyer"), async (req, res) => {
  try {
    const { property, message } = req.body;
    const inq = await Inquiry.create({ property, buyer: req.user._id, message });
    res.json({ inquiry: inq });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.get("/api/inquiries/mine", auth, requireRole("buyer"), async (req, res) => {
  const inquiries = await Inquiry.find({ buyer: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: "property", select: "title images location price status" });
  res.json({ inquiries });
});

app.get("/api/inquiries/received", auth, requireRole("agent"), async (req, res) => {
  const props = await Property.find({ agent: req.user._id }).select("_id");
  const inquiries = await Inquiry.find({ property: { $in: props.map((p) => p._id) } })
    .sort({ createdAt: -1 })
    .populate("property", "title images location")
    .populate("buyer", "name email phone");
  res.json({ inquiries });
});

app.patch("/api/inquiries/:id", auth, requireRole("agent"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "responded", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const inq = await Inquiry.findById(req.params.id).populate("property");
    if (!inq) return res.status(404).json({ message: "Inquiry not found" });
    if (String(inq.property.agent) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to update this inquiry" });
    }
    inq.status = status;
    await inq.save();
    res.json({ inquiry: inq });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete("/api/inquiries/:id", auth, async (req, res) => {
  try {
    const inq = await Inquiry.findById(req.params.id).populate("property");
    if (!inq) return res.status(404).json({ message: "Inquiry not found" });

    const me = String(req.user._id);
    const buyerId = String(inq.buyer);
    const agentId = inq.property ? String(inq.property.agent) : null;

    if (me !== buyerId && me !== agentId) {
      return res.status(403).json({ message: "Not authorized to delete this inquiry" });
    }

    await inq.deleteOne();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ----------- CHAT ----------- */
registerChatRoutes(app, auth);

/* ----------- ERROR HANDLER ----------- */
app.use((err, req, res, next) => {
  console.error("Unhandled API Error:", err);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

/* ----------- START ----------- */
const port = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("MongoDB connected");
  server.listen(port, () => console.log(`RealHaven API + Socket.io on http://localhost:${port}`));
}).catch((e) => {
  console.error("Mongo error", e.message);
  process.exit(1);
});
