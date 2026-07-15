import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { User as UserIcon, Camera } from "lucide-react";
import { api, auth, type AuthUser, type Role } from "@/lib/api";
import { useAuth, useHydrated } from "@/lib/hooks";
import { compressImage } from "@/lib/image";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isAuthed } = useAuth();
  const hydrated = useHydrated();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("buyer");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed || !user) {
      navigate({ to: "/login" });
      return;
    }
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || "");
    setRole(user.role);
    if (user.avatar) {
      setAvatarPreview(user.avatar);
    }
  }, [hydrated, isAuthed, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      return toast.error("Name and email are required.");
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("email", email.trim());
      fd.append("phone", phone.trim());
      fd.append("role", role);
      if (password.trim()) {
        fd.append("password", password.trim());
      }
      if (avatar) {
        const compressedAvatar = await compressImage(avatar);
        fd.append("avatar", compressedAvatar);
      }

      const d = await api<{ user: AuthUser; token?: string }>("/auth/profile", {
        method: "PUT",
        form: fd,
      });

      if (d.token) {
        auth.set(d.token, d.user);
      } else {
        const currentToken = auth.token();
        if (currentToken) {
          auth.set(currentToken, d.user);
        }
      }
      toast.success("Profile updated successfully.");
      setPassword("");
      setAvatar(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated || !user) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:px-8">
      <div className="eyebrow">Settings</div>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">
        Your profile.
      </h1>
      <p className="mt-2 text-muted-foreground">
        Update your personal details, email, and trust photo.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-10 rounded-3xl border border-border bg-card p-6 md:p-10 shadow-[var(--shadow-card)]"
      >
        <form onSubmit={submit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative group grid h-24 w-24 place-items-center rounded-full bg-primary/10 border-2 border-dashed border-primary/20 overflow-hidden shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-8 w-8 text-primary/40" />
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
                id="profile-avatar-upload"
              />
              <label
                htmlFor="profile-avatar-upload"
                className="press inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-ink cursor-pointer hover:bg-muted"
              >
                <Camera size={14} /> Change photo
              </label>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Supported formats: JPG, PNG, GIF. Max size 5MB.
              </p>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Form details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow">Full name</span>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input mt-1.5"
              />
            </label>

            <label className="block">
              <span className="eyebrow">Phone</span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input mt-1.5"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="eyebrow">Email address</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1.5"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="eyebrow">New Password (leave blank to keep current)</span>
              <input
                type="password"
                minLength={6}
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1.5"
              />
            </label>

            <div className="block">
              <span className="eyebrow">Account type</span>
              <div className="mt-2.5 grid grid-cols-2 gap-3 max-w-[280px]">
                {(["buyer", "agent"] as const).map((r) => {
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`press flex items-center justify-center rounded-xl border py-2.5 text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                        active
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-background border-border text-muted-foreground hover:border-ink/30 hover:text-ink"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Changing your account type updates your navigation tabs and workspace layout.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              disabled={loading}
              type="submit"
              className="press w-full rounded-full bg-ink py-3.5 text-sm font-medium text-background disabled:opacity-60"
            >
              {loading ? "Saving changes…" : "Save profile changes"}
            </button>
          </div>
        </form>
      </motion.div>
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:10px;padding:10px 14px;font-size:14px;outline:none;transition:border-color 150ms}.input:focus{border-color:var(--ink)}`}</style>
    </div>
  );
}
