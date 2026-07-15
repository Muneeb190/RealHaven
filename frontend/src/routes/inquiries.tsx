import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api, type Inquiry } from "@/lib/api";
import { useAuth, useHydrated } from "@/lib/hooks";

export const Route = createFileRoute("/inquiries")({
  component: MyInquiries,
});

function MyInquiries() {
  const { user, isAuthed } = useAuth();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const deleteInquiry = (id: string) => {
    toast.warning("Delete this inquiry?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await api(`/inquiries/${id}`, { method: "DELETE" });
            setItems((prev) => prev.filter((i) => i._id !== id));
            toast.success("Inquiry deleted.");
          } catch (e: any) {
            toast.error(e.message);
          }
        }
      }
    });
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) { navigate({ to: "/login" }); return; }
    if (user?.role !== "buyer") { navigate({ to: "/" }); return; }
    api<{ inquiries: Inquiry[] }>("/inquiries/mine")
      .then((d) => setItems(d.inquiries || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [hydrated, isAuthed, user, navigate]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 md:px-8">
      <div className="eyebrow">Your outbox</div>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">Inquiries you've sent.</h1>

      {loading ? <p className="mt-10 text-muted-foreground">Loading…</p> :
        items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="eyebrow">Empty</div>
            <p className="mt-2 font-display text-2xl text-ink">You haven't reached out yet.</p>
            <Link to="/" className="press mt-4 inline-block rounded-full bg-ink px-4 py-2 text-sm text-background">Browse listings</Link>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            {items.map((i) => (
              <div key={i._id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                <Link to="/properties/$id" params={{ id: i.property?._id }} className="block h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <img src={i.property?.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=400&q=60"} alt="" className="h-full w-full object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link to="/properties/$id" params={{ id: i.property?._id }} className="nav-link font-display text-lg text-ink">
                      {i.property?.title || "Listing removed"}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`mono-cap rounded-full px-2 py-1 ${
                        i.status === "pending" ? "bg-muted text-muted-foreground" :
                        i.status === "responded" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                      }`}>{i.status}</span>
                      <button
                        onClick={() => deleteInquiry(i._id)}
                        className="press rounded-full p-1.5 text-muted-foreground/60 hover:text-destructive hover:bg-muted transition"
                        title="Delete inquiry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/85">"{i.message}"</p>
                  <div className="mono-cap mt-2 text-muted-foreground">Sent {new Date(i.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
