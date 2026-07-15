import jwt from "jsonwebtoken";
import { User } from "./models.js";

export function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

export async function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ message: "Not authenticated" });
  try {
    const payload = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ message: `Requires ${role} account` });
    next();
  };
}

export function publicUser(u) {
  return { _id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, avatar: u.avatar };
}
