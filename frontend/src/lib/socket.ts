import { io, type Socket } from "socket.io-client";
import { API_URL, auth } from "./api";

let socket: Socket | null = null;

function socketOrigin() {
  // API_URL is like http://host:port/api — strip trailing /api for socket
  try {
    const u = new URL(API_URL);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://localhost:5000";
  }
}

export function getSocket(): Socket | null {
  const token = auth.token();
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (socket) { socket.disconnect(); socket = null; }
  socket = io(socketOrigin(), {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
  return socket;
}

export function closeSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
