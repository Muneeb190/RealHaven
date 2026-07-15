import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Bed, Bath, Ruler, MapPin, Eye, Phone, Mail, Heart, ChevronLeft, ChevronRight, X } from "lucide-react";
import { api, type Property } from "@/lib/api";
import { useAuth, useFavorites, useHydrated } from "@/lib/hooks";
import { PriceTag, StatusTag } from "@/components/property-card";
import { PropertyChatLauncher } from "@/components/chat-panel";

export const Route = createFileRoute("/properties/$id/")({
  loader: async ({ params }) => {
    try {
      const d = await api<{ property: Property }>(`/properties/${params.id}`);
      return { property: d.property, error: null };
    } catch (e: any) {
      return { property: null, error: e.message as string };
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData || !loaderData.property) {
      return {
        meta: [{ title: "Property Details | RealHaven" }],
      };
    }
    const p = loaderData.property;
    const desc = p.description ? p.description.slice(0, 150) + "..." : "Details of property listed on RealHaven.";
    return {
      meta: [
        { title: `${p.title} in ${p.location.city} | RealHaven` },
        { name: "description", content: desc },
        { property: "og:title", content: `${p.title} | RealHaven` },
        { property: "og:description", content: desc },
        { property: "og:image", content: p.images?.[0] || "" },
      ],
    };
  },
  component: Detail,
});

function Detail() {
  const loaderData = Route.useLoaderData();
  const { id } = Route.useParams();
  const { user, isAuthed } = useAuth();
  const [p, setP] = useState<Property | null>(loaderData?.property || null);
  const [err, setErr] = useState<string | null>(loaderData?.error || null);
  const [active, setActive] = useState(0);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const { has, toggle } = useFavorites();
  const hydrated = useHydrated();
  const faved = hydrated && p && has(p._id);

  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (loaderData?.property && loaderData.property._id === id) {
      setP(loaderData.property);
      setErr(loaderData.error);
    } else {
      api<{ property: Property }>(`/properties/${id}`)
        .then((d) => setP(d.property))
        .catch((e) => setErr(e.message));
    }
  }, [id, loaderData]);

  const images = p?.images?.length ? p.images : ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=70"];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActive((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };
  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActive((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (!zoomed) return;
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft") setActive((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      if (ev.key === "ArrowRight") setActive((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      if (ev.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomed, images.length]);

  if (err) return <div className="mx-auto max-w-3xl px-5 py-24 text-center"><p className="text-destructive">{err}</p></div>;
  if (!p) return <div className="mx-auto max-w-3xl px-5 py-24 text-center text-muted-foreground">Loading…</div>;

  const agent = typeof p.agent === "string" ? null : p.agent;

  const sendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthed) return toast.error("Log in as a buyer to contact the agent.");
    if (user?.role !== "buyer") return toast.error("Only buyer accounts can send inquiries.");
    if (msg.trim().length < 5) return toast.error("Add a short message first.");
    setSending(true);
    try {
      await api("/inquiries", { method: "POST", body: { property: p._id, message: msg.trim() } });
      toast.success("Inquiry sent — the agent will be in touch.");
      setMsg("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <Link to="/" className="mono-cap text-muted-foreground hover:text-ink">← Back to index</Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        {/* Gallery + info */}
        <div>
          <div 
            onClick={() => setZoomed(true)}
            className="group relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted cursor-zoom-in"
          >
            <StatusTag status={p.status} />
            <AnimatePresence mode="wait">
              <motion.img
                key={active}
                src={images[active]}
                alt={p.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.01]"
              />
            </AnimatePresence>
            
            {/* Carousel navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 press grid h-10 w-10 place-items-center rounded-full bg-background/80 hover:bg-background text-ink shadow backdrop-blur transition opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                  title="Previous photo"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 press grid h-10 w-10 place-items-center rounded-full bg-background/80 hover:bg-background text-ink shadow backdrop-blur transition opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                  title="Next photo"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {images.map((im, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  <img src={im} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-8">
            <div className="mono-cap text-muted-foreground">{p.type} · {p.location.city}</div>
            <div className="mt-2 flex items-start justify-between gap-4">
              <h1 className="font-display text-4xl font-semibold leading-tight text-ink md:text-5xl">{p.title}</h1>
              <button
                type="button"
                onClick={() => toggle(p._id)}
                className="press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-background shadow-sm hover:bg-muted"
                aria-label="Save"
              >
                <Heart size={20} className={faved ? "fill-terracotta text-terracotta" : "text-ink"} />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-muted-foreground">
              <MapPin size={14} /> {p.location.address}, {p.location.city}
            </div>

            <div className="mt-8 flex flex-wrap gap-6 border-y border-border py-6">
              {p.bedrooms != null && <Stat icon={<Bed size={16} />} label="Bedrooms" value={String(p.bedrooms)} />}
              {p.bathrooms != null && <Stat icon={<Bath size={16} />} label="Bathrooms" value={String(p.bathrooms)} />}
              {p.areaSqft != null && <Stat icon={<Ruler size={16} />} label="Area (sqft)" value={String(p.areaSqft)} />}
              <Stat icon={<Eye size={16} />} label="Views" value={String(p.views)} />
            </div>

            <div className="mt-8">
              <div className="eyebrow">About the property</div>
              <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-foreground/90">
                {p.description}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <PriceTag price={p.price} size="lg" />
            <div className="mono-cap mt-2 text-muted-foreground">
              {p.status === "for-rent" || p.status === "rented" ? "per month" : "listing price"}
            </div>

            <div className="mt-6 border-t border-border pt-6">
              {agent ? (
                <div>
                  <div className="eyebrow">Listed by</div>
                  <div className="mt-2 flex items-center gap-3">
                    {agent.avatar ? (
                      <img
                        src={agent.avatar}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover border border-primary/20 shrink-0"
                      />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 font-display text-lg text-primary border border-primary/20 shrink-0">
                        {agent.name?.[0] ?? "A"}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-ink">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">Agent</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    {agent.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail size={13} /> {agent.email}</div>}
                    {agent.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone size={13} /> {agent.phone}</div>}
                  </div>
                </div>
              ) : <div className="text-sm text-muted-foreground">Agent details unavailable.</div>}
            </div>

            <form onSubmit={sendInquiry} className="mt-6 border-t border-border pt-6">
              <label className="block">
                <span className="eyebrow">Your message</span>
                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={4}
                  placeholder={isAuthed ? "Hi — I'd love to see this in person…" : "Log in to message the agent"}
                  disabled={!isAuthed || user?.role !== "buyer"}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ink disabled:opacity-60"
                />
              </label>
              {!isAuthed ? (
                <Link to="/login" className="press mt-3 block rounded-full bg-ink py-2.5 text-center text-sm text-background">
                  Log in to contact
                </Link>
              ) : user?.role !== "buyer" ? (
                <div className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  Only buyer accounts can send inquiries.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={sending}
                  className="press mt-3 block w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send inquiry"}
                </button>
              )}
            </form>
            <PropertyChatLauncher propertyId={p._id} agentId={agent?._id} />
          </div>
        </aside>
      </div>

      {/* Fullscreen Lightbox Zoom Modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
            onClick={() => setZoomed(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setZoomed(false)}
              className="absolute right-6 top-6 press grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Close zoom"
            >
              <X size={22} />
            </button>

            {/* Lightbox Main Image Container */}
            <div className="relative flex flex-col items-center max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <img
                src={images[active]}
                alt=""
                className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
              />
              
              {/* Lightbox arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 md:-left-16 top-1/2 -translate-y-1/2 press grid h-12 w-12 place-items-center rounded-full bg-black/40 md:bg-white/10 hover:bg-black/60 md:hover:bg-white/20 text-white transition cursor-pointer backdrop-blur-sm md:backdrop-blur-none"
                    title="Previous photo"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 md:-right-16 top-1/2 -translate-y-1/2 press grid h-12 w-12 place-items-center rounded-full bg-black/40 md:bg-white/10 hover:bg-black/60 md:hover:bg-white/20 text-white transition cursor-pointer backdrop-blur-sm md:backdrop-blur-none"
                    title="Next photo"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              {/* Photo counter */}
              <div className="mt-3 text-center text-xs font-mono text-white/60">
                Photo {active + 1} of {images.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="mono-cap">{label}</span></div>
      <div className="mt-1 font-display text-2xl text-ink">{value}</div>
    </div>
  );
}
