const RAW = (import.meta as any).env?.VITE_API_URL as string | undefined;
export const API_URL = RAW || "http://localhost:5000/api";

const TOKEN_KEY = "nexreal_token";
const USER_KEY = "nexreal_user";

export type Role = "buyer" | "agent";
export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
}

export const auth = {
  token(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  user(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  set(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("RealHaven:auth"));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("RealHaven:auth"));
  },
};

type ApiOpts = Omit<RequestInit, "body"> & { body?: any; form?: FormData };
export async function api<T = any>(path: string, opts: ApiOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  const token = auth.token();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const { body: _b, form: _f, headers: _h, ...rest } = opts;
  const res = await fetch(`${API_URL}${path}`, { ...rest, headers, body });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (isJson && (data as any)?.message) || res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export interface Property {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: "house" | "apartment" | "plot" | "commercial";
  status: "for-sale" | "for-rent" | "sold" | "rented";
  location: { address: string; city: string; lat?: number; lng?: number };
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
  images: string[];
  agent: { _id: string; name: string; email: string; phone?: string; avatar?: string } | string;
  views: number;
  featured?: boolean;
  createdAt: string;
}

export interface Inquiry {
  _id: string;
  property: Property;
  buyer: AuthUser;
  message: string;
  status: "pending" | "responded" | "closed";
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: string;
  readBy?: string[];
  pending?: boolean;
}

export interface Conversation {
  _id: string;
  property: { _id: string; title: string; images: string[]; price: number; location: { city: string } };
  buyer: { _id: string; name: string; email: string; avatar?: string };
  agent: { _id: string; name: string; email: string; phone?: string; avatar?: string };
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt: string;
  unreadCount?: number;
}

export function formatPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
