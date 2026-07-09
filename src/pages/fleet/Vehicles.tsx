import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, Search, RefreshCw, Edit, Trash2, FolderOpen, Loader2, ArrowLeft,
  Truck, MapPin, User, Palette, Gauge, Package, Upload, X, Image as ImageIcon,
  Building2, LogIn, LogOut,
} from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { cn } from "@/lib/utils";
import {
  vehicleApi, vehicleCategoryApi,
  type Vehicle, type VehicleCategory,
} from "@/lib/fleetApi";
import { fetchTmsSites, type RpSite } from "@/lib/routePlannerApi";

interface FormState {
  vehicleCode: string;
  vehicleName: string;
  vehicleNumber: string;
  categoryCode: string;
  brand: string;
  model: string;
  vehicleYear: number;
  color: string;
  capacityWeight: number;
  capacityVolume: number;
  volumeUnit: string;
  weightUnit: string;
  driverId: string;
  active: boolean;
  vehicleStatus: number;
  site: string;
  departureSite: string;
  arrivalSite: string;
  imageUrl: string;
}

const emptyForm: FormState = {
  vehicleCode: "",
  vehicleName: "",
  vehicleNumber: "",
  categoryCode: "",
  brand: "",
  model: "",
  vehicleYear: new Date().getFullYear(),
  color: "",
  capacityWeight: 0,
  capacityVolume: 0,
  volumeUnit: "CBM",
  weightUnit: "KG",
  driverId: "",
  active: true,
  vehicleStatus: 1,
  site: "",
  departureSite: "",
  arrivalSite: "",
  imageUrl: "",
};

export default function Vehicles() {
  const [view, setView] = useState<"list" | "form">("list");
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [sites, setSites] = useState<RpSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [vs, cs, ss] = await Promise.all([
        vehicleApi.list(),
        vehicleCategoryApi.list().catch(() => [] as VehicleCategory[]),
        fetchTmsSites().catch(() => [] as RpSite[]),
      ]);
      setRows(vs || []);
      setCategories(cs || []);
      setSites(ss || []);
    } catch (e: any) { toast.error(e.message || "Failed to load vehicles"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const siteMap = useMemo(() => {
    const m = new Map<string, RpSite>();
    sites.forEach((s) => m.set(s.siteCode, s));
    return m;
  }, [sites]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.vehicleCode?.toLowerCase().includes(s) ||
      r.vehicleName?.toLowerCase().includes(s) ||
      r.vehicleNumber?.toLowerCase().includes(s) ||
      r.brand?.toLowerCase().includes(s) ||
      r.model?.toLowerCase().includes(s) ||
      r.driverId?.toLowerCase().includes(s) ||
      r.site?.toLowerCase().includes(s)
    );
  }, [rows, search]);
  const sort = useSortable(filtered);

  const openAdd = () => { setEditingCode(null); setForm(emptyForm); setView("form"); };
  const openEdit = (r: Vehicle) => {
    setEditingCode(r.vehicleCode);
    setForm({
      vehicleCode: r.vehicleCode ?? "",
      vehicleName: r.vehicleName ?? "",
      vehicleNumber: r.vehicleNumber ?? "",
      categoryCode: r.categoryCode ?? "",
      brand: r.brand ?? "",
      model: r.model ?? "",
      vehicleYear: Number(r.vehicleYear ?? new Date().getFullYear()),
      color: r.color ?? "",
      capacityWeight: Number(r.capacityWeight ?? 0),
      capacityVolume: Number(r.capacityVolume ?? 0),
      volumeUnit: r.volumeUnit ?? "CBM",
      weightUnit: r.weightUnit ?? "KG",
      driverId: r.driverId ?? "",
      active: r.active ?? true,
      vehicleStatus: Number(r.vehicleStatus ?? 1),
      site: r.site ?? "",
      departureSite: r.departureSite ?? "",
      arrivalSite: r.arrivalSite ?? "",
      imageUrl: r.imageUrl ?? "",
    });
    setView("form");
  };

  const remove = async (r: Vehicle) => {
    if (!confirm(`Delete vehicle "${r.vehicleCode}"?`)) return;
    try { await vehicleApi.remove(r.vehicleCode); toast.success("Deleted"); await load(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  const save = async () => {
    if (!form.vehicleCode.trim()) { toast.error("Vehicle code required"); return; }
    if (!form.vehicleName.trim()) { toast.error("Vehicle name required"); return; }
    if (!form.vehicleNumber.trim()) { toast.error("Vehicle number required"); return; }
    if (!form.categoryCode.trim()) { toast.error("Category required"); return; }
    setSaving(true);
    try {
      const body: Vehicle = {
        vehicleCode: form.vehicleCode.trim().toUpperCase(),
        vehicleName: form.vehicleName.trim(),
        vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
        categoryCode: form.categoryCode.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        vehicleYear: Number(form.vehicleYear) || 0,
        color: form.color.trim(),
        capacityWeight: Number(form.capacityWeight) || 0,
        capacityVolume: Number(form.capacityVolume) || 0,
        volumeUnit: form.volumeUnit.trim().toUpperCase(),
        weightUnit: form.weightUnit.trim().toUpperCase(),
        driverId: form.driverId.trim(),
        active: form.active,
        vehicleStatus: Number(form.vehicleStatus) || 0,
        site: form.site.trim() || null,
        departureSite: form.departureSite.trim() || null,
        arrivalSite: form.arrivalSite.trim() || null,
        imageUrl: form.imageUrl || null,
      };
      if (editingCode) { await vehicleApi.update(editingCode, body); toast.success("Vehicle updated"); }
      else { await vehicleApi.create(body); toast.success("Vehicle created"); }
      setView("list"); await load();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => upd("imageUrl", String(reader.result || ""));
    reader.readAsDataURL(f);
  };

  if (view === "form") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full veh-page"
      >
        {/* Sunset Blaze hero */}
        <div className="relative overflow-hidden rounded-2xl mb-6 shadow-elevated">
          <div className="absolute inset-0 bg-gradient-to-r from-[#ff6b35] via-[#f7931e] to-[#e84393]" />
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#6c5ce7]/40 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-[#ff6b35]/40 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.12]"
            style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1.5px, transparent 1.5px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="relative flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setView("list")} className="w-11 h-11 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white transition ring-1 ring-white/20">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white shadow-lg ring-1 ring-white/30">
                <Truck className="w-7 h-7" />
              </div>
              <div className="text-white">
                <h1 className="veh-display text-2xl font-bold tracking-tight">
                  {editingCode ? "Update Vehicle" : "New Vehicle"}
                </h1>
                <p className="text-sm text-white/85 mt-0.5">
                  {editingCode ? `Editing ${editingCode}` : "Register a new fleet vehicle"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView("list")} className="h-11 px-5 rounded-xl text-sm font-medium bg-white/15 hover:bg-white/25 text-white backdrop-blur transition ring-1 ring-white/20">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="h-11 px-6 rounded-xl text-sm font-bold bg-white text-[#e84393] hover:bg-white/95 shadow-xl flex items-center gap-2 disabled:opacity-60 transition"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingCode ? "Update Vehicle" : "Create Vehicle"}
              </button>
            </div>
          </div>
        </div>

        {/* Main split: form (left) + image/status (right) */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 w-full">
          {/* LEFT — form sections */}
          <div className="space-y-6 min-w-0">
            <SectionCard title="Basic Information" icon={<Truck className="w-4 h-4" />} accent="from-[#ff6b35] to-[#f7931e]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Vehicle Code *">
                  <input value={form.vehicleCode} disabled={!!editingCode}
                    onChange={(e) => upd("vehicleCode", e.target.value.toUpperCase())}
                    className="form-input font-mono" placeholder="VEH001" />
                </Field>
                <Field label="Vehicle Name *">
                  <input value={form.vehicleName} onChange={(e) => upd("vehicleName", e.target.value)} className="form-input" placeholder="Ashok Leyland 32FT" />
                </Field>
                <Field label="Vehicle Number *">
                  <input value={form.vehicleNumber} onChange={(e) => upd("vehicleNumber", e.target.value.toUpperCase())} className="form-input font-mono" placeholder="AP39AB1234" />
                </Field>
                <Field label="Category *">
                  <select value={form.categoryCode} onChange={(e) => upd("categoryCode", e.target.value)} className="form-input">
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.categoryCode} value={c.categoryCode}>{c.categoryCode} — {c.description}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Driver ID" icon={<User className="w-3.5 h-3.5" />}>
                  <input value={form.driverId} onChange={(e) => upd("driverId", e.target.value)} className="form-input font-mono" placeholder="DRV001" />
                </Field>
                <Field label="Year">
                  <input type="number" value={form.vehicleYear} onChange={(e) => upd("vehicleYear", Number(e.target.value))} className="form-input" placeholder="2026" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Site Assignment" icon={<MapPin className="w-4 h-4" />} accent="from-[#e84393] to-[#6c5ce7]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Home Site" icon={<Building2 className="w-3.5 h-3.5" />}>
                  <SiteSelect value={form.site} onChange={(v) => upd("site", v)} sites={sites} />
                </Field>
                <Field label="Departure Site" icon={<LogOut className="w-3.5 h-3.5" />}>
                  <SiteSelect value={form.departureSite} onChange={(v) => upd("departureSite", v)} sites={sites} />
                </Field>
                <Field label="Arrival Site" icon={<LogIn className="w-3.5 h-3.5" />}>
                  <SiteSelect value={form.arrivalSite} onChange={(v) => upd("arrivalSite", v)} sites={sites} />
                </Field>
              </div>
              {(form.site || form.departureSite || form.arrivalSite) && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {form.site && <SiteChip label="Home" site={siteMap.get(form.site)} tone="amber" />}
                  {form.departureSite && <SiteChip label="Departure" site={siteMap.get(form.departureSite)} tone="pink" />}
                  {form.arrivalSite && <SiteChip label="Arrival" site={siteMap.get(form.arrivalSite)} tone="violet" />}
                </div>
              )}
              {sites.length === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  No TMS-enabled sites loaded. Enable sites in Site Management to populate this list.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Specifications" icon={<Palette className="w-4 h-4" />} accent="from-[#6c5ce7] to-[#e84393]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Brand">
                  <input value={form.brand} onChange={(e) => upd("brand", e.target.value)} className="form-input" placeholder="Ashok Leyland" />
                </Field>
                <Field label="Model">
                  <input value={form.model} onChange={(e) => upd("model", e.target.value)} className="form-input" placeholder="Ecomet" />
                </Field>
                <Field label="Color">
                  <input value={form.color} onChange={(e) => upd("color", e.target.value)} className="form-input" placeholder="White" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Capacity" icon={<Package className="w-4 h-4" />} accent="from-[#f7931e] to-[#ff6b35]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Capacity Weight">
                  <input type="number" value={form.capacityWeight} onChange={(e) => upd("capacityWeight", Number(e.target.value))} className="form-input" placeholder="15000" />
                </Field>
                <Field label="Weight Unit">
                  <input value={form.weightUnit} onChange={(e) => upd("weightUnit", e.target.value.toUpperCase())} className="form-input font-mono" placeholder="KG" />
                </Field>
                <Field label="Capacity Volume">
                  <input type="number" value={form.capacityVolume} onChange={(e) => upd("capacityVolume", Number(e.target.value))} className="form-input" placeholder="75" />
                </Field>
                <Field label="Volume Unit">
                  <input value={form.volumeUnit} onChange={(e) => upd("volumeUnit", e.target.value.toUpperCase())} className="form-input font-mono" placeholder="CBM" />
                </Field>
              </div>
            </SectionCard>
          </div>

          {/* RIGHT — image upload + status (sticky) */}
          <div className="space-y-6">
            <div className="xl:sticky xl:top-4 space-y-6">
              <div className="relative rounded-2xl overflow-hidden shadow-elevated border border-border">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] via-[#e84393] to-[#6c5ce7]" />
                <div className="relative p-5">
                  <div className="flex items-center gap-2.5 mb-4 text-white">
                    <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center ring-1 ring-white/30">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <h3 className="veh-display text-sm font-bold tracking-wide uppercase">Vehicle Image</h3>
                  </div>
                  <div className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-white/15 backdrop-blur ring-1 ring-white/30 flex items-center justify-center">
                    {form.imageUrl ? (
                      <>
                        <img src={form.imageUrl} alt="Vehicle" className="w-full h-full object-cover" />
                        <button onClick={() => upd("imageUrl", "")} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-white/90 p-6">
                        <Truck className="w-14 h-14 mx-auto mb-3 opacity-80" />
                        <p className="text-xs font-medium">No image uploaded</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                  <button onClick={() => fileRef.current?.click()} className="mt-4 w-full h-11 rounded-xl bg-white text-[#e84393] text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-white/95 transition">
                    <Upload className="w-4 h-4" /> {form.imageUrl ? "Replace Image" : "Upload Image"}
                  </button>
                  <p className="text-[11px] text-white/80 mt-2 text-center">PNG, JPG up to 2MB</p>
                </div>
              </div>

              <SectionCard title="Status" icon={<Gauge className="w-4 h-4" />} accent="from-[#f7931e] to-[#e84393]">
                <Field label="Active">
                  <select value={form.active ? "1" : "0"} onChange={(e) => upd("active", e.target.value === "1")} className="form-input">
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </Field>
                <Field label="Vehicle Status">
                  <input type="number" value={form.vehicleStatus} onChange={(e) => upd("vehicleStatus", Number(e.target.value))} className="form-input" placeholder="1" />
                </Field>
              </SectionCard>
            </div>
          </div>
        </div>

        <style>{`
          .veh-page{font-family:'DM Sans','Inter',system-ui,sans-serif}
          .veh-display{font-family:'Space Grotesk','DM Sans',system-ui,sans-serif;letter-spacing:-0.01em}
          .form-input{height:2.625rem;padding:0 0.875rem;border-radius:0.625rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.875rem;width:100%;transition:all .15s;font-family:'DM Sans','Inter',sans-serif}
          .form-input:focus{outline:none;border-color:#ff6b35;box-shadow:0 0 0 3px rgba(255,107,53,0.18)}
          .form-input:disabled{opacity:0.6;background:hsl(var(--muted))}
        `}</style>
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Vehicles"
        subtitle="Fleet vehicle inventory"
        actions={
          <>
            <button onClick={load} className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={openAdd} className="h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search vehicles…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto w-full">
        <table className="data-table min-w-[1300px] w-full">
          <thead>
            <tr>
              <th className="w-14">Image</th>
              <SortableTh sortKey="vehicleCode" sort={sort}>Code</SortableTh>
              <SortableTh sortKey="vehicleName" sort={sort}>Name</SortableTh>
              <SortableTh sortKey="vehicleNumber" sort={sort}>Number</SortableTh>
              <SortableTh sortKey="categoryCode" sort={sort}>Category</SortableTh>
              <SortableTh sortKey="site" sort={sort}>Site</SortableTh>
              <SortableTh sortKey="brand" sort={sort}>Brand</SortableTh>
              <SortableTh sortKey="model" sort={sort}>Model</SortableTh>
              <SortableTh sortKey="capacityWeight" sort={sort}>Cap Wt</SortableTh>
              <SortableTh sortKey="capacityVolume" sort={sort}>Cap Vol</SortableTh>
              <SortableTh sortKey="driverId" sort={sort}>Driver</SortableTh>
              <th className="w-24">Active</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sort.sorted.length === 0 ? (
              <tr><td colSpan={13} className="text-center py-12">
                <FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No vehicles</p>
              </td></tr>
            ) : sort.sorted.map((r, i) => (
              <motion.tr key={r.vehicleCode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <td>
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.vehicleCode} className="w-10 h-10 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-border flex items-center justify-center">
                      <Truck className="w-4 h-4 text-primary/60" />
                    </div>
                  )}
                </td>
                <td><span className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-foreground">{r.vehicleCode}</span></td>
                <td className="font-medium text-foreground">{r.vehicleName}</td>
                <td className="font-mono text-xs text-foreground">{r.vehicleNumber}</td>
                <td className="font-mono text-xs text-muted-foreground">{r.categoryCode}</td>
                <td className="font-mono text-xs text-muted-foreground">{r.site || "—"}</td>
                <td className="text-foreground">{r.brand}</td>
                <td className="text-foreground">{r.model}</td>
                <td className="font-mono text-foreground">{r.capacityWeight} <span className="text-xs text-muted-foreground">{r.weightUnit}</span></td>
                <td className="font-mono text-foreground">{r.capacityVolume} <span className="text-xs text-muted-foreground">{r.volumeUnit}</span></td>
                <td className="font-mono text-xs text-muted-foreground">{r.driverId || "—"}</td>
                <td>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${r.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${r.active ? "bg-success" : "bg-muted-foreground/50"}`} />
                    {r.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(r)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/8 hover:scale-110 transition-all" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(r)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/8 hover:scale-110 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-gradient-to-r from-muted/40 to-transparent">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm bg-gradient-to-br", accent)}>{icon}</div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, icon, children, className }: { label: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

function SiteSelect({ value, onChange, sites }: { value: string; onChange: (v: string) => void; sites: RpSite[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="form-input">
      <option value="">Select site…</option>
      {sites.map((s) => (
        <option key={s.siteCode} value={s.siteCode}>
          {s.siteCode} — {s.siteName}{s.city ? ` (${s.city})` : ""}
        </option>
      ))}
    </select>
  );
}

function SiteChip({ label, site, tone }: { label: string; site: RpSite | undefined; tone: "amber" | "blue" | "emerald" }) {
  if (!site) return null;
  const tones = {
    amber: "from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
    blue: "from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
    emerald: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  }[tone];
  return (
    <div className={cn("rounded-lg border bg-gradient-to-br p-3", tones)}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{site.siteName}</div>
      <div className="text-[11px] opacity-70 font-mono">{site.siteCode}</div>
      {site.city && <div className="text-[11px] opacity-70 mt-0.5">{site.city}{site.countryCode ? `, ${site.countryCode}` : ""}</div>}
    </div>
  );
}
