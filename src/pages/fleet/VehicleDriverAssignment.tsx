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
import {
  vehicleDriverAssignmentApi, vehicleApi, driverApi,
  type VehicleDriverAssignment, type Vehicle, type Driver,
} from "@/lib/fleetApi";

interface FormState {
  vehicleCode: string;
  driverId: string;
  startDate: string;
  endDate: string;
  active: boolean;
  remarks: string;
}

const emptyForm: FormState = {
  vehicleCode: "",
  driverId: "",
  startDate: "",
  endDate: "",
  active: true,
  remarks: "",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

export default function VehicleDriverAssignment() {
  const [view, setView] = useState<"list" | "form">("list");
  const [rows, setRows] = useState<VehicleDriverAssignment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [as, vs, ds] = await Promise.all([
        vehicleDriverAssignmentApi.list(),
        vehicleApi.list().catch(() => [] as Vehicle[]),
        driverApi.list().catch(() => [] as Driver[]),
      ]);
      setRows(as || []);
      setVehicles(vs || []);
      setDrivers(ds || []);
    } catch (e: any) { toast.error(e.message || "Failed to load assignments"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.vehicleCode?.toLowerCase().includes(s) ||
      r.vehicleName?.toLowerCase().includes(s) ||
      r.driverId?.toLowerCase().includes(s) ||
      r.driverName?.toLowerCase().includes(s) ||
      r.remarks?.toLowerCase().includes(s)
    );
  }, [rows, search]);
  const sort = useSortable(filtered);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setView("form"); };
  const openEdit = (r: VehicleDriverAssignment) => {
    setEditingId(r.assignmentId);
    setForm({
      vehicleCode: r.vehicleCode ?? "",
      driverId: r.driverId ?? "",
      startDate: (r.startDate ?? "").slice(0, 10),
      endDate: (r.endDate ?? "").slice(0, 10),
      active: r.active ?? true,
      remarks: r.remarks ?? "",
    });
    setView("form");
  };

  const remove = async (r: VehicleDriverAssignment) => {
    if (!confirm(`Delete assignment for ${r.vehicleCode} → ${r.driverId}?`)) return;
    try {
      await vehicleDriverAssignmentApi.remove(r.assignmentId);
      toast.success("Assignment Deleted Successfully");
      await load();
    } catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  const clear = () => setForm(emptyForm);

  const save = async () => {
    if (!form.vehicleCode.trim()) { toast.error("Vehicle is required"); return; }
    if (!form.driverId.trim()) { toast.error("Driver is required"); return; }
    if (!form.startDate) { toast.error("Start Date is required"); return; }
    if (form.endDate && form.endDate <= form.startDate) {
      toast.error("End Date must be greater than Start Date"); return;
    }
    setSaving(true);
    try {
      const body = {
        vehicleCode: form.vehicleCode,
        driverId: form.driverId,
        startDate: form.startDate,
        endDate: form.endDate || null,
        active: form.active,
        remarks: form.remarks.trim(),
      } as Partial<VehicleDriverAssignment>;
      if (editingId) {
        await vehicleDriverAssignmentApi.update(editingId, body);
        toast.success("Assignment Updated Successfully");
      } else {
        await vehicleDriverAssignmentApi.create(body);
        toast.success("Assignment Saved Successfully");
      }
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
              <h1 className="text-lg font-semibold text-foreground">{editingId ? "Update Assignment" : "New Assignment"}</h1>
              <p className="text-xs text-muted-foreground">Fleet › Vehicle Driver Assignment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clear} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary">Clear</button>
            <button onClick={() => setView("list")} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="h-9 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-6 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Vehicle *">
              <SearchableSelect
                value={form.vehicleCode}
                onChange={(v) => upd("vehicleCode", v)}
                placeholder="Select vehicle…"
                options={vehicles.map((v) => ({
                  value: v.vehicleCode,
                  label: `${v.vehicleCode} - ${v.vehicleName}`,
                }))}
              />
            </Field>
            <Field label="Driver *">
              <SearchableSelect
                value={form.driverId}
                onChange={(v) => upd("driverId", v)}
                placeholder="Select driver…"
                options={drivers.map((d) => ({
                  value: d.driverId,
                  label: `${d.driverId} - ${d.driverName}`,
                }))}
              />
            </Field>
            <Field label="Start Date *">
              <input type="date" value={form.startDate} onChange={(e) => upd("startDate", e.target.value)} className="form-input" />
            </Field>
            <Field label="End Date">
              <input type="date" value={form.endDate} onChange={(e) => upd("endDate", e.target.value)} className="form-input" />
            </Field>
            <Field label="Status">
              <label className="inline-flex items-center gap-2 h-10">
                <input type="checkbox" checked={form.active} onChange={(e) => upd("active", e.target.checked)} className="w-4 h-4 rounded border-border" />
                <span className="text-sm text-foreground">Active</span>
              </label>
            </Field>
            <Field label="Remarks" className="md:col-span-2">
              <textarea value={form.remarks} maxLength={250} onChange={(e) => upd("remarks", e.target.value)}
                className="form-input min-h-[90px] py-2" placeholder="Primary Vehicle Assignment" />
              <span className="text-[11px] text-muted-foreground">{form.remarks.length}/250</span>
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
        title="Vehicle Driver Assignment"
        subtitle="Fleet › Vehicle Driver Assignment"
        actions={
          <>
            <button onClick={load} className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={openAdd} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all">
              <Plus className="w-4 h-4" /> New Assignment
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search assignments…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} Assignment{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="data-table min-w-[1100px]">
          <thead>
            <tr>
              <SortableTh sortKey="vehicleCode" sort={sort}>Vehicle Code</SortableTh>
              <SortableTh sortKey="vehicleName" sort={sort}>Vehicle Name</SortableTh>
              <SortableTh sortKey="driverId" sort={sort}>Driver Id</SortableTh>
              <SortableTh sortKey="driverName" sort={sort}>Driver Name</SortableTh>
              <SortableTh sortKey="startDate" sort={sort}>Start Date</SortableTh>
              <SortableTh sortKey="endDate" sort={sort}>End Date</SortableTh>
              <th className="w-24">Active</th>
              <SortableTh sortKey="remarks" sort={sort}>Remarks</SortableTh>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sort.sorted.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12">
                <FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No assignments</p>
              </td></tr>
            ) : sort.sorted.map((r, i) => (
              <motion.tr key={r.assignmentId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <td><span className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-foreground">{r.vehicleCode}</span></td>
                <td className="font-medium text-foreground">{r.vehicleName}</td>
                <td className="font-mono text-xs text-foreground">{r.driverId}</td>
                <td className="text-foreground">{r.driverName}</td>
                <td className="font-mono text-foreground">{fmtDate(r.startDate)}</td>
                <td className="font-mono text-foreground">{fmtDate(r.endDate)}</td>
                <td>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${r.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${r.active ? "bg-success" : "bg-muted-foreground/50"}`} />
                    {r.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-muted-foreground max-w-[260px] truncate" title={r.remarks}>{r.remarks || "—"}</td>
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

function SearchableSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.value === value);
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="form-input flex items-center justify-between text-left">
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.label : (placeholder || "Select…")}
        </span>
        <span className="text-muted-foreground text-xs">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQ(""); }} />
          <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
            <div className="p-2 border-b border-border">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full h-8 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-primary/40" />
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">No results</div>
            ) : filtered.map((o) => (
              <button key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                className={cn("w-full text-left px-3 py-2 text-sm hover:bg-secondary", value === o.value && "bg-secondary/60 font-medium")}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
