import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, MapPin, Bed, Bath, Ruler } from "lucide-react";
import { formatPrice, type Property } from "@/lib/api";
import { useFavorites, useHydrated } from "@/lib/hooks";

export function PriceTag({ price, size = "md" }: { price: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-5xl md:text-6xl" : size === "sm" ? "text-2xl" : "text-3xl";
  return (
    <div>
      <div className="mono-cap text-muted-foreground">Asking Price</div>
      <div className={`font-display font-semibold tracking-tight text-ink ${cls}`}>
        {formatPrice(price)}
      </div>
    </div>
  );
}

export function StatusTag({ status }: { status: Property["status"] }) {
  const label =
    status === "for-sale" ? "For Sale" :
    status === "for-rent" ? "For Rent" :
    status === "sold" ? "Sold" : "Rented";

  let bgClass = "bg-primary text-primary-foreground";
  if (status === "for-sale") {
    bgClass = "bg-[#2d5a27] text-white";
  } else if (status === "for-rent") {
    bgClass = "bg-[#1e40af] text-white";
  } else if (status === "sold") {
    bgClass = "bg-[#7f1d1d] text-white";
  } else if (status === "rented") {
    bgClass = "bg-[#b45309] text-white";
  }

  return <span className={`for-sale-tag ${bgClass}`}>{label}</span>;
}

export function FeaturedTag() {
  return (
    <span className="absolute top-[48px] left-[-6px] rotate-[-3deg] bg-gradient-to-r from-amber-500 to-amber-600 text-white font-mono text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded shadow z-10 border border-amber-600/30">
      ★ Featured
    </span>
  );
}

export function PropertyCard({ property, index = 0 }: { property: Property; index?: number }) {
  const { has, toggle } = useFavorites();
  const hydrated = useHydrated();
  const faved = hydrated && has(property._id);
  const img = property.images?.[0] || `https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=60`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to="/properties/$id"
        params={{ id: property._id }}
        className={`card-hover-rich group block overflow-hidden rounded-2xl bg-card border transition ${
          property.featured
            ? "border-amber-500/30 ring-1 ring-amber-500/10 shadow-[0_10px_35px_-12px_rgba(245,158,11,0.15)] bg-amber-50/[0.02]"
            : "border-transparent"
        }`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <StatusTag status={property.status} />
          {property.featured && <FeaturedTag />}
          <img
            src={img}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); toggle(property._id); }}
            className="press absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur"
            aria-label="Save"
          >
            <motion.span
              key={faved ? "on" : "off"}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 14 }}
            >
              <Heart size={16} className={faved ? "fill-terracotta text-terracotta" : "text-ink"} />
            </motion.span>
          </button>
          <div className="absolute bottom-3 left-3 z-10 translate-y-2 rounded-full bg-background/95 px-3 py-1.5 opacity-0 shadow-lg backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="mono-cap text-ink">View listing →</span>
          </div>
        </div>
        <div className="p-5">
          <div className="mono-cap text-muted-foreground">{property.type}</div>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-ink">
            {property.title}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin size={13} /> {property.location.city}
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <PriceTag price={property.price} size="sm" />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {property.bedrooms != null && (
                <span className="flex items-center gap-1"><Bed size={12} /> {property.bedrooms}</span>
              )}
              {property.bathrooms != null && (
                <span className="flex items-center gap-1"><Bath size={12} /> {property.bathrooms}</span>
              )}
              {property.areaSqft != null && (
                <span className="flex items-center gap-1"><Ruler size={12} /> {property.areaSqft}</span>
              )}
            </div>
          </div>
          <div className="card-reveal mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            {property.description?.slice(0, 110)}{property.description && property.description.length > 110 ? "…" : ""}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
