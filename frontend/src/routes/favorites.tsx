import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Property } from "@/lib/api";
import { useAuth, useFavorites, useHydrated } from "@/lib/hooks";
import { PropertyCard } from "@/components/property-card";

export const Route = createFileRoute("/favorites")({
  component: Favorites,
});

function Favorites() {
  const { user, isAuthed } = useAuth();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const { favs } = useFavorites();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) { navigate({ to: "/login" }); return; }
    if (user?.role !== "buyer") { navigate({ to: "/" }); return; }

    api<{ properties: Property[] }>("/properties")
      .then((d) => {
        const all = d.properties || [];
        const liked = all.filter((p) => favs.includes(p._id));
        setItems(liked);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [hydrated, isAuthed, user, navigate, favs]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
      <div className="eyebrow">Your collection</div>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">Liked listings.</h1>

      {err && <p className="mt-6 text-destructive">{err}</p>}

      {loading ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="eyebrow">Empty</div>
          <p className="mt-2 font-display text-2xl text-ink">You haven't saved any listings yet.</p>
          <Link to="/properties" className="press mt-4 inline-block rounded-full bg-ink px-4 py-2 text-sm text-background">
            Browse the index
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <PropertyCard key={p._id} property={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
