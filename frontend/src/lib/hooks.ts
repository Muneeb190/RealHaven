import { useEffect, useState } from "react";
import { auth, type AuthUser } from "./api";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => auth.user());
  useEffect(() => {
    const sync = () => setUser(auth.user());
    window.addEventListener("RealHaven:auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("RealHaven:auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { user, isAuthed: !!user, signOut: () => auth.clear() };
}

const FAV_KEY = "nexreal_favorites";
export function useFavorites() {
  const [favs, setFavs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    const sync = () => {
      try { setFavs(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch { }
    };
    window.addEventListener("RealHaven:favs", sync);
    return () => window.removeEventListener("RealHaven:favs", sync);
  }, []);
  const toggle = (id: string) => {
    const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(next);
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("RealHaven:favs"));
  };
  return { favs, toggle, has: (id: string) => favs.includes(id) };
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export function useCountUp(target: number, duration = 800) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}
