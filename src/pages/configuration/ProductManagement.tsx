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
import { productApi, type Product } from "@/lib/fleetApi";

type FormState = { serviceTime: string };
const emptyForm: FormState = { serviceTime: "" };

const isTmsActive = (p: Product) => !!p.serviceTime;
function currentUser(): string {
  try { return JSON.parse(localStorage.getItem("vanguard-user") || "{}").username || "admin"; }
  catch { return "admin"; }
}

export default function ProductManagement() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    try { setItems((await productApi.list()) ?? []); }
    catch (err: any) { toast({ title: "Failed to load products", description: err?.message ?? String(err), variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((p) => {
      const m = (p.productName ?? "").toLowerCase().includes(q) ||
                (p.productCode ?? "").toLowerCase().includes(q) ||
                (p.productCategory ?? "").toLowerCase().includes(q);
      const s = statusFilter === "all" || (statusFilter === "active" ? isTmsActive(p) : !isTmsActive(p));
      return m && s;
    });
  }, [items, search, statusFilter]);
  const sort = useSortable(filtered);

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ serviceTime: p.serviceTime ?? "" });
    setView("form");
  };
  const goBack = () => { setView("list"); setEditing(null); };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = { serviceTime: form.serviceTime || null, updatedBy: currentUser() };
      const updated = await productApi.updateTms(editing.productCode, payload);
      setItems((p) => p.map((x) => x.productCode === editing.productCode ? { ...x, ...updated, ...payload } as Product : x));
      toast({ title: "Product updated" });
      goBack();
    } catch (err: any) {
      toast({ title: "Failed to update product", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (view === "form" && editing) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50"><ArrowLeft className="w-4 h-4" /></button>
            <div>
              <h1 className="text-lg font-semibold">Edit Product</h1>
              <p className="text-xs text-muted-foreground">{editing.productCode} — {editing.productName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goBack} disabled={saving} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save</button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
          <Section title="Product Information (from X3)">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Product Code"><ReadOnly value={editing.productCode} mono /></Field>
              <Field label="Product Name"><ReadOnly value={editing.productName ?? ""} /></Field>
              <Field label="Category"><ReadOnly value={editing.productCategory ?? ""} mono /></Field>
              <Field label="Short Description"><ReadOnly value={editing.shortDescription ?? ""} /></Field>
              <Field label="Unit of Measure"><ReadOnly value={editing.unitOfMeasure ?? ""} mono /></Field>
              <Field label="Sales Unit"><ReadOnly value={editing.salesUnit ?? ""} mono /></Field>
              <Field label="Net Weight"><ReadOnly value={editing.netWeight != null ? `${editing.netWeight} ${editing.weightUnit ?? ""}` : ""} /></Field>
              <Field label="Gross Weight"><ReadOnly value={editing.grossWeight != null ? `${editing.grossWeight} ${editing.weightUnit ?? ""}` : ""} /></Field>
              <Field label="Volume"><ReadOnly value={editing.volume != null ? `${editing.volume} ${editing.volumeUnit ?? ""}` : ""} /></Field>
            </div>
          </Section>

          <Section title="TMS Configuration">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Service Time (HH:MM)">
                <Input value={form.serviceTime} onChange={(e) => setForm((f) => ({ ...f, serviceTime: e.target.value }))} placeholder="00:05" className="h-9" />
              </Field>
            </div>
          </Section>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <PageHeader title="Products" subtitle="Manage product TMS configuration" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm" />
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
              <SortableTableHead sortKey="productCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Code</SortableTableHead>
              <SortableTableHead sortKey="productName" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Name</SortableTableHead>
              <SortableTableHead sortKey="productCategory" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Category</SortableTableHead>
              <SortableTableHead sortKey="unitOfMeasure" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">UoM</SortableTableHead>
              <SortableTableHead sortKey="serviceTime" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Service Time</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">TMS</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading products…</TableCell></TableRow>
            ) : sort.sorted.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No products found</TableCell></TableRow>
            ) : sort.sorted.map((p, i) => {
              const tms = isTmsActive(p);
              return (
                <TableRow key={p.productCode} className={cn("transition-colors", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}>
                  <TableCell className="font-medium text-sm font-mono">{p.productCode}</TableCell>
                  <TableCell className="text-sm">{p.productName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{p.productCategory ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{p.unitOfMeasure ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono hidden lg:table-cell">{p.serviceTime ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={tms ? "Active" : "Inactive"} variant={tms ? "primary" : "muted"} /></TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => openEdit(p)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="w-4 h-4" /></button>
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
