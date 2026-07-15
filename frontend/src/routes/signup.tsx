import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Home, Briefcase, Check } from "lucide-react";
import { api, auth, type AuthUser, type Role } from "@/lib/api";
import { compressImage } from "@/lib/image";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const [role, setRole] = useState<Role>("buyer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("email", email.trim());
      fd.append("phone", phone.trim());
      fd.append("password", password);
      fd.append("role", role);
      if (avatar) {
        const compressedAvatar = await compressImage(avatar);
        fd.append("avatar", compressedAvatar);
      }

      const d = await api<{ token: string; user: AuthUser }>("/auth/signup", {
        method: "POST", form: fd,
      });
      auth.set(d.token, d.user);
      toast.success("Account created — welcome to RealHaven.");
      navigate({ to: d.user.role === "agent" ? "/dashboard" : "/" });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="blob blob-accent absolute -right-10 top-1/4 h-[400px] w-[400px] opacity-40" />
        <div className="blob blob-cream absolute left-10 bottom-10 h-[300px] w-[300px] opacity-60" />
        <img
          src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-luminosity"
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="font-display text-2xl">
            Nex<span className="italic">Real</span>
          </Link>
          <div>
            <div className="mono-cap text-primary-foreground/70">Chapter 00 · Arrival</div>
            <h2 className="mt-4 font-display text-5xl leading-[1.02] italic">
              Something rare, kindly told.
            </h2>
            <p className="mt-5 max-w-md text-primary-foreground/85">
              You're joining a small, honest index of homes — one where every listing was written by someone who's actually stood in the room.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-14 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <div className="eyebrow">Join RealHaven</div>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">Create an account.</h1>
          <p className="mt-2 text-muted-foreground">Tell us how you'll use RealHaven.</p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <RoleCard active={role === "buyer"} onClick={() => setRole("buyer")} icon={<Home size={20} />} title="Buyer" desc="Browse listings, save favorites, chat live with agents." />
            <RoleCard active={role === "agent"} onClick={() => setRole("agent")} icon={<Briefcase size={20} />} title="Agent" desc="Post listings, receive inquiries, manage your index." />
          </div>

          <form onSubmit={submit} className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Full name"><input required value={name} onChange={(e) => setName(e.target.value)} className="input" /></F>
            <F label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" /></F>
            <F label="Email" full><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></F>
            <F label="Password" full><input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></F>
            <div className="sm:col-span-2">
              <span className="eyebrow">Profile photo</span>
              <div className="mt-2 flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 border border-dashed border-primary/20 overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Home className="h-5 w-5 text-primary/40" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatar(file);
                        setAvatarPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="press inline-block rounded-full border border-border px-4 py-2 text-xs font-medium cursor-pointer bg-background hover:bg-muted"
                  >
                    Choose Photo
                  </label>
                  <p className="mt-1 text-[10px] text-muted-foreground">Max 5MB.</p>
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <button disabled={loading} type="submit" className="press w-full rounded-full bg-ink py-3 text-sm font-medium text-background disabled:opacity-60">
                {loading ? "Creating…" : `Create ${role} account`}
              </button>
            </div>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="nav-link text-ink">Log in</Link>
          </p>
        </motion.div>
      </div>
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:10px;padding:10px 14px;font-size:14px;outline:none;transition:border-color 150ms}.input:focus{border-color:var(--ink)}`}</style>
    </div>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="eyebrow">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function RoleCard({ active, onClick, icon, title, desc }: any) {
  return (
    <motion.button
      type="button" onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-2xl border-2 p-5 text-left transition ${active ? "border-ink bg-card shadow-[var(--shadow-card)]" : "border-border bg-card/60 hover:border-ink/40"}`}
    >
      {active && <motion.span layoutId="rolecheck" className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-ink text-background"><Check size={14} /></motion.span>}
      <div className={`grid h-10 w-10 place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted text-ink"}`}>{icon}</div>
      <div className="mt-3 font-display text-lg text-ink">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </motion.button>
  );
}
