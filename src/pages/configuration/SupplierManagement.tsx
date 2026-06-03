import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/shared/MetricCard";
import { RowActions } from "@/components/shared/RowActions";
import { SortableTableHead } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: "fuel" | "parts" | "tires" | "insurance" | "maintenance" | "other";
  address: string;
  city: string;
  country: string;
  paymentTerms: string;
  rating: number;
  status: "active" | "inactive";
}

const CATEGORIES = ["fuel", "parts", "tires", "insurance", "maintenance", "other"] as const;
const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Prepaid"];
const COUNTRIES = ["United States", "Canada", "Mexico", "United Kingdom", "Germany", "France"];

const seedSuppliers: Supplier[] = [
  { id: "1", code: "SUP-001", name: "PetroChem Fuels Inc", contactPerson: "William Grant", email: "wgrant@petrochem.com", phone: "+1 555-2001", category: "fuel", address: "200 Refinery Rd", city: "Houston", country: "United States", paymentTerms: "Net 30", rating: 4, status: "active" },
  { id: "2", code: "SUP-002", name: "AutoParts Direct", contactPerson: "Karen Mitchell", email: "karen@autoparts.com", phone: "+1 555-2002", category: "parts", address: "55 Parts Blvd", city: "Detroit", country: "United States", paymentTerms: "Net 15", rating: 5, status: "active" },
  { id: "3", code: "SUP-003", name: "TireMax Solutions", contactPerson: "Ahmad Rashid", email: "arashid@tiremax.com", phone: "+1 555-2003", category: "tires", address: "890 Rubber Ave", city: "Akron", country: "United States", paymentTerms: "Net 45", rating: 3, status: "active" },
  { id: "4", code: "SUP-004", name: "SafeGuard Insurance", contactPerson: "Diane Foster", email: "dfoster@safeguard.com", phone: "+1 555-2004", category: "insurance", address: "321 Policy Dr", city: "Hartford", country: "United States", paymentTerms: "Net 60", rating: 4, status: "inactive" },
];

const emptyForm = {
  code: "", name: "", contactPerson: "", email: "", phone: "",
  category: "fuel" as Supplier["category"], address: "", city: "", country: "United States",
  paymentTerms: "Net 30", rating: 3, status: true,
};
type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;
type ViewMode = "list" | "form";

const catColors: Record<Supplier["category"], string> = {
  fuel: "bg-orange-500/10 text-orange-600",
  parts: "bg-blue-500/10 text-blue-600",
  tires: "bg-slate-500/10 text-slate-600",
  insurance: "bg-emerald-500/10 text-emerald-600",
  maintenance: "bg-violet-500/10 text-violet-600",
  other: "bg-gray-500/10 text-gray-600",
};

export default function SupplierManagement() {
  const [items, setItems] = useState<Supplier[]>(seedSuppliers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const filtered = items.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.contactPerson.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const sort = useSortable(filtered);
  const sorted = sort.sorted;

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setErrors({}); setView("form"); };
  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({ code: s.code, name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, category: s.category, address: s.address, city: s.city, country: s.country, paymentTerms: s.paymentTerms, rating: s.rating, status: s.status === "active" });
    setErrors({}); setView("form");
  };
  const goBack = () => setView("list");
  const handleDelete = (id: string) => { setItems((p) => p.filter((s) => s.id !== id)); toast({ title: "Supplier removed" }); };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.code.trim()) e.code = "Supplier code is required";
    else if (!editingId && items.some((s) => s.code === form.code.trim())) e.code = "Code already exists";
    if (!form.name.trim()) e.name = "Supplier name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingId) {
      setItems((p) => p.map((s) => s.id === editingId ? { ...s, ...form, code: form.code.trim(), name: form.name.trim(), status: form.status ? "active" : "inactive" } : s));
      toast({ title: "Supplier updated" });
    } else {
      setItems((p) => [{ id: crypto.randomUUID(), ...form, code: form.code.trim(), name: form.name.trim(), status: form.status ? "active" : "inactive" }, ...p]);
      toast({ title: "Supplier created" });
    }
    setView("list");
  };

  if (view === "form") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors duration-150"><ArrowLeft className="w-4 h-4" /></button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{editingId ? "Edit Supplier" : "Add Supplier"}</h1>
              <p className="text-xs text-muted-foreground">{editingId ? "Update supplier details" : "Register a new supplier"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors duration-150">Cancel</button>
            <button onClick={handleSave} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium">{editingId ? "Save Changes" : "Create Supplier"}</button>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card">
          <div className="p-6 space-y-6">
            <Section title="Supplier Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Supplier Code" error={errors.code} required><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. SUP-001" className="h-9" /></Field>
                <Field label="Supplier Name" error={errors.name} required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Company name" className="h-9" /></Field>
                <Field label="Category">
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as Supplier["category"] }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Contact Person"><Input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} placeholder="Primary contact" className="h-9" /></Field>
                <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@supplier.com" className="h-9" /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 555-0100" className="h-9" /></Field>
              </div>
            </Section>

            <Section title="Address">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Address"><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" className="h-9" /></Field>
                <Field label="City"><Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" className="h-9" /></Field>
                <Field label="Country">
                  <Select value={form.country} onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Section title="Terms & Status">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Payment Terms">
                  <Select value={form.paymentTerms} onValueChange={(v) => setForm((f) => ({ ...f, paymentTerms: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Rating (1-5)">
                  <Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} className="h-9" />
                </Field>
                <Field label="Status">
                  <div className="flex items-center gap-3 h-9">
                    <Switch checked={form.status} onCheckedChange={(v) => setForm((f) => ({ ...f, status: v }))} />
                    <span className="text-sm">{form.status ? "Active" : "Inactive"}</span>
                  </div>
                </Field>
              </div>
            </Section>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Manage supplier master data" />
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm focus-visible:ring-primary/30" />
        </div>
        <div className="flex items-end gap-3 w-full sm:w-auto">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
              <SelectTrigger className="h-9 w-36 rounded-lg bg-secondary/50 border-border/50 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button onClick={openAdd} className="btn-gradient h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 flex-shrink-0"><Plus className="w-4 h-4" /> Add Supplier</button>
        </div>
      </div>
      <motion.div className="bg-card rounded-xl border border-border shadow-card overflow-hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <SortableTableHead sortKey="code" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Code</SortableTableHead>
              <SortableTableHead sortKey="name" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Name</SortableTableHead>
              <SortableTableHead sortKey="category" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Category</SortableTableHead>
              <SortableTableHead sortKey="contactPerson" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Contact</SortableTableHead>
              <SortableTableHead sortKey="rating" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Rating</SortableTableHead>
              <SortableTableHead sortKey="status" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Status</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s, i) => (
              <TableRow key={s.id} className={cn("transition-colors duration-150", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}>
                <TableCell className="font-medium text-sm font-mono">{s.code}</TableCell>
                <TableCell className="text-sm">{s.name}</TableCell>
                <TableCell><span className={cn("inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full capitalize", catColors[s.category])}>{s.category}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{s.contactPerson}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, idx) => <span key={idx} className={cn("w-2 h-2 rounded-full", idx < s.rating ? "bg-amber-400" : "bg-muted")} />)}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status === "active" ? "Active" : "Inactive"} variant={s.status === "active" ? "success" : "muted"} />
                </TableCell>
                <TableCell><RowActions onEdit={() => openEdit(s)} onDelete={() => handleDelete(s.id)} /></TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No suppliers found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

function Section({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (<div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{title}</h3>{error && <span className="text-[11px] text-destructive">{error}</span>}</div>{children}</div>);
}
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (<div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>{children}{error && <p className="text-[11px] text-destructive">{error}</p>}</div>);
}
