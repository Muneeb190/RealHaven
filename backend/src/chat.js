import { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { Conversation, Message, Property, User } from "./models.js";

async function sendOfflineEmailNotification(recipientId, senderName, text, propertyTitle) {
  try {
    const recipient = await User.findById(recipientId);
    if (!recipient || !recipient.email) return;

    const subject = `New message on RealHaven from ${senderName}`;
    const plainText = `Hi ${recipient.name},\n\nYou received a new message from ${senderName} regarding "${propertyTitle}":\n\n"${text}"\n\nReply at: http://localhost:3000/messages\n\nWarmly,\nRealHaven Team`;
    
    const htmlText = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="font-size: 20px; font-weight: 600; color: #1e1b4b; margin-top: 0;">New Message on RealHaven</h2>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Hi <strong>${recipient.name}</strong>,</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">You received a new message from <strong>${senderName}</strong> regarding the listing <em>"${propertyTitle}"</em>:</p>
        <blockquote style="margin: 16px 0; padding: 12px 16px; background-color: #f3f4f6; border-left: 4px solid #0f766e; color: #1f2937; border-radius: 4px; font-style: italic;">
          "${text}"
        </blockquote>
        <a href="http://localhost:3000/messages" style="display: inline-block; background-color: #0f766e; color: #ffffff; padding: 10px 20px; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 500; margin-top: 10px;">Reply to message</a>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 11px;">RealHaven — A small, human real estate index.</p>
      </div>
    `;

    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `RealHaven <${process.env.SMTP_FROM || "no-reply@realhaven.co"}>`,
        to: recipient.email,
        subject,
        text: plainText,
        html: htmlText,
      });
      console.log(`[MAILER] ✉️ Sent real offline SMTP email to ${recipient.email}`);
    } else {
      console.log(`
┌────────────────────────────────────────────────────────┐
│ [MAILER] ✉️  SIMULATED OFFLINE EMAIL NOTIFICATION      │
├────────────────────────────────────────────────────────┤
│ To:       ${recipient.email}
│ Subject:  ${subject}
│ Message:  "${text}"
│ Property: "${propertyTitle}"
├────────────────────────────────────────────────────────┤
│ Note: Setup SMTP_HOST in .env to send real emails.    │
└────────────────────────────────────────────────────────┘
      `);
    }
  } catch (err) {
    console.error("[MAILER] Error sending offline notification email:", err.message);
  }
}

export function registerChatRoutes(app, auth) {
  // Start (or get) a conversation with the agent about a property
  app.post("/api/conversations", auth, async (req, res) => {
    try {
      const { property: propertyId } = req.body;
      const property = await Property.findById(propertyId);
      if (!property) return res.status(404).json({ message: "Property not found" });

      // Only buyers initiate; the agent is the property's owner
      const me = req.user;
      let buyerId, agentId;
      if (me.role === "buyer") { buyerId = me._id; agentId = property.agent; }
      else if (String(me._id) === String(property.agent)) {
        return res.status(400).json({ message: "Agents can't start a conversation with themselves." });
      } else {
        return res.status(403).json({ message: "Only buyers can start conversations." });
      }

      let convo = await Conversation.findOne({ property: propertyId, buyer: buyerId });
      if (!convo) convo = await Conversation.create({ property: propertyId, buyer: buyerId, agent: agentId });
      const populated = await convo.populate([
        { path: "property", select: "title images price location" },
        { path: "buyer", select: "name email avatar" },
        { path: "agent", select: "name email phone avatar" },
      ]);
      res.json({ conversation: populated });
    } catch (e) { res.status(400).json({ message: e.message }); }
  });

  // My conversations (either role)
  app.get("/api/conversations", auth, async (req, res) => {
    const me = req.user;
    const filter = me.role === "agent" ? { agent: me._id } : { buyer: me._id };
    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate("property", "title images price location")
      .populate("buyer", "name email avatar")
      .populate("agent", "name email phone avatar");
      
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (convo) => {
        const unreadCount = await Message.countDocuments({
          conversation: convo._id,
          sender: { $ne: me._id },
          readBy: { $ne: me._id },
        });
        return {
          ...convo.toObject(),
          unreadCount,
        };
      })
    );
    res.json({ conversations: conversationsWithUnread });
  });

  app.get("/api/conversations/:id/messages", auth, async (req, res) => {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ message: "Not found" });
    const me = String(req.user._id);
    if (me !== String(convo.buyer) && me !== String(convo.agent))
      return res.status(403).json({ message: "Not a participant" });
      
    await Message.updateMany(
      { conversation: convo._id, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    const messages = await Message.find({ conversation: convo._id }).sort({ createdAt: 1 });
    res.json({ messages });
  });

  app.delete("/api/conversations/:id", auth, async (req, res) => {
    try {
      const convo = await Conversation.findById(req.params.id);
      if (!convo) return res.status(404).json({ message: "Conversation not found" });

      const me = String(req.user._id);
      if (me !== String(convo.buyer) && me !== String(convo.agent)) {
        return res.status(403).json({ message: "Not a participant" });
      }

      await Message.deleteMany({ conversation: convo._id });
      await convo.deleteOne();
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
  });
}

export function initSocket(server) {
  const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
    : true;
  const io = new IOServer(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select("-password");
      if (!user) return next(new Error("Invalid user"));
      socket.user = user;
      next();
    } catch (e) { next(new Error("Auth failed")); }
  });

  io.on("connection", (socket) => {
    // Join a conversation room (server verifies membership)
    socket.on("join", async (conversationId) => {
      const convo = await Conversation.findById(conversationId);
      if (!convo) return;
      const me = String(socket.user._id);
      if (me !== String(convo.buyer) && me !== String(convo.agent)) return;
      socket.join(`c:${conversationId}`);
    });

    socket.on("leave", (conversationId) => {
      socket.leave(`c:${conversationId}`);
    });

    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(`c:${conversationId}`).emit("typing", {
        userId: socket.user._id, isTyping: !!isTyping,
      });
    });

    socket.on("message", async ({ conversationId, text }, ack) => {
      try {
        if (!text?.trim()) return ack?.({ error: "Empty" });
        const convo = await Conversation.findById(conversationId);
        if (!convo) return ack?.({ error: "Not found" });
        const me = String(socket.user._id);
        if (me !== String(convo.buyer) && me !== String(convo.agent))
          return ack?.({ error: "Not a participant" });

        const msg = await Message.create({
          conversation: convo._id,
          sender: socket.user._id,
          text: text.trim(),
          readBy: [socket.user._id],
        });
        convo.lastMessage = msg.text.slice(0, 140);
        convo.lastMessageAt = msg.createdAt;
        await convo.save();

        io.to(`c:${conversationId}`).emit("message", msg);
        ack?.({ ok: true, message: msg });

        // Trigger offline email notification check asynchronously
        (async () => {
          try {
            const recipientId = String(socket.user._id) === String(convo.buyer) ? convo.agent : convo.buyer;
            
            // Check if recipient is currently online (has any active socket connection)
            let recipientOnline = false;
            for (const [_, s] of io.of("/").sockets) {
              if (s.user && String(s.user._id) === String(recipientId)) {
                recipientOnline = true;
                break;
              }
            }

            if (!recipientOnline) {
              // Populate property title for the email content
              const property = await Property.findById(convo.property).select("title");
              const propertyTitle = property ? property.title : "Property";
              await sendOfflineEmailNotification(recipientId, socket.user.name, msg.text, propertyTitle);
            }
          } catch (mailErr) {
            console.error("[MAILER] Failed to trigger offline check:", mailErr.message);
          }
        })();
      } catch (e) { ack?.({ error: e.message }); }
    });

    socket.on("read", async ({ conversationId }) => {
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo) return;
        const me = String(socket.user._id);
        if (me !== String(convo.buyer) && me !== String(convo.agent)) return;

        await Message.updateMany(
          { conversation: convo._id, sender: { $ne: socket.user._id }, readBy: { $ne: socket.user._id } },
          { $addToSet: { readBy: socket.user._id } }
        );

        io.to(`c:${conversationId}`).emit("read", { conversationId, readerId: socket.user._id });
      } catch (e) {
        console.error("Socket read event error:", e.message);
      }
    });
  });

  return io;
}
