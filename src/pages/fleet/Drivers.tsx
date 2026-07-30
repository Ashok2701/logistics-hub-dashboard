import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, Search, RefreshCw, Edit, Trash2, FolderOpen, Loader2, ArrowLeft, Upload,
} from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { cn } from "@/lib/utils";
import { driverApi, type Driver } from "@/lib/fleetApi";
import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";
import { BulkImportDialog } from "@/components/shared/BulkImportDialog";
import { driverImportConfig } from "@/lib/bulkImportConfigs";

type FormState = Driver;

const emptyForm: FormState = {
  driverId: "",
  driverName: "",
  active: true,
  employeeCode: "",
  mobileNo: "",
  email: "",
  licenseNumber: "",
  licenseType: 1,
  licenseIssueDate: "",
  licenseExpiryDate: "",
  issuedBy: "",
  maxHoursPerDay: 8,
  maxHoursPerWeek: 48,
  driverStatus: 1,
  allowAllVehicles: true,
  longHaulDriver: false,
  notes: "",
};

export default function Drivers() {
  const [view, setView] = useState<"list" | "form">("list");
  const [rows, setRows] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const emailInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await driverApi.list();
      setRows(data || []);
    } catch (e: any) { toast.error(e.message || "Failed to load drivers"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const bulkConfig = useMemo(() => driverImportConfig(rows), [rows]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.driverId?.toLowerCase().includes(s) ||
      r.driverName?.toLowerCase().includes(s) ||
      r.employeeCode?.toLowerCase().includes(s) ||
      r.mobileNo?.toLowerCase().includes(s) ||
      r.email?.toLowerCase().includes(s) ||
      r.licenseNumber?.toLowerCase().includes(s)
    );
  }, [rows, search]);
  const sort = useSortable(filtered);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setView("form"); };
  const openEdit = (r: Driver) => {
    setEditingId(r.driverId);
    setForm({
      driverId: r.driverId ?? "",
      driverName: r.driverName ?? "",
      active: r.active ?? true,
      employeeCode: r.employeeCode ?? "",
      mobileNo: r.mobileNo ?? "",
      email: r.email ?? "",
      licenseNumber: r.licenseNumber ?? "",
      licenseType: Number(r.licenseType ?? 1),
      licenseIssueDate: (r.licenseIssueDate ?? "").slice(0, 10),
      licenseExpiryDate: (r.licenseExpiryDate ?? "").slice(0, 10),
      issuedBy: r.issuedBy ?? "",
      maxHoursPerDay: Number(r.maxHoursPerDay ?? 8),
      maxHoursPerWeek: Number(r.maxHoursPerWeek ?? 48),
      driverStatus: Number(r.driverStatus ?? 1),
      allowAllVehicles: r.allowAllVehicles ?? true,
      longHaulDriver: r.longHaulDriver ?? false,
      notes: r.notes ?? "",
    });
    setView("form");
  };

  const remove = async (r: Driver) => {
    if (!confirm(`Delete driver "${r.driverId}"?`)) return;
    try { await driverApi.remove(r.driverId); toast.success("Deleted"); await load(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  const save = async () => {
    if (!form.driverId.trim()) { toast.error("Driver ID required"); return; }
    if (!form.driverName.trim()) { toast.error("Driver name required"); return; }
    // mobile number validation: must be 10 digits and valid Indian mobile number
      let normalizedMobile = "";
  if (form.mobileNo.trim()) {
    const parsedMobile = parsePhoneNumberFromString(form.mobileNo.trim());
    if (!parsedMobile || !parsedMobile.isValid()) {
      toast.error("Enter a valid mobile number (include country code, e.g. +91...)");
      return;
    }
    normalizedMobile = parsedMobile.number; // clean E.164 format, e.g. "+919866906675"
  }
  // email validation: must be valid email address
      if (emailInputRef.current && !emailInputRef.current.checkValidity()) {
    toast.error("Enter a valid email address");
    emailInputRef.current.reportValidity();
    return;
  }
  // license date validation: issue date must be before expiry date
    if (form.licenseIssueDate && form.licenseExpiryDate) {
    const issueDate = new Date(form.licenseIssueDate);
    const expiryDate = new Date(form.licenseExpiryDate);
    if (expiryDate < issueDate) {
      toast.error("License expiry date cannot be before the issue date");
      return;
    }
  }
    setSaving(true);
    try {
      const body: Driver = {
        ...form,
        driverId: form.driverId.trim().toUpperCase(),
        driverName: form.driverName.trim(),
        employeeCode: form.employeeCode.trim().toUpperCase(),
        mobileNo: normalizedMobile,
        email: form.email.trim(),
        licenseNumber: form.licenseNumber.trim().toUpperCase(),
        licenseType: Number(form.licenseType) || 0,
        maxHoursPerDay: Number(form.maxHoursPerDay) || 0,
        maxHoursPerWeek: Number(form.maxHoursPerWeek) || 0,
        driverStatus: Number(form.driverStatus) || 0,
        issuedBy: form.issuedBy.trim(),
        notes: form.notes.trim(),
      };
      if (editingId) { await driverApi.update(editingId, body); toast.success("Driver updated"); }
      else { await driverApi.create(body); toast.success("Driver created"); }
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
              <h1 className="text-lg font-semibold text-foreground">{editingId ? "Update Driver" : "New Driver"}</h1>
              <p className="text-xs text-muted-foreground">{editingId ? `Editing ${editingId}` : "Create a new driver"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView("list")} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="h-9 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Driver ID *">
              <input value={form.driverId} disabled={!!editingId}
                onChange={(e) => upd("driverId", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="DRV001" />
            </Field>
            <Field label="Driver Name *">
              <input value={form.driverName} onChange={(e) => upd("driverName", e.target.value)}
                className="form-input" placeholder="John David" />
            </Field>
            <Field label="Employee Code">
              <input value={form.employeeCode} onChange={(e) => upd("employeeCode", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="EMP001" />
            </Field>
            <Field label="Mobile No">
              <input value={form.mobileNo} inputMode="tel" onChange={(e) => upd("mobileNo", e.target.value)}
                className="form-input font-mono" placeholder="+91 9876543210" />
            </Field>
            <Field label="Email">
              <input ref={emailInputRef} type="email" value={form.email} onChange={(e) => upd("email", e.target.value)}
                className="form-input" placeholder="john@test.com" />
            </Field>
            <Field label="License Number">
              <input value={form.licenseNumber} onChange={(e) => upd("licenseNumber", e.target.value.toUpperCase())}
                className="form-input font-mono" placeholder="DL123456" />
            </Field>
            <Field label="License Type">
              <input type="number" value={form.licenseType} onChange={(e) => upd("licenseType", Number(e.target.value))}
                className="form-input" placeholder="1" />
            </Field>
            <Field label="License Issue Date">
              <input type="date" value={form.licenseIssueDate} onChange={(e) => upd("licenseIssueDate", e.target.value)}
                className="form-input" />
            </Field>
            <Field label="License Expiry Date">
              <input type="date" value={form.licenseExpiryDate} onChange={(e) => upd("licenseExpiryDate", e.target.value)}
                className="form-input" />
            </Field>
            <Field label="Issued By">
              <input value={form.issuedBy} onChange={(e) => upd("issuedBy", e.target.value)}
                className="form-input" placeholder="RTO Hyderabad" />
            </Field>
            <Field label="Max Hours / Day">
              <input type="number" value={form.maxHoursPerDay} onChange={(e) => upd("maxHoursPerDay", Number(e.target.value))}
                className="form-input" placeholder="8" />
            </Field>
            <Field label="Max Hours / Week">
              <input type="number" value={form.maxHoursPerWeek} onChange={(e) => upd("maxHoursPerWeek", Number(e.target.value))}
                className="form-input" placeholder="48" />
            </Field>
            <Field label="Driver Status">
              <input type="number" value={form.driverStatus} onChange={(e) => upd("driverStatus", Number(e.target.value))}
                className="form-input" placeholder="1" />
            </Field>
            <Field label="Allow All Vehicles">
              <select value={form.allowAllVehicles ? "1" : "0"} onChange={(e) => upd("allowAllVehicles", e.target.value === "1")} className="form-input">
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </Field>
            <Field label="Long Haul Driver">
              <select value={form.longHaulDriver ? "1" : "0"} onChange={(e) => upd("longHaulDriver", e.target.value === "1")} className="form-input">
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.active ? "1" : "0"} onChange={(e) => upd("active", e.target.value === "1")} className="form-input">
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </Field>
            <Field label="Notes" className="md:col-span-3">
              <textarea value={form.notes} onChange={(e) => upd("notes", e.target.value)}
                className="form-input" style={{ height: "auto", padding: "0.5rem 0.75rem", minHeight: "5rem" }}
                placeholder="Senior Driver" />
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
        title="Drivers"
        subtitle="Manage fleet drivers"
        actions={
          <>
            <button onClick={load} className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowBulkImport(true)} className="h-9 px-4 rounded-lg bg-card border border-border text-sm font-medium flex items-center gap-2 shadow-sm hover:border-primary/40 hover:text-primary transition-all">
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button onClick={openAdd} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all">
              <Plus className="w-4 h-4" /> Add Driver
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search drivers…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} driver{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="data-table min-w-[1100px]">
          <thead>
            <tr>
              <SortableTh sortKey="driverId" sort={sort}>ID</SortableTh>
              <SortableTh sortKey="driverName" sort={sort}>Name</SortableTh>
              <SortableTh sortKey="employeeCode" sort={sort}>Employee</SortableTh>
              <SortableTh sortKey="mobileNo" sort={sort}>Mobile</SortableTh>
              <SortableTh sortKey="email" sort={sort}>Email</SortableTh>
              <SortableTh sortKey="licenseNumber" sort={sort}>License</SortableTh>
              <SortableTh sortKey="licenseExpiryDate" sort={sort}>Expiry</SortableTh>
              <SortableTh sortKey="maxHoursPerDay" sort={sort}>Hrs/Day</SortableTh>
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
                <p className="text-sm text-muted-foreground">No drivers</p>
              </td></tr>
            ) : sort.sorted.map((r, i) => (
              <motion.tr key={r.driverId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <td><span className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-foreground">{r.driverId}</span></td>
                <td className="font-medium text-foreground">{r.driverName}</td>
                <td className="font-mono text-xs text-muted-foreground">{r.employeeCode}</td>
                <td className="font-mono text-xs text-foreground">{r.mobileNo}</td>
                <td className="text-foreground">{r.email}</td>
                <td className="font-mono text-xs text-foreground">{r.licenseNumber}</td>
                <td className="font-mono text-xs text-muted-foreground">{(r.licenseExpiryDate || "").slice(0, 10)}</td>
                <td className="font-mono text-foreground">{r.maxHoursPerDay}</td>
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

      <BulkImportDialog<Driver>
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
