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
import { Search, Plus, ArrowLeft, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────
interface Customer {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  type: "corporate" | "individual" | "government";
  address: string;
  city: string;
  country: string;
  paymentTerms: string;
  creditLimit: string;
  status: "active" | "inactive";
}

const CUSTOMER_TYPES = ["corporate", "individual", "government"] as const;
const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Prepaid"];
const COUNTRIES = ["United States", "Canada", "Mexico", "United Kingdom", "Germany", "France"];

const seedCustomers: Customer[] = [
  { id: "1", code: "CUS-001", name: "Meridian Logistics Corp", contactPerson: "Robert Hayes", email: "robert@meridian.com", phone: "+1 555-1001", type: "corporate", address: "450 Commerce Dr", city: "Dallas", country: "United States", paymentTerms: "Net 30", creditLimit: "$50,000", status: "active" },
  { id: "2", code: "CUS-002", name: "Greenfield Industries", contactPerson: "Lisa Park", email: "lisa@greenfield.com", phone: "+1 555-1002", type: "corporate", address: "12 Industrial Way", city: "Phoenix", country: "United States", paymentTerms: "Net 45", creditLimit: "$75,000", status: "active" },
  { id: "3", code: "CUS-003", name: "State DOT - California", contactPerson: "Mark Sullivan", email: "msullivan@ca.gov", phone: "+1 555-1003", type: "government", address: "100 Capitol Mall", city: "Sacramento", country: "United States", paymentTerms: "Net 60", creditLimit: "$200,000", status: "active" },
  { id: "4", code: "CUS-004", name: "Rivera Transport LLC", contactPerson: "Carlos Rivera", email: "carlos@riveratransport.com", phone: "+1 555-1004", type: "individual", address: "78 Oak St", city: "Miami", country: "United States", paymentTerms: "COD", creditLimit: "$10,000", status: "inactive" },
];

const emptyForm = {
  code: "", name: "", contactPerson: "", email: "", phone: "",
  type: "corporate" as Customer["type"], address: "", city: "", country: "United States",
  paymentTerms: "Net 30", creditLimit: "", status: true,
};
type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;
type ViewMode = "list" | "form";

const typeColors: Record<Customer["type"], string> = {
  corporate: "bg-blue-500/10 text-blue-600",
  individual: "bg-violet-500/10 text-violet-600",
  government: "bg-amber-500/10 text-amber-600",
};

export default function CustomerManagement() {
  const [items, setItems] = useState<Customer[]>(seedCustomers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const sort = useSortable(filtered);
  const sorted = sort.sorted;

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setErrors({}); setView("form"); };
  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({ code: c.code, name: c.name, contactPerson: c.contactPerson, email: c.email, phone: c.phone, type: c.type, address: c.address, city: c.city, country: c.country, paymentTerms: c.paymentTerms, creditLimit: c.creditLimit, status: c.status === "active" });
    setErrors({}); setView("form");
  };
  const goBack = () => setView("list");
  const handleDelete = (id: string) => { setItems((p) => p.filter((c) => c.id !== id)); toast({ title: "Customer removed" }); };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.code.trim()) e.code = "Customer code is required";
    else if (!editingId && items.some((c) => c.code === form.code.trim())) e.code = "Code already exists";
    if (!form.name.trim()) e.name = "Customer name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingId) {
      setItems((p) => p.map((c) => c.id === editingId ? { ...c, ...form, code: form.code.trim(), name: form.name.trim(), status: form.status ? "active" : "inactive" } : c));
      toast({ title: "Customer updated" });
    } else {
      setItems((p) => [{ id: crypto.randomUUID(), ...form, code: form.code.trim(), name: form.name.trim(), status: form.status ? "active" : "inactive" }, ...p]);
      toast({ title: "Customer created" });
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
              <h1 className="text-lg font-semibold text-foreground">{editingId ? "Edit Customer" : "Add Customer"}</h1>
              <p className="text-xs text-muted-foreground">{editingId ? "Update customer details" : "Register a new customer"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors duration-150">Cancel</button>
            <button onClick={handleSave} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium">{editingId ? "Save Changes" : "Create Customer"}</button>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card">
          <div className="p-6 space-y-6">
            <Section title="Customer Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Customer Code" error={errors.code} required><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. CUS-001" className="h-9" /></Field>
                <Field label="Customer Name" error={errors.name} required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Company name" className="h-9" /></Field>
                <Field label="Customer Type">
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as Customer["type"] }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Contact Person"><Input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} placeholder="Primary contact" className="h-9" /></Field>
                <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@company.com" className="h-9" /></Field>
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

            <Section title="Billing & Status">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Payment Terms">
                  <Select value={form.paymentTerms} onValueChange={(v) => setForm((f) => ({ ...f, paymentTerms: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Credit Limit"><Input value={form.creditLimit} onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} placeholder="e.g. $50,000" className="h-9" /></Field>
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
      <PageHeader title="Customers" subtitle="Manage customer master data" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm focus-visible:ring-primary/30" />
        </div>
        <button onClick={openAdd} className="btn-gradient h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 flex-shrink-0"><Plus className="w-4 h-4" /> Add Customer</button>
      </div>
      <motion.div className="bg-card rounded-xl border border-border shadow-card overflow-hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <SortableTableHead sortKey="code" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Code</SortableTableHead>
              <SortableTableHead sortKey="name" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Name</SortableTableHead>
              <SortableTableHead sortKey="type" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Type</SortableTableHead>
              <SortableTableHead sortKey="contactPerson" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Contact</SortableTableHead>
              <SortableTableHead sortKey="paymentTerms" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Payment</SortableTableHead>
              <SortableTableHead sortKey="status" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Status</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c, i) => (
              <TableRow key={c.id} className={cn("transition-colors duration-150", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}>
                <TableCell className="font-medium text-sm font-mono">{c.code}</TableCell>
                <TableCell className="text-sm">{c.name}</TableCell>
                <TableCell><span className={cn("inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full capitalize", typeColors[c.type])}>{c.type}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{c.contactPerson}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{c.paymentTerms}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status === "active" ? "Active" : "Inactive"} variant={c.status === "active" ? "success" : "muted"} />
                </TableCell>
                <TableCell><RowActions onEdit={() => openEdit(c)} onDelete={() => handleDelete(c.id)} /></TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No customers found</TableCell></TableRow>}
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
