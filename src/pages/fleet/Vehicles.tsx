import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, Search, RefreshCw, Edit, Trash2, FolderOpen, Loader2, ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { cn } from "@/lib/utils";
import { vehicleApi, vehicleCategoryApi, type Vehicle, type VehicleCategory } from "@/lib/fleetApi";

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
};

export default function Vehicles() {
  const [view, setView] = useState<"list" | "form">("list");
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [vs, cs] = await Promise.all([
        vehicleApi.list(),
        vehicleCategoryApi.list().catch(() => [] as VehicleCategory[]),
      ]);
      setRows(vs || []);
      setCategories(cs || []);
    } catch (e: any) { toast.error(e.message || "Failed to load vehicles"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.vehicleCode?.toLowerCase().includes(s) ||
      r.vehicleName?.toLowerCase().includes(s) ||
      r.vehicleNumber?.toLowerCase().includes(s) ||
      r.brand?.toLowerCase().includes(s) ||
      r.model?.toLowerCase().includes(s) ||
      r.driverId?.toLowerCase().includes(s)
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
      };
      if (editingCode) { await vehicleApi.update(editingCode, body); toast.success("Vehicle updated"); }
      else { await vehicleApi.create(body); toast.success("Vehicle created"); }
      setView("list"); await load();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (view === "form") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("list")} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{editingCode ? "Update Vehicle" : "New Vehicle"}</h1>
              <p className="text-xs text-muted-foreground">{editingCode ? `Editing ${editingCode}` : "Create a new vehicle"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView("list")} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="h-9 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingCode ? "Update" : "Create"}
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Vehicle Code *">
              <input value={form.vehicleCode} disabled={!!editingCode}
                onChange={(e) => upd("vehicleCode", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="VEH001" />
            </Field>
            <Field label="Vehicle Name *">
              <input value={form.vehicleName} onChange={(e) => upd("vehicleName", e.target.value)}
                className="form-input" placeholder="Ashok Leyland 32FT" />
            </Field>
            <Field label="Vehicle Number *">
              <input value={form.vehicleNumber} onChange={(e) => upd("vehicleNumber", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="AP39AB1234" />
            </Field>
            <Field label="Category *">
              <select value={form.categoryCode} onChange={(e) => upd("categoryCode", e.target.value)} className="form-input">
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.categoryCode} value={c.categoryCode}>
                    {c.categoryCode} — {c.description}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand">
              <input value={form.brand} onChange={(e) => upd("brand", e.target.value)} className="form-input" placeholder="Ashok Leyland" />
            </Field>
            <Field label="Model">
              <input value={form.model} onChange={(e) => upd("model", e.target.value)} className="form-input" placeholder="Ecomet" />
            </Field>
            <Field label="Year">
              <input type="number" value={form.vehicleYear} onChange={(e) => upd("vehicleYear", Number(e.target.value))}
                className="form-input" placeholder="2023" />
            </Field>
            <Field label="Color">
              <input value={form.color} onChange={(e) => upd("color", e.target.value)} className="form-input" placeholder="White" />
            </Field>
            <Field label="Driver ID">
              <input value={form.driverId} onChange={(e) => upd("driverId", e.target.value)} className="form-input font-mono" placeholder="DRV001" />
            </Field>
            <Field label="Capacity Weight">
              <input type="number" value={form.capacityWeight} onChange={(e) => upd("capacityWeight", Number(e.target.value))}
                className="form-input" placeholder="15000" />
            </Field>
            <Field label="Weight Unit">
              <input value={form.weightUnit} onChange={(e) => upd("weightUnit", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="KG" />
            </Field>
            <Field label="Capacity Volume">
              <input type="number" value={form.capacityVolume} onChange={(e) => upd("capacityVolume", Number(e.target.value))}
                className="form-input" placeholder="75" />
            </Field>
            <Field label="Volume Unit">
              <input value={form.volumeUnit} onChange={(e) => upd("volumeUnit", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="CBM" />
            </Field>
            <Field label="Vehicle Status">
              <input type="number" value={form.vehicleStatus} onChange={(e) => upd("vehicleStatus", Number(e.target.value))}
                className="form-input" placeholder="1" />
            </Field>
            <Field label="Status">
              <select value={form.active ? "1" : "0"} onChange={(e) => upd("active", e.target.value === "1")} className="form-input">
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </Field>
          </div>
        </div>

        <style>{`.form-input{height:2.5rem;padding:0 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.875rem;width:100%}.form-input:focus{outline:none;border-color:hsl(var(--primary)/0.4);box-shadow:0 0 0 2px hsl(var(--primary)/0.1)}.form-input:disabled{opacity:0.6}`}</style>
      </motion.div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Fleet vehicle inventory"
        actions={
          <>
            <button onClick={load} className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={openAdd} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all">
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

      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="data-table min-w-[1200px]">
          <thead>
            <tr>
              <SortableTh sortKey="vehicleCode" sort={sort}>Code</SortableTh>
              <SortableTh sortKey="vehicleName" sort={sort}>Name</SortableTh>
              <SortableTh sortKey="vehicleNumber" sort={sort}>Number</SortableTh>
              <SortableTh sortKey="categoryCode" sort={sort}>Category</SortableTh>
              <SortableTh sortKey="brand" sort={sort}>Brand</SortableTh>
              <SortableTh sortKey="model" sort={sort}>Model</SortableTh>
              <SortableTh sortKey="vehicleYear" sort={sort}>Year</SortableTh>
              <SortableTh sortKey="capacityWeight" sort={sort}>Cap Wt</SortableTh>
              <SortableTh sortKey="capacityVolume" sort={sort}>Cap Vol</SortableTh>
              <SortableTh sortKey="driverId" sort={sort}>Driver</SortableTh>
              <th className="w-24">Active</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sort.sorted.length === 0 ? (
              <tr><td colSpan={12} className="text-center py-12">
                <FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No vehicles</p>
              </td></tr>
            ) : sort.sorted.map((r, i) => (
              <motion.tr key={r.vehicleCode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <td><span className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-foreground">{r.vehicleCode}</span></td>
                <td className="font-medium text-foreground">{r.vehicleName}</td>
                <td className="font-mono text-xs text-foreground">{r.vehicleNumber}</td>
                <td className="font-mono text-xs text-muted-foreground">{r.categoryCode}</td>
                <td className="text-foreground">{r.brand}</td>
                <td className="text-foreground">{r.model}</td>
                <td className="font-mono text-foreground">{r.vehicleYear}</td>
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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
