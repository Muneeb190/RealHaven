import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, MessageCircle } from "lucide-react";
import { api, auth as authStore, type ChatMessage, type Conversation } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/lib/hooks";

interface Props {
  conversationId?: string;
  conversation?: Conversation;
  onClose?: () => void;
  variant?: "floating" | "inline";
}

export function ChatPanel({ conversationId, conversation, onClose, variant = "inline" }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cid = conversationId || conversation?._id;

  useEffect(() => {
    if (!cid) return;
    let alive = true;
    api<{ messages: ChatMessage[] }>(`/conversations/${cid}/messages`)
      .then((d) => { if (alive) setMessages(d.messages || []); })
      .catch(() => { });
    const s = getSocket();
    if (!s) return;
    setConnected(s.connected);
    const onConn = () => setConnected(true);
    const onDisc = () => setConnected(false);
    s.on("connect", onConn); s.on("disconnect", onDisc);

    s.emit("join", cid);
    s.emit("read", { conversationId: cid });

    const onMsg = (m: ChatMessage) => {
      if (m.conversation === cid) {
        setMessages((prev) => {
          const optIdx = prev.findIndex((msg) => msg.pending && msg.text === m.text && msg.sender === m.sender);
          if (optIdx > -1) {
            const next = [...prev];
            next[optIdx] = m;
            return next;
          }
          if (prev.some((msg) => msg._id === m._id)) return prev;
          return [...prev, m];
        });
        if (m.sender !== user?._id) {
          s.emit("read", { conversationId: cid });
        }
      }
    };
    const onTyping = ({ userId, isTyping }: any) => {
      if (userId !== user?._id) setTyping(isTyping);
    };
    const onRead = ({ conversationId, readerId }: any) => {
      if (conversationId === cid && readerId !== user?._id) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.sender === user?._id && !msg.readBy?.includes(readerId)) {
              return { ...msg, readBy: [...(msg.readBy || []), readerId] };
            }
            return msg;
          })
        );
      }
    };

    s.on("message", onMsg);
    s.on("typing", onTyping);
    s.on("read", onRead);

    return () => {
      alive = false;
      s.emit("leave", cid);
      s.off("message", onMsg);
      s.off("typing", onTyping);
      s.off("read", onRead);
      s.off("connect", onConn); s.off("disconnect", onDisc);
    };
  }, [cid, user?._id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !cid) return;
    const s = getSocket();
    if (!s) return;

    const userText = text.trim();
    const tempId = `opt-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      _id: tempId,
      conversation: cid,
      sender: user?._id || "",
      text: userText,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    s.emit("message", { conversationId: cid, text: userText });
    setText("");
    s.emit("typing", { conversationId: cid, isTyping: false });
  };

  const onType = (v: string) => {
    setText(v);
    const s = getSocket();
    if (!s || !cid) return;
    s.emit("typing", { conversationId: cid, isTyping: v.length > 0 });
  };

  const other = user?.role === "buyer" ? conversation?.agent : conversation?.buyer;
  const otherId = typeof other === "string" ? other : other?._id;
  const isRead = (m: ChatMessage) => {
    if (!otherId) return false;
    return m.readBy?.includes(otherId);
  };

  const container =
    variant === "floating"
      ? "fixed bottom-6 right-6 z-50 flex h-[560px] w-[380px] lg:h-[640px] lg:w-[420px] xl:h-[700px] xl:w-[460px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      : "flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card";

  return (
    <motion.div
      initial={variant === "floating" ? { opacity: 0, y: 20, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={container}
    >
      <header className="flex items-center justify-between border-b border-border bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {other?.avatar ? (
            <img
              src={other.avatar}
              alt=""
              className="h-9 w-9 rounded-full object-cover border border-primary/20 shrink-0"
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 font-display text-primary border border-primary/20 shrink-0">
              {other?.name?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold text-ink">{other?.name || "Chat"}</div>
            <div className="mono-cap flex items-center gap-1.5 text-muted-foreground">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
              {connected ? "Live" : "Connecting…"}
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="press rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X size={16} /></button>
        )}
      </header>

      {conversation?.property && (
        <div className="border-b border-border/70 bg-muted/30 px-4 py-2 text-xs">
          <span className="mono-cap text-muted-foreground">Re: </span>
          <span className="font-medium text-ink">{conversation.property.title}</span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><MessageCircle size={22} /></div>
            <p className="mt-3 text-sm text-muted-foreground">No messages yet — say hi and start the conversation.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.sender === user?._id;
            return (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                    m.pending ? "opacity-65" : ""
                  } ${
                    mine
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted text-ink"
                  }`}
                >
                  {m.text}
                  <div className={`mt-1 flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {mine && (
                      m.pending ? (
                        <span className="text-[9px] lowercase tracking-normal text-primary-foreground/50">sending…</span>
                      ) : (
                        <span className={`font-sans font-medium text-[10px] lowercase tracking-normal ${isRead(m) ? "text-cyan-400" : "text-primary-foreground/40"
                          }`}>
                          {isRead(m) ? "✓✓" : "✓"}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                    className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                ))}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ink"
        />
        <button type="submit" disabled={!text.trim()}
          className="press grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
          <Send size={16} />
        </button>
      </form>
    </motion.div>
  );
}

/** Floating "Chat with agent" button + panel, scoped to a property */
export function PropertyChatLauncher({ propertyId, agentId }: { propertyId: string; agentId?: string }) {
  const { user, isAuthed } = useAuth();
  const [open, setOpen] = useState(false);
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthed || user?.role !== "buyer" || (agentId && user?._id === agentId)) return null;

  const openChat = async () => {
    if (!authStore.token()) return;
    setLoading(true);
    try {
      const d = await api<{ conversation: Conversation }>("/conversations", {
        method: "POST", body: { property: propertyId },
      });
      setConvo(d.conversation);
      setOpen(true);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <>
      <button
        onClick={openChat}
        disabled={loading}
        className="press mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-ink bg-background py-2.5 text-sm font-medium text-ink hover:bg-ink hover:text-background transition"
      >
        <MessageCircle size={14} /> {loading ? "Opening…" : "Chat with agent"}
      </button>
      <AnimatePresence>
        {open && convo && (
          <ChatPanel
            variant="floating"
            conversationId={convo._id}
            conversation={convo}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
