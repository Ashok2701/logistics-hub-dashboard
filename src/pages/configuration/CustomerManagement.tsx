import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/shared/MetricCard";
import { SortableTableHead } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowLeft, Pencil, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { customerApi, type Customer } from "@/lib/fleetApi";

type FormState = { latitude: string; longitude: string; serviceTime: string; waitingTime: string; };
const emptyForm: FormState = { latitude: "", longitude: "", serviceTime: "", waitingTime: "" };

const isTmsActive = (c: Customer) =>
  c.latitude != null || c.longitude != null || !!c.serviceTime || !!c.waitingTime;

function currentUser(): string {
  try { return JSON.parse(localStorage.getItem("vanguard-user") || "{}").username || "admin"; }
  catch { return "admin"; }
}

export default function CustomerManagement() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    try { setItems((await customerApi.list()) ?? []); }
    catch (err: any) { toast({ title: "Failed to load customers", description: err?.message ?? String(err), variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((c) => {
      const m = (c.customerName ?? "").toLowerCase().includes(q) ||
                (c.customerCode ?? "").toLowerCase().includes(q) ||
                (c.shortName ?? "").toLowerCase().includes(q);
      const s = statusFilter === "all" || (statusFilter === "active" ? isTmsActive(c) : !isTmsActive(c));
      return m && s;
    });
  }, [items, search, statusFilter]);
  const sort = useSortable(filtered);

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      latitude: c.latitude != null ? String(c.latitude) : "",
      longitude: c.longitude != null ? String(c.longitude) : "",
      serviceTime: c.serviceTime ?? "",
      waitingTime: c.waitingTime ?? "",
    });
    setView("form");
  };
  const goBack = () => { setView("list"); setEditing(null); };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        latitude: form.latitude === "" ? null : parseFloat(form.latitude),
        longitude: form.longitude === "" ? null : parseFloat(form.longitude),
        serviceTime: form.serviceTime || null,
        waitingTime: form.waitingTime || null,
        updatedBy: currentUser(),
      };
      const updated = await customerApi.updateTms(editing.customerCode, payload);
      setItems((p) => p.map((c) => c.customerCode === editing.customerCode ? { ...c, ...updated, ...payload } as Customer : c));
      toast({ title: "Customer updated" });
      goBack();
    } catch (err: any) {
      toast({ title: "Failed to update customer", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (view === "form" && editing) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50"><ArrowLeft className="w-4 h-4" /></button>
            <div>
              <h1 className="text-lg font-semibold">Edit Customer</h1>
              <p className="text-xs text-muted-foreground">{editing.customerCode} — {editing.customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goBack} disabled={saving} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save</button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
          <Section title="Customer Information (from X3)">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Customer Code"><ReadOnly value={editing.customerCode} mono /></Field>
              <Field label="Short Name"><ReadOnly value={editing.shortName ?? ""} /></Field>
              <Field label="Customer Name"><ReadOnly value={editing.customerName ?? ""} /></Field>
              <Field label="Country"><ReadOnly value={editing.countryCode ?? ""} mono /></Field>
              <Field label="Currency"><ReadOnly value={editing.currencyCode ?? ""} mono /></Field>
              <Field label="Active"><ReadOnly value={editing.active ? "Yes" : "No"} /></Field>
            </div>
          </Section>

          <Section title="TMS Configuration">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Latitude"><Input value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="e.g. 51.5074" className="h-9" /></Field>
              <Field label="Longitude"><Input value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="e.g. -0.1278" className="h-9" /></Field>
              <Field label="Service Time (HH:MM)"><Input value={form.serviceTime} onChange={(e) => setForm((f) => ({ ...f, serviceTime: e.target.value }))} placeholder="00:15" className="h-9" /></Field>
              <Field label="Waiting Time (HH:MM)"><Input value={form.waitingTime} onChange={(e) => setForm((f) => ({ ...f, waitingTime: e.target.value }))} placeholder="00:10" className="h-9" /></Field>
            </div>
          </Section>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <PageHeader title="Customers" subtitle="Manage customer TMS configuration" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm" />
        </div>
        <div className="flex items-end gap-3 w-full sm:w-auto">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">TMS Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-36 rounded-lg bg-secondary/50 border-border/50 text-sm"><SelectValue placeholder="TMS Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button onClick={load} disabled={loading} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary inline-flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      <motion.div className="bg-card rounded-xl border border-border shadow-card overflow-hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <SortableTableHead sortKey="customerCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Code</SortableTableHead>
              <SortableTableHead sortKey="customerName" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Name</SortableTableHead>
              <SortableTableHead sortKey="countryCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Country</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Coordinates</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">TMS</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading customers…</TableCell></TableRow>
            ) : sort.sorted.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No customers found</TableCell></TableRow>
            ) : sort.sorted.map((c, i) => {
              const tms = isTmsActive(c);
              return (
                <TableRow key={c.customerCode} className={cn("transition-colors", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}>
                  <TableCell className="font-medium text-sm font-mono">{c.customerCode}</TableCell>
                  <TableCell className="text-sm">{c.customerName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{c.countryCode ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono hidden lg:table-cell">{c.latitude != null && c.longitude != null ? `${c.latitude}, ${c.longitude}` : "—"}</TableCell>
                  <TableCell><StatusBadge status={tms ? "Active" : "Inactive"} variant={tms ? "primary" : "muted"} /></TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => openEdit(c)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="w-4 h-4" /></button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h3 className="text-sm font-semibold">{title}</h3>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function ReadOnly({ value, mono }: { value: string; mono?: boolean }) {
  return <Input value={value} readOnly className={cn("h-9 bg-secondary/40", mono && "font-mono")} />;
}
