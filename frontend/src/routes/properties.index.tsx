import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Property } from "@/lib/api";
import { PropertyCard } from "@/components/property-card";

export const Route = createFileRoute("/properties/")({
  component: All,
});

function All() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<{ properties: Property[] }>("/properties")
      .then((d) => setItems(d.properties || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <div className="eyebrow">All listings</div>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">The full index</h1>
      {err && <p className="mt-6 text-destructive">{err}</p>}
      {loading ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => <PropertyCard key={p._id} property={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
