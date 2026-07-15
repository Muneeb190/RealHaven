import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { api, auth, type AuthUser } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const d = await api<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST", body: { email, password },
      });
      auth.set(d.token, d.user);
      toast.success(`Welcome back, ${d.user.name.split(" ")[0]}.`);
      navigate({ to: d.user.role === "agent" ? "/dashboard" : "/" });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Editorial side */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="blob blob-accent absolute -left-16 top-1/3 h-[420px] w-[420px] opacity-40" />
        <div className="blob blob-primary absolute right-10 bottom-10 h-[300px] w-[300px] opacity-30" />
        <img
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-background">
          <Link to="/" className="font-display text-2xl">
            Nex<span className="italic text-accent">Real</span>
          </Link>
          <div>
            <div className="mono-cap text-background/60">Chapter 01 · Return</div>
            <h2 className="mt-4 font-display text-5xl leading-[1.05] italic">
              Welcome back.
            </h2>
            <p className="mt-4 max-w-md text-background/70">
              The index has been quiet without you. There are new places worth walking through.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-16 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="eyebrow">Welcome back</div>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">Log in.</h1>
          <p className="mt-2 text-muted-foreground">Pick up where you left off.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></Field>
            <Field label="Password"><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></Field>
            <button disabled={loading} type="submit" className="press w-full rounded-full bg-ink py-3 text-sm font-medium text-background disabled:opacity-60">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            New here? <Link to="/signup" className="nav-link text-ink">Create an account</Link>
          </p>
        </motion.div>
      </div>
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:10px;padding:10px 14px;font-size:14px;outline:none;transition:border-color 150ms}.input:focus{border-color:var(--ink)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
