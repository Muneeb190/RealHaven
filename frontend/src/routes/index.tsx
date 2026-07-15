import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowUpRight, Sparkles, ShieldCheck, Home as HomeIcon } from "lucide-react";
import { api, type Property } from "@/lib/api";
import { useCountUp } from "@/lib/hooks";
import { PropertyCard } from "@/components/property-card";
import { AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/")({
  component: Home,
});

const featuredCities = [
  "Ojai", "Brooklyn", "Kyoto", "Lisbon", "Marfa", "Copenhagen",
  "Marrakech", "Portland", "Mexico City", "Reykjavík", "Charleston", "Kerala",
];

const testimonials = [
  {
    quote: "RealHaven completely changed how I look for places. No duplicate listings, no generic realtor scripts—just real descriptions and direct chat with the agent.",
    author: "Elena Rostova",
    role: "Buyer in Brooklyn",
    initials: "ER",
  },
  {
    quote: "As an agent, listing here is a breath of fresh air. I don't compete with robots or paid ads. I write honest descriptions and connect instantly with qualified buyers.",
    author: "Marcus Vance",
    role: "Boutique Agent, Ojai",
    initials: "MV",
  },
  {
    quote: "The live chat feature feels like absolute magic. I was able to arrange a walkthrough with Sarah within two minutes of finding the listing. Highly recommended!",
    author: "Junji Tanaka",
    role: "Buyer in Kyoto",
    initials: "JT",
  }
];

function Home() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (city) p.set("city", city);
    if (type) p.set("type", type);
    if (status) p.set("status", status);
    if (min) p.set("min", min);
    if (max) p.set("max", max);
    return p.toString();
  }, [q, city, type, status, min, max]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setErr(null);
    api<{ properties: Property[] }>(`/properties?${params}`)
      .then((d) => { if (live) setItems(d.properties || []); })
      .catch((e) => { if (live) setErr(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [params]);

  const count = useCountUp(items.length);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden pt-14 md:pt-20">
        {/* Animated blobs */}
        <div className="blob blob-primary h-[380px] w-[380px] -left-24 -top-16 md:h-[520px] md:w-[520px]" />
        <div className="blob blob-accent h-[300px] w-[300px] right-[-6rem] top-24 md:h-[420px] md:w-[420px]" />
        <div className="blob blob-cream h-[320px] w-[320px] left-1/3 top-64 md:h-[460px] md:w-[460px]" />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 backdrop-blur">
                <Sparkles size={12} className="text-primary" />
                <span className="mono-cap text-muted-foreground">A small, honest index</span>
              </div>
              <h1 className="mt-6 font-display text-[3.25rem] font-semibold leading-[0.98] tracking-tight text-ink md:text-[5.5rem] lg:text-[6.25rem] editorial-serif-shadow">
                Find a place that{" "}
                <motion.span
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35, duration: 0.7 }}
                  className="italic text-primary"
                >actually</motion.span>{" "}
                feels like<br className="hidden sm:block" /> yours.
              </h1>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
              >
                Every listing on RealHaven is posted directly by an agent — not scraped, not reposted, not reheated. Browse fewer, better places.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Link to="/properties" className="press inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-background">
                  Browse the index <ArrowUpRight size={14} />
                </Link>
                <Link to="/signup" className="press inline-flex items-center gap-2 rounded-full border border-ink/20 bg-background/70 px-6 py-3 text-sm font-medium text-ink backdrop-blur hover:border-ink">
                  Post a listing
                </Link>
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
                className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border/60 pt-6"
              >
                <Stat n="1,240" label="Real listings" />
                <Stat n="320" label="Verified agents" />
                <Stat n="18" label="Cities" />
              </motion.div>
            </motion.div>

            {/* Featured card stack */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto hidden max-w-md lg:block"
            >
              <div className="absolute -right-6 -top-6 h-full w-full rotate-[6deg] rounded-3xl bg-primary/15" />
              <div className="absolute -left-4 top-6 h-full w-full -rotate-[4deg] rounded-3xl bg-accent/20" />
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(30,25,20,0.35)] grain-overlay">
                <div className="relative aspect-[4/5]">
                  <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80"
                    alt="Featured home"
                    className="h-full w-full object-cover"
                  />
                  <span className="for-sale-tag">For Sale</span>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent p-6 text-background">
                    <div className="mono-cap text-background/70">Editor's pick · Ojai</div>
                    <div className="mt-1 font-display text-2xl">A quiet home at golden hour</div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <div className="mono-cap text-background/60">Asking</div>
                        <div className="font-display text-3xl">$1.2M</div>
                      </div>
                      <div className="rounded-full border border-background/30 px-3 py-1 text-xs">4 bed · 3 bath</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mx-auto mt-14 max-w-6xl px-5 md:mt-20 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="rounded-2xl border border-border bg-card/95 p-4 shadow-[0_30px_80px_-40px_rgba(30,25,20,0.35)] backdrop-blur md:p-5"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <label className="relative md:col-span-2">
                <span className="eyebrow">Search</span>
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sunlit loft, garden, atelier…"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-ink" />
                </div>
              </label>
              <label>
                <span className="eyebrow">City</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Any"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ink" />
              </label>
              <label>
                <span className="eyebrow">Type</span>
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ink">
                  <option value="">Any</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="plot">Plot</option>
                  <option value="commercial">Commercial</option>
                </select>
              </label>
              <label>
                <span className="eyebrow">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ink">
                  <option value="">Buy or Rent</option>
                  <option value="for-sale">For Sale</option>
                  <option value="for-rent">For Rent</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="eyebrow">Min $</span>
                  <input value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" placeholder="0"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ink" />
                </label>
                <label>
                  <span className="eyebrow">Max $</span>
                  <input value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" placeholder="—"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ink" />
                </label>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Cities marquee */}
      <section className="marquee mt-14 overflow-hidden border-y border-border/60 bg-secondary/50 py-4">
        <div className="marquee-track gap-10 whitespace-nowrap">
          {[...featuredCities, ...featuredCities].map((c, i) => (
            <div key={i} className="flex items-center gap-10">
              <span className="font-display text-2xl italic text-ink md:text-3xl">{c}</span>
              <span className="text-2xl text-muted-foreground">✦</span>
            </div>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section className="mx-auto mt-16 max-w-7xl px-5 md:px-8">
        <div className="flex items-end justify-between border-b border-border pb-4">
          <div>
            <div className="eyebrow">The index</div>
            <h2 className="mt-1 font-display text-3xl font-semibold text-ink md:text-4xl">
              {loading ? "Loading…" : <><span>{count}</span> {count === 1 ? "listing" : "listings"}</>}
            </h2>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            Sorted by <span className="italic">featured & recent</span>
          </div>
        </div>

        {err && (
          <div className="mt-10 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
            <div className="eyebrow text-destructive">Couldn't load</div>
            <p className="mt-2 text-destructive">{err}</p>
            <p className="mt-2 text-muted-foreground">
              Make sure the API is running (see <code>server/</code>) and <code>VITE_API_URL</code> points to it.
            </p>
          </div>
        )}

        {!err && !loading && items.length === 0 && (
          <div className="mt-16 text-center">
            <div className="eyebrow">Nothing yet</div>
            <h3 className="mt-3 font-display text-2xl text-ink">No listings match those filters.</h3>
            <p className="mt-2 text-muted-foreground">Try widening the price range or clearing the city.</p>
            <button
              onClick={() => { setQ(""); setCity(""); setType(""); setStatus(""); setMin(""); setMax(""); }}
              className="press mt-5 rounded-full border border-border px-5 py-2 text-sm"
            >Clear all filters</button>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-8">
          {items.map((p, i) => <PropertyCard key={p._id} property={p} index={i} />)}
        </div>
      </section>

      {/* Trust row */}
      <section className="mx-auto mt-24 max-w-7xl px-5 md:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature icon={<ShieldCheck size={20} />} title="Posted by real agents"
            body="No scraped listings, no bait-and-switch photos. Every home you see, someone has stood in." />
          <Feature icon={<HomeIcon size={20} />} title="Written like a letter"
            body="Descriptions that read like a friend telling you about a place — not a spreadsheet." />
          <Feature icon={<Sparkles size={20} />} title="Chat that's actually live"
            body="Open a listing, tap chat, negotiate in real-time with the agent — no phone tag, no forms." />
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto mt-24 max-w-7xl px-5 md:px-8">
        <div className="text-center">
          <div className="eyebrow">Testimonials</div>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink md:text-4xl">
            Trusted by buyers and boutique agents.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="card-hover-rich flex flex-col justify-between rounded-2xl border border-border bg-card p-8"
            >
              <blockquote className="text-base italic leading-relaxed text-ink/90">
                "{t.quote}"
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-display font-medium text-primary">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">{t.author}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Manifesto */}
      <section className="mx-auto mt-24 max-w-7xl px-5 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-20 text-background md:px-20 md:py-28">
          <div className="blob blob-accent absolute -right-32 -top-32 h-[400px] w-[400px] opacity-30" />
          <div className="relative max-w-3xl">
            <div className="mono-cap text-background/60">A short manifesto</div>
            <h2 className="mt-3 font-display text-4xl font-medium leading-[1.05] md:text-6xl">
              We think a home listing should read like a <span className="italic text-accent">letter</span>, not a spreadsheet.
            </h2>
            <p className="mt-6 max-w-xl text-lg text-background/70">
              So we made it easy for agents to post the things that matter and hard to post the things that don't. What you see is what someone stood in.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/signup" className="press rounded-full bg-background px-6 py-3 text-sm font-medium text-ink">Post a listing</Link>
              <button
                onClick={() => navigate({ to: "/properties" })}
                className="press rounded-full border border-background/30 px-6 py-3 text-sm"
              >Browse the index</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold text-ink md:text-4xl">{n}</div>
      <div className="mono-cap mt-1 text-muted-foreground">{label}</div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6 }}
      className="card-hover-rich rounded-2xl border border-border bg-card p-7"
    >
      <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-5 font-display text-xl text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </motion.div>
  );
}
