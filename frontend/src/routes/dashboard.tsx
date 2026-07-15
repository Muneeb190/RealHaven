import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2, Eye, Sparkles, CreditCard, Loader2, CheckCircle2, X } from "lucide-react";
import { api, formatPrice, type Inquiry, type Property } from "@/lib/api";
import { useAuth, useHydrated } from "@/lib/hooks";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, isAuthed } = useAuth();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"listings" | "inquiries">("listings");
  const [listings, setListings] = useState<Property[]>([]);
  const [inqs, setInqs] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingProperty, setPromotingProperty] = useState<Property | null>(null);
  const [payState, setPayState] = useState<"idle" | "processing" | "success">("idle");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  useEffect(() => {
    if (promotingProperty) {
      setPayState("idle");
      setCardName(user?.name || "");
      setCardNumber("4111 2222 3333 4444");
      setCardExpiry("12/28");
      setCardCvv("123");
    }
  }, [promotingProperty, user]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingProperty) return;
    setPayState("processing");

    try {
      await api(`/properties/${promotingProperty._id}/feature`, { method: "PUT" });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setListings((prev) =>
        prev.map((p) => (p._id === promotingProperty._id ? { ...p, featured: true } : p))
      );
      setPayState("success");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setPromotingProperty(null);
      toast.success("Listing promoted successfully!");
    } catch (err: any) {
      setPayState("idle");
      toast.error(err.message || "Failed to promote listing.");
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) { navigate({ to: "/login" }); return; }
    if (user?.role !== "agent") { navigate({ to: "/" }); return; }
    (async () => {
      try {
        const [a, b] = await Promise.all([
          api<{ properties: Property[] }>("/properties/mine"),
          api<{ inquiries: Inquiry[] }>("/inquiries/received"),
        ]);
        setListings(a.properties || []);
        setInqs(b.inquiries || []);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [hydrated, isAuthed, user, navigate]);

  const del = (id: string) => {
    toast.warning("Delete this listing? This action is permanent.", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await api(`/properties/${id}`, { method: "DELETE" });
            setListings((l) => l.filter((p) => p._id !== id));
            toast.success("Listing removed.");
          } catch (e: any) { toast.error(e.message); }
        }
      }
    });
  };

  const updateInquiryStatus = async (id: string, status: "pending" | "responded" | "closed") => {
    try {
      await api(`/inquiries/${id}`, { method: "PATCH", body: { status } });
      setInqs((prev) =>
        prev.map((i) => (i._id === id ? { ...i, status } : i))
      );
      toast.success("Inquiry status updated.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteInquiry = (id: string) => {
    toast.warning("Delete this inquiry?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await api(`/inquiries/${id}`, { method: "DELETE" });
            setInqs((prev) => prev.filter((i) => i._id !== id));
            toast.success("Inquiry deleted.");
          } catch (e: any) { toast.error(e.message); }
        }
      }
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Agent workspace</div>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">Your desk.</h1>
        </div>
        <Link to="/post-property" className="press inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          <Plus size={16} /> Post a property
        </Link>
      </div>

      <div className="relative mt-10 flex gap-8 border-b border-border">
        {(["listings", "inquiries"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative pb-3 text-sm font-medium capitalize transition ${tab === t ? "text-ink" : "text-muted-foreground hover:text-ink"}`}>
            {t} {t === "listings" ? `(${listings.length})` : `(${inqs.length})`}
            {tab === t && (
              <motion.span layoutId="tabline" className="absolute -bottom-px left-0 h-0.5 w-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
            )}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-10 text-muted-foreground">Loading…</p> : (
        <div className="mt-8">
          {tab === "listings" ? (
            listings.length === 0 ? (
              <Empty label="No listings yet." cta={{ to: "/post-property", label: "Post your first" }} />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr className="text-left">
                      <Th>Title</Th><Th>Price</Th><Th>Status</Th><Th>Views</Th><Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((p) => (
                      <tr key={p._id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3">
                          <Link to="/properties/$id" params={{ id: p._id }} className="nav-link font-medium text-ink mb-2">{p.title}</Link>
                          <div className="text-xs text-muted-foreground">{p.location.city}</div>
                        </td>
                        <td className="px-4 py-3 font-display text-lg text-ink">{formatPrice(p.price)}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground"><span className="inline-flex items-center gap-1"><Eye size={12} /> {p.views}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {p.featured ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-700 font-medium shrink-0">
                                ★ Featured
                              </span>
                            ) : (
                              <button
                                onClick={() => setPromotingProperty(p)}
                                className="press inline-flex items-center gap-1 rounded-full border border-amber-500 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-500 hover:text-white font-medium shrink-0 cursor-pointer"
                              >
                                <Sparkles size={11} /> Promote
                              </button>
                            )}
                            <Link to="/properties/$id/edit" params={{ id: p._id }} className="press inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-ink hover:bg-muted">
                              Edit
                            </Link>
                            <button onClick={() => del(p._id)} className="press inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5 cursor-pointer">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            inqs.length === 0 ? <Empty label="No inquiries yet." /> : (
              <div className="grid gap-4 md:grid-cols-2">
                {inqs.map((i) => (
                  <div key={i._id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="eyebrow">Regarding</div>
                        <Link to="/properties/$id" params={{ id: i.property?._id }} className="mt-1 font-display text-lg text-ink hover:underline">
                          {i.property?.title || "—"}
                        </Link>
                      </div>
                      <StatusBadge status={i.status} />
                    </div>
                    <p className="mt-4 text-sm text-foreground/90">"{i.message}"</p>
                    <div className="mt-4 border-t border-border pt-3 text-xs flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-ink">{i.buyer?.name}</div>
                        <div className="text-muted-foreground">{i.buyer?.email}{i.buyer?.phone ? ` · ${i.buyer.phone}` : ""}</div>
                        <div className="mt-2 mono-cap text-muted-foreground">{new Date(i.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-2 min-h-[64px]">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
                          <select
                            value={i.status}
                            onChange={(e) => updateInquiryStatus(i._id, e.target.value as any)}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-ink"
                          >
                            <option value="pending">Pending</option>
                            <option value="responded">Responded</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                        <button
                          onClick={() => deleteInquiry(i._id)}
                          className="press text-xs text-destructive hover:underline flex items-center gap-1 mt-1"
                          title="Delete inquiry"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {promotingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setPromotingProperty(null)}
              className="press absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X size={18} />
            </button>

            {payState === "idle" && (
              <form onSubmit={handlePay} className="space-y-5">
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500/10 text-amber-600">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">Feature Listing</h3>
                    <p className="text-xs text-muted-foreground">Promote your property to the top of the homepage</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-muted/40 p-4 border border-border/40">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Property Details</div>
                  <div className="mt-1.5 font-medium text-ink truncate">{promotingProperty.title}</div>
                  <div className="text-xs text-muted-foreground">{promotingProperty.location.city} · {formatPrice(promotingProperty.price)}</div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Premium Placement Package</div>
                  <label className="flex items-center justify-between rounded-xl border border-primary bg-primary/5 p-4 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input type="radio" defaultChecked className="accent-primary" />
                      <div>
                        <div className="font-medium text-ink">Gold Spotlight (30 Days)</div>
                        <div className="text-xs text-muted-foreground">Sorts to top, includes Gold Featured Badge</div>
                      </div>
                    </div>
                    <div className="font-display text-lg font-semibold text-ink">$49.00</div>
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Details</div>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Cardholder Name</span>
                    <input
                      type="text"
                      required
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ink"
                      placeholder="e.g. John Doe"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Card Number</span>
                    <div className="relative">
                      <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-ink"
                        placeholder="4111 2222 3333 4444"
                      />
                    </div>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs text-muted-foreground">Expiration Date</span>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ink"
                        placeholder="MM/YY"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-muted-foreground">CVV</span>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ink"
                        placeholder="123"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="press w-full rounded-full bg-ink py-3 text-sm font-medium text-background hover:bg-ink/90 mt-2 flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} /> Pay $49.00 & Feature Listing
                </button>
              </form>
            )}

            {payState === "processing" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 size={40} className="text-primary animate-spin" />
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">Processing Payment</h3>
                <p className="mt-1 text-xs text-muted-foreground">Encrypting payment details and verifying with bank…</p>
              </div>
            )}

            {payState === "success" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="text-emerald-500"
                >
                  <CheckCircle2 size={48} className="fill-emerald-50 text-emerald-500" />
                </motion.div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">Payment Successful!</h3>
                <p className="mt-1 text-xs text-muted-foreground">"{promotingProperty.title}" is now featured on the homepage.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</th>;
}
function Empty({ label, cta }: { label: string; cta?: { to: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="eyebrow">Nothing yet</div>
      <p className="mt-2 font-display text-2xl text-ink">{label}</p>
      {cta && <Link to={cta.to as any} className="press mt-4 inline-block rounded-full bg-ink px-4 py-2 text-sm text-background">{cta.label}</Link>}
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const style = status === "for-sale" || status === "for-rent" || status === "pending"
    ? "bg-primary/10 text-primary"
    : status === "responded" ? "bg-accent/10 text-accent"
      : "bg-muted text-muted-foreground";
  return <span className={`mono-cap rounded-full px-2.5 py-1 ${style}`}>{status.replace("-", " ")}</span>;
}
