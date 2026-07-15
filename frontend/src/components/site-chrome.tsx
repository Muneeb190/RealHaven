import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { api, type Conversation } from "@/lib/api";
import { useAuth } from "@/lib/hooks";
import { motion, AnimatePresence } from "framer-motion";

export function SiteNav() {
  const { user, isAuthed, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    if (!isAuthed) return;
    api<{ conversations: Conversation[] }>("/conversations")
      .then((d) => {
        const total = d.conversations?.reduce((acc, c) => acc + (c.unreadCount || 0), 0) || 0;
        setUnreadTotal(total);
      })
      .catch(() => { });
  }, [isAuthed, path]);

  const links = [
    { to: "/", label: "Home" },
    { to: "/properties", label: "Listings" },
    ...(isAuthed && user?.role === "agent"
      ? [{ to: "/dashboard", label: "Dashboard" }]
      : []),
    ...(isAuthed && user?.role === "buyer"
      ? [
        { to: "/favorites", label: "Liked Listings" },
        { to: "/inquiries", label: "My Inquiries" }
      ]
      : []),
    ...(isAuthed ? [{ to: "/messages", label: "Messages" }] : []),
  ];

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            Nex<span className="italic text-primary">Real</span>
          </span>
          <span className="mono-cap hidden sm:inline text-muted-foreground">Est. Today</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="nav-link text-sm font-medium text-ink flex items-center gap-1.5"
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
              {l.to === "/messages" && unreadTotal > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                  {unreadTotal}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {isAuthed ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 group">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover border border-primary/20 transition group-hover:border-primary shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-semibold text-primary border border-primary/20 transition group-hover:border-primary shrink-0">
                    {user?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="mono-cap font-semibold text-ink group-hover:text-primary transition">Hi, {user?.name.split(" ")[0]}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="press rounded-full border border-border px-4 py-2 text-sm hover:bg-muted font-medium text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="press text-sm font-medium hover:text-primary">
                Log in
              </Link>
              <Link
                to="/signup"
                className="press rounded-full bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          className="press rounded-full border border-border p-2 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {isAuthed && (
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="mb-3 flex items-center gap-3 rounded-2xl bg-muted/40 p-3 border border-border/30 hover:border-primary/30 transition group"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover shrink-0 border border-primary/20"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary border border-primary/20">
                      {user?.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-display text-sm font-semibold text-ink leading-tight group-hover:text-primary transition">{user?.name}</div>
                    <div className="text-[10px] eyebrow mt-0.5">{user?.role}</div>
                  </div>
                </Link>
              )}
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted flex items-center justify-between"
                >
                  <span>{l.label}</span>
                  {l.to === "/messages" && unreadTotal > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                      {unreadTotal}
                    </span>
                  )}
                </Link>
              ))}
              <div className="mt-2 flex gap-2 border-t border-border pt-3">
                {isAuthed ? (
                  <button
                    onClick={() => { handleSignOut(); setOpen(false); }}
                    className="press flex-1 rounded-full border border-border px-4 py-2 text-sm"
                  >
                    Sign out
                  </button>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)} className="press flex-1 rounded-full border border-border px-4 py-2 text-center text-sm">Log in</Link>
                    <Link to="/signup" onClick={() => setOpen(false)} className="press flex-1 rounded-full bg-ink px-4 py-2 text-center text-sm text-background">Get started</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">{path}</span>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3 md:px-8">
        <div>
          <div className="font-display text-2xl font-semibold text-ink">
            Nex<span className="italic text-primary">Real</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Every listing here is posted directly by an agent — not scraped, not reposted. Find a place that actually feels like yours.
          </p>
        </div>
        <div>
          <div className="eyebrow">Explore</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/properties" className="nav-link">All listings</Link></li>
            <li><Link to="/signup" className="nav-link">Become an agent</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow">Contact</div>
          <p className="mt-3 text-sm text-muted-foreground">hello@RealHaven.co<br />Mon — Fri, 9 to 6</p>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-muted-foreground md:px-8">
          © {new Date().getFullYear()} RealHaven — A small, human real estate index.
        </div>
      </div>
    </footer>
  );
}
