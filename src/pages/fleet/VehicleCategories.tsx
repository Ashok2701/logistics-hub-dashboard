import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, Search, RefreshCw, Edit, Trash2, FolderOpen, Loader2, ArrowLeft, Upload,
} from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { cn } from "@/lib/utils";
import { vehicleCategoryApi, type VehicleCategory } from "@/lib/fleetApi";
import { BulkImportDialog } from "@/components/shared/BulkImportDialog";
import { vehicleCategoryImportConfig } from "@/lib/bulkImportConfigs";

interface FormState {
  categoryCode: string;
  description: string;
  active: boolean;
  countryCode: string;
  vehicleType: number;
  axleCount: number;
  maxCapacityWt: number;
  maxCapacityVol: number;
  volumeUnit: string;
  weightUnit: string;
  skillNumber: number;
}

const emptyForm: FormState = {
  categoryCode: "",
  description: "",
  active: true,
  countryCode: "IND",
  vehicleType: 1,
  axleCount: 0,
  maxCapacityWt: 0,
  maxCapacityVol: 0,
  volumeUnit: "CBM",
  weightUnit: "KG",
  skillNumber: 1,
};

export default function VehicleCategories() {
  const [view, setView] = useState<"list" | "form">("list");
  const [rows, setRows] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await vehicleCategoryApi.list()); }
    catch (e: any) { toast.error(e.message || "Failed to load vehicle categories"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const bulkConfig = useMemo(() => vehicleCategoryImportConfig(rows), [rows]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.categoryCode?.toLowerCase().includes(s) ||
      r.description?.toLowerCase().includes(s) ||
      r.countryCode?.toLowerCase().includes(s)
    );
  }, [rows, search]);
  const sort = useSortable(filtered);

  const openAdd = () => { setEditingCode(null); setForm(emptyForm); setView("form"); };
  const openEdit = (r: VehicleCategory) => {
    setEditingCode(r.categoryCode);
    setForm({
      categoryCode: r.categoryCode ?? "",
      description: r.description ?? "",
      active: r.active ?? true,
      countryCode: r.countryCode ?? "IND",
      vehicleType: Number(r.vehicleType ?? 1),
      axleCount: Number(r.axleCount ?? 0),
      maxCapacityWt: Number(r.maxCapacityWt ?? 0),
      maxCapacityVol: Number(r.maxCapacityVol ?? 0),
      volumeUnit: r.volumeUnit ?? "CBM",
      weightUnit: r.weightUnit ?? "KG",
      skillNumber: Number(r.skillNumber ?? 1),
    });
    setView("form");
  };

  const remove = async (r: VehicleCategory) => {
    if (!confirm(`Delete vehicle category "${r.categoryCode}"?`)) return;
    try { await vehicleCategoryApi.remove(r.categoryCode); toast.success("Deleted"); await load(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  const save = async () => {
    if (!form.categoryCode.trim()) { toast.error("Category code required"); return; }
    if (!form.description.trim()) { toast.error("Description required"); return; }
    setSaving(true);
    try {
      const body: VehicleCategory = {
        categoryCode: form.categoryCode.trim().toUpperCase(),
        description: form.description.trim(),
        active: form.active,
        countryCode: form.countryCode.trim().toUpperCase(),
        vehicleType: Number(form.vehicleType) || 0,
        axleCount: Number(form.axleCount) || 0,
        maxCapacityWt: Number(form.maxCapacityWt) || 0,
        maxCapacityVol: Number(form.maxCapacityVol) || 0,
        volumeUnit: form.volumeUnit.trim().toUpperCase(),
        weightUnit: form.weightUnit.trim().toUpperCase(),
        skillNumber: Number(form.skillNumber) || 0,
      };
      if (editingCode) { await vehicleCategoryApi.update(editingCode, body); toast.success("Vehicle category updated"); }
      else { await vehicleCategoryApi.create(body); toast.success("Vehicle category created"); }
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
              <h1 className="text-lg font-semibold text-foreground">{editingCode ? "Update Vehicle Category" : "New Vehicle Category"}</h1>
              <p className="text-xs text-muted-foreground">{editingCode ? `Editing ${editingCode}` : "Create a new vehicle category"}</p>
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
            <Field label="Category Code *">
              <input value={form.categoryCode} disabled={!!editingCode}
                onChange={(e) => upd("categoryCode", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="TRUCK" />
            </Field>
            <Field label="Description *" className="md:col-span-2">
              <input value={form.description} onChange={(e) => upd("description", e.target.value)}
                className="form-input" placeholder="Truck" />
            </Field>
            <Field label="Country Code">
              <input value={form.countryCode} onChange={(e) => upd("countryCode", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="IND" maxLength={3} />
            </Field>
            <Field label="Vehicle Type">
              <input type="number" value={form.vehicleType} onChange={(e) => upd("vehicleType", Number(e.target.value))}
                className="form-input" placeholder="1" />
            </Field>
            <Field label="Axle Count">
              <input type="number" value={form.axleCount} onChange={(e) => upd("axleCount", Number(e.target.value))}
                className="form-input" placeholder="6" />
            </Field>
            <Field label="Max Capacity Weight">
              <input type="number" value={form.maxCapacityWt} onChange={(e) => upd("maxCapacityWt", Number(e.target.value))}
                className="form-input" placeholder="12000" />
            </Field>
            <Field label="Weight Unit">
              <input value={form.weightUnit} onChange={(e) => upd("weightUnit", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="KG" />
            </Field>
            <Field label="Skill Number">
              <input type="number" value={form.skillNumber} onChange={(e) => upd("skillNumber", Number(e.target.value))}
                className="form-input" placeholder="1" />
            </Field>
            <Field label="Max Capacity Volume">
              <input type="number" value={form.maxCapacityVol} onChange={(e) => upd("maxCapacityVol", Number(e.target.value))}
                className="form-input" placeholder="50" />
            </Field>
            <Field label="Volume Unit">
              <input value={form.volumeUnit} onChange={(e) => upd("volumeUnit", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="CBM" />
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
        title="Vehicle Categories"
        subtitle="Manage vehicle classification types"
        actions={
          <>
            <button onClick={load} className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowBulkImport(true)} className="h-9 px-4 rounded-lg bg-card border border-border text-sm font-medium flex items-center gap-2 shadow-sm hover:border-primary/40 hover:text-primary transition-all">
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button onClick={openAdd} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} Categor{filtered.length !== 1 ? "ies" : "y"}</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="data-table min-w-[1100px]">
          <thead>
            <tr>
              <SortableTh sortKey="categoryCode" sort={sort}>Code</SortableTh>
              <SortableTh sortKey="description" sort={sort}>Description</SortableTh>
              <SortableTh sortKey="countryCode" sort={sort}>Country</SortableTh>
              <SortableTh sortKey="vehicleType" sort={sort}>Type</SortableTh>
              <SortableTh sortKey="axleCount" sort={sort}>Axles</SortableTh>
              <SortableTh sortKey="maxCapacityWt" sort={sort}>Max Wt</SortableTh>
              <SortableTh sortKey="maxCapacityVol" sort={sort}>Max Vol</SortableTh>
              <SortableTh sortKey="skillNumber" sort={sort}>Skill</SortableTh>
              <th className="w-24">Active</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sort.sorted.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12">
                <FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No vehicle categories</p>
              </td></tr>
            ) : sort.sorted.map((r, i) => (
              <motion.tr key={r.categoryCode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <td><span className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-foreground">{r.categoryCode}</span></td>
                <td className="font-medium text-foreground">{r.description}</td>
                <td className="font-mono text-xs text-muted-foreground">{r.countryCode}</td>
                <td className="font-mono text-foreground">{r.vehicleType}</td>
                <td className="font-mono text-foreground">{r.axleCount}</td>
                <td className="font-mono text-foreground">{r.maxCapacityWt} <span className="text-xs text-muted-foreground">{r.weightUnit}</span></td>
                <td className="font-mono text-foreground">{r.maxCapacityVol} <span className="text-xs text-muted-foreground">{r.volumeUnit}</span></td>
                <td className="font-mono text-foreground">{r.skillNumber}</td>
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

      <BulkImportDialog<VehicleCategory>
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        {...bulkConfig}
        onImported={load}
      />
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
