import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatPrice, type Conversation, type ChatMessage } from "@/lib/api";
import { useAuth, useHydrated } from "@/lib/hooks";
import { ChatPanel } from "@/components/chat-panel";
import { getSocket } from "@/lib/socket";

export const Route = createFileRoute("/messages")({
  component: Messages,
});

function Messages() {
  const { user, isAuthed } = useAuth();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) { navigate({ to: "/login" }); return; }
    api<{ conversations: Conversation[] }>("/conversations")
      .then((d) => {
        setConvos(d.conversations || []);
      })
      .finally(() => setLoading(false));
  }, [hydrated, isAuthed, navigate]);

  // Listen to live message events to update the thread list items in real-time
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onMsg = (m: ChatMessage) => {
      setConvos((prev) => {
        return prev
          .map((c) => {
            if (c._id === m.conversation) {
              const isCurrent = c._id === activeId;
              return {
                ...c,
                lastMessage: m.text.slice(0, 140),
                lastMessageAt: m.createdAt,
                unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + 1,
              };
            }
            return c;
          })
          .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
      });
    };
    s.on("message", onMsg);
    return () => {
      s.off("message", onMsg);
    };
  }, [activeId]);

  const selectConvo = (id: string) => {
    setActiveId(id);
    setConvos((prev) =>
      prev.map((c) => (c._id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const deleteConvo = (id: string) => {
    toast.warning("Delete this conversation and all messages?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await api(`/conversations/${id}`, { method: "DELETE" });
            setConvos((prev) => {
              const next = prev.filter((c) => c._id !== id);
              if (activeId === id) {
                setActiveId(next[0]?._id || null);
              }
              return next;
            });
            toast.success("Conversation deleted.");
          } catch (e: any) {
            toast.error(e.message);
          }
        }
      }
    });
  };

  const active = convos.find((c) => c._id === activeId);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <div className="eyebrow">Direct messages</div>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">
        Conversations.
      </h1>
      <p className="mt-2 text-muted-foreground">
        Chat live with {user?.role === "buyer" ? "agents about listings you love" : "buyers interested in your listings"}.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr]">
        {/* Thread list */}
        <aside className="lg:h-[78vh] xl:h-[82vh] lg:overflow-y-auto">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : convos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                <MessageCircle size={22} />
              </div>
              <p className="mt-3 font-display text-xl text-ink">No conversations yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.role === "buyer" ? "Open a listing and tap 'Chat with agent'." : "Buyers will show up here when they reach out."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {convos.map((c, i) => {
                const other = user?.role === "buyer" ? c.agent : c.buyer;
                const isActive = c._id === activeId;
                return (
                  <motion.li
                    key={c._id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <button
                      onClick={() => selectConvo(c._id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-ink bg-card shadow-[var(--shadow-card)]"
                          : "border-border bg-card/60 hover:border-ink/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {other?.avatar ? (
                            <img
                              src={other.avatar}
                              alt=""
                              className="h-11 w-11 rounded-full object-cover border border-primary/20 shrink-0"
                            />
                          ) : (
                            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 font-display text-primary border border-primary/20 shrink-0">
                              {other?.name?.[0] ?? "?"}
                            </div>
                          )}
                          {c.unreadCount ? (
                            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground border-2 border-background">
                              {c.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="truncate font-medium text-ink">{other?.name}</div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {c.lastMessageAt && (
                                <span className="mono-cap text-muted-foreground">
                                  {new Date(c.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConvo(c._id);
                                }}
                                className="press rounded-full p-1 text-muted-foreground/60 hover:text-destructive hover:bg-muted transition"
                                title="Delete chat"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {c.property?.title} · {formatPrice(c.property?.price)}
                          </div>
                          {c.lastMessage && (
                            <div className="mt-1.5 line-clamp-1 text-sm text-foreground/80">{c.lastMessage}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Active panel */}
        <div className="min-h-[70vh] lg:min-h-[78vh] xl:min-h-[82vh]">
          {active ? (
            <div className="h-[70vh] lg:h-[78vh] xl:h-[82vh]">
              <ChatPanel key={active._id} conversationId={active._id} conversation={active} />
            </div>
          ) : (
            <div className="grid h-[70vh] place-items-center rounded-2xl border border-dashed border-border">
              <div className="text-center">
                <MessageCircle className="mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Pick a conversation to start chatting.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
