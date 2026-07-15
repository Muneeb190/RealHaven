import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { api, type Property } from "@/lib/api";
import { useAuth, useHydrated } from "@/lib/hooks";
import { compressImage } from "@/lib/image";

export const Route = createFileRoute("/properties/$id/edit")({
  component: EditProperty,
});

function EditProperty() {
  const { id } = Route.useParams();
  const { user, isAuthed } = useAuth();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "uploading" | "publishing">("loading");

  const [form, setForm] = useState({
    title: "", description: "", price: "", type: "house", status: "for-sale",
    address: "", city: "", bedrooms: "", bathrooms: "", areaSqft: "",
  });

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) { navigate({ to: "/login" }); return; }
    if (user?.role !== "agent") { navigate({ to: "/" }); return; }
    
    // Load property details
    api<{ property: Property }>(`/properties/${id}`)
      .then((d) => {
        const p = d.property;
        // Verify ownership
        const agentId = typeof p.agent === "string" ? p.agent : p.agent?._id;
        if (agentId !== user._id) {
          toast.error("Not your listing.");
          navigate({ to: "/dashboard" });
          return;
        }
        
        setForm({
          title: p.title || "",
          description: p.description || "",
          price: String(p.price || ""),
          type: p.type || "house",
          status: p.status || "for-sale",
          city: p.location?.city || "",
          address: p.location?.address || "",
          bedrooms: String(p.bedrooms ?? ""),
          bathrooms: String(p.bathrooms ?? ""),
          areaSqft: String(p.areaSqft ?? ""),
        });
        setExistingImages(p.images || []);
        setState("idle");
      })
      .catch((e) => {
        toast.error(e.message);
        navigate({ to: "/dashboard" });
      });
  }, [id, hydrated, isAuthed, user, navigate]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, 6 - existingImages.length);
    setFiles(next);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingImages.length + files.length === 0) return toast.error("Add at least one photo.");
    setState("uploading");
    try {
      const compressedFiles = await Promise.all(files.map((file) => compressImage(file)));
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      existingImages.forEach((img) => fd.append("existingImages", img));
      compressedFiles.forEach((f) => fd.append("images", f));
      setState("publishing");
      await api(`/properties/${id}`, { method: "PUT", form: fd });
      toast.success("Listing updated.");
      navigate({ to: "/properties/$id", params: { id } });
    } catch (e: any) {
      toast.error(e.message);
      setState("idle");
    }
  };

  if (state === "loading") {
    return <div className="mx-auto max-w-3xl px-5 py-24 text-center text-muted-foreground">Loading details…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <div className="eyebrow">Edit listing</div>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">Update property.</h1>
      <p className="mt-2 text-muted-foreground">Keep it accurate. Highlight the best features.</p>

      <form onSubmit={submit} className="mt-10 space-y-8">
        {/* Photos */}
        <section>
          <div className="eyebrow">Photos <span className="ml-2 normal-case tracking-normal text-muted-foreground/70">({existingImages.length + files.length}/6)</span></div>
          
          {/* Dropzone */}
          {existingImages.length + files.length < 6 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${drag ? "border-ink bg-muted" : "border-border hover:border-ink/60 hover:bg-muted/40"}`}
            >
              <Upload size={22} className="text-muted-foreground" />
              <div className="mt-3 font-display text-lg text-ink">Drop photos here</div>
              <div className="text-xs text-muted-foreground">or click to browse — JPG or PNG, up to 6 total</div>
              <input ref={fileRef} type="file" multiple accept="image/*" hidden onChange={(e) => addFiles(e.target.files)} />
            </div>
          )}
          
          {/* Photo Previews */}
          {(existingImages.length > 0 || previews.length > 0) && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {/* Existing Images */}
              {existingImages.map((src, i) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setExistingImages((f) => f.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-background"><X size={12} /></button>
                </div>
              ))}
              
              {/* New Images Previews */}
              <AnimatePresence>
                {previews.map((src, i) => (
                  <motion.div key={src} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative aspect-square overflow-hidden rounded-lg">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setFiles((f) => f.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-background"><X size={12} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Details */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FF label="Title" full><input required className="input" value={form.title} onChange={set("title")} placeholder="Sunlit bungalow near Lake Merritt" /></FF>
          <FF label="Description" full>
            <textarea required rows={5} className="input" value={form.description} onChange={set("description")} placeholder="A quiet corner lot with…" />
          </FF>
          <FF label="Price ($)"><input required type="number" className="input" value={form.price} onChange={set("price")} /></FF>
          <FF label="Type">
            <select className="input" value={form.type} onChange={set("type")}>
              <option value="house">House</option><option value="apartment">Apartment</option>
              <option value="plot">Plot</option><option value="commercial">Commercial</option>
            </select>
          </FF>
          <FF label="Status">
            <select className="input" value={form.status} onChange={set("status")}>
              <option value="for-sale">For sale</option><option value="for-rent">For rent</option>
              <option value="sold">Sold</option><option value="rented">Rented</option>
            </select>
          </FF>
          <FF label="City"><input required className="input" value={form.city} onChange={set("city")} /></FF>
          <FF label="Address" full><input required className="input" value={form.address} onChange={set("address")} /></FF>
          <FF label="Bedrooms"><input type="number" className="input" value={form.bedrooms} onChange={set("bedrooms")} /></FF>
          <FF label="Bathrooms"><input type="number" className="input" value={form.bathrooms} onChange={set("bathrooms")} /></FF>
          <FF label="Area (sqft)" full><input type="number" className="input" value={form.areaSqft} onChange={set("areaSqft")} /></FF>
        </section>

        <div className="flex gap-4">
          <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="press flex-1 rounded-full border border-border py-3.5 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button disabled={state !== "idle"} type="submit" className="press flex-[2] rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {state === "uploading" ? "Uploading photos…" : state === "publishing" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:10px;padding:10px 14px;font-size:14px;outline:none;font-family:var(--font-sans)}.input:focus{border-color:var(--ink)}textarea.input{resize:vertical}`}</style>
    </div>
  );
}

function FF({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="eyebrow">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
