import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["buyer", "agent"], required: true },
  phone: String,
  avatar: String,
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, enum: ["house", "apartment", "plot", "commercial"], required: true },
  status: { type: String, enum: ["for-sale", "for-rent", "sold", "rented"], default: "for-sale" },
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true, index: true },
    lat: Number,
    lng: Number,
  },
  bedrooms: Number,
  bathrooms: Number,
  areaSqft: Number,
  images: [String],
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  views: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
}, { timestamps: true });

propertySchema.index({ title: "text", description: "text" });

export const Property = mongoose.model("Property", propertySchema);

const inquirySchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["pending", "responded", "closed"], default: "pending" },
}, { timestamps: true });

export const Inquiry = mongoose.model("Inquiry", inquirySchema);

/* ---------- Chat ---------- */
const conversationSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lastMessage: String,
  lastMessageAt: Date,
}, { timestamps: true });

conversationSchema.index({ property: 1, buyer: 1 }, { unique: true });

export const Conversation = mongoose.model("Conversation", conversationSchema);

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

export const Message = mongoose.model("Message", messageSchema);
