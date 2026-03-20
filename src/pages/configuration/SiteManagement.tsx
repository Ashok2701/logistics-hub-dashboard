import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/MetricCard";
import { RowActions } from "@/components/shared/RowActions";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, ArrowLeft, Building2, MapPin, Phone, Mail, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────
interface Site {
  id: string;
  code: string;
  name: string;
  type: "warehouse" | "distribution" | "terminal" | "hub" | "office";
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
  email: string;
  manager: string;
  status: "active" | "inactive";
  capacity: string;
  operatingHours: string;
}

const SITE_TYPES = ["warehouse", "distribution", "terminal", "hub", "office"] as const;
const COUNTRIES = ["United States", "Canada", "Mexico", "United Kingdom", "Germany", "France"];
const STATES = ["California", "Texas", "New York", "Florida", "Illinois", "Pennsylvania", "Ohio"];

// ─── Seed data ────────────────────────────────────────────────────
const seedSites: Site[] = [
  {
    id: "1", code: "HQ-WH01", name: "HQ Warehouse", type: "warehouse",
    address: "1200 Industrial Blvd", city: "Los Angeles", state: "California", country: "United States",
    zipCode: "90001", phone: "+1 555-0100", email: "hq@fleet.io", manager: "James Thompson",
    status: "active", capacity: "5000 sq ft", operatingHours: "06:00 - 22:00",
  },
  {
    id: "2", code: "ND-DC02", name: "North Distribution", type: "distribution",
    address: "800 Logistics Ave", city: "Chicago", state: "Illinois", country: "United States",
    zipCode: "60601", phone: "+1 555-0200", email: "north@fleet.io", manager: "Sarah Nguyen",
    status: "active", capacity: "8000 sq ft", operatingHours: "00:00 - 23:59",
  },
  {
    id: "3", code: "SH-HB03", name: "South Hub", type: "hub",
    address: "345 Transport Way", city: "Houston", state: "Texas", country: "United States",
    zipCode: "77001", phone: "+1 555-0300", email: "south@fleet.io", manager: "Marcus Robinson",
    status: "active", capacity: "3500 sq ft", operatingHours: "07:00 - 20:00",
  },
  {
    id: "4", code: "EL-TM04", name: "East Logistics Park", type: "terminal",
    address: "90 Harbor Rd", city: "New York", state: "New York", country: "United States",
    zipCode: "10001", phone: "+1 555-0400", email: "east@fleet.io", manager: "Anita Patel",
    status: "inactive", capacity: "12000 sq ft", operatingHours: "05:00 - 23:00",
  },
  {
    id: "5", code: "WT-OF05", name: "West Terminal", type: "office",
    address: "567 Business Park Dr", city: "San Francisco", state: "California", country: "United States",
    zipCode: "94102", phone: "+1 555-0500", email: "west@fleet.io", manager: "David Chen",
    status: "active", capacity: "2000 sq ft", operatingHours: "08:00 - 18:00",
  },
];

// ─── Form state ───────────────────────────────────────────────────
const emptyForm = {
  code: "", name: "", type: "warehouse" as Site["type"],
  address: "", city: "", state: "", country: "United States", zipCode: "",
  phone: "", email: "", manager: "", capacity: "", operatingHours: "", status: true,
};

type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;
type ViewMode = "list" | "form";

const typeColors: Record<Site["type"], string> = {
  warehouse: "bg-blue-500/10 text-blue-600",
  distribution: "bg-purple-500/10 text-purple-600",
  terminal: "bg-amber-500/10 text-amber-600",
  hub: "bg-emerald-500/10 text-emerald-600",
  office: "bg-slate-500/10 text-slate-600",
};

// ─── Component ────────────────────────────────────────────────────
export default function SiteManagement() {
  const [sites, setSites] = useState<Site[]>(seedSites);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const filtered = sites.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.city.toLowerCase().includes(q);
  });

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setErrors({}); setView("form"); };
  const openEdit = (s: Site) => {
    setEditingId(s.id);
    setForm({
      code: s.code, name: s.name, type: s.type, address: s.address, city: s.city,
      state: s.state, country: s.country, zipCode: s.zipCode, phone: s.phone,
      email: s.email, manager: s.manager, capacity: s.capacity,
      operatingHours: s.operatingHours, status: s.status === "active",
    });
    setErrors({}); setView("form");
  };
  const goBack = () => setView("list");

  const handleDelete = (id: string) => {
    setSites((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Site removed" });
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.code.trim()) e.code = "Site code is required";
    else if (!editingId && sites.some((s) => s.code === form.code.trim())) e.code = "Code already exists";
    if (!form.name.trim()) e.name = "Site name is required";
    if (!form.city.trim()) e.city = "City is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingId) {
      setSites((prev) => prev.map((s) => s.id === editingId ? {
        ...s, code: form.code.trim(), name: form.name.trim(), type: form.type,
        address: form.address, city: form.city, state: form.state, country: form.country,
        zipCode: form.zipCode, phone: form.phone, email: form.email, manager: form.manager,
        capacity: form.capacity, operatingHours: form.operatingHours,
        status: form.status ? "active" : "inactive",
      } : s));
      toast({ title: "Site updated" });
    } else {
      setSites((prev) => [{
        id: crypto.randomUUID(), code: form.code.trim(), name: form.name.trim(), type: form.type,
        address: form.address, city: form.city, state: form.state, country: form.country,
        zipCode: form.zipCode, phone: form.phone, email: form.email, manager: form.manager,
        capacity: form.capacity, operatingHours: form.operatingHours,
        status: form.status ? "active" : "inactive",
      }, ...prev]);
      toast({ title: "Site created" });
    }
    setView("list");
  };

  // ── Form View ─────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors duration-150">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{editingId ? "Edit Site" : "Add Site"}</h1>
              <p className="text-xs text-muted-foreground">{editingId ? "Update site details" : "Register a new operational site"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors duration-150">Cancel</button>
            <button onClick={handleSave} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium">{editingId ? "Save Changes" : "Create Site"}</button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card">
          <div className="p-6 space-y-6">
            <Section title="Site Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Site Code" error={errors.code} required>
                  <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. HQ-WH01" className="h-9" />
                </Field>
                <Field label="Site Name" error={errors.name} required>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. HQ Warehouse" className="h-9" />
                </Field>
                <Field label="Site Type">
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as Site["type"] }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{SITE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Manager">
                  <Input value={form.manager} onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))} placeholder="Site manager name" className="h-9" />
                </Field>
                <Field label="Capacity">
                  <Input value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 5000 sq ft" className="h-9" />
                </Field>
                <Field label="Operating Hours">
                  <Input value={form.operatingHours} onChange={(e) => setForm((f) => ({ ...f, operatingHours: e.target.value }))} placeholder="e.g. 06:00 - 22:00" className="h-9" />
                </Field>
              </div>
            </Section>

            <Section title="Address">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-3">
                  <Field label="Street Address">
                    <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" className="h-9" />
                  </Field>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="City" error={errors.city} required>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" className="h-9" />
                </Field>
                <Field label="State">
                  <Select value={form.state || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, state: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select</SelectItem>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Country">
                  <Select value={form.country} onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Zip Code">
                  <Input value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} placeholder="Zip / Postal" className="h-9" />
                </Field>
              </div>
            </Section>

            <Section title="Contact & Status">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Phone">
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 555-0100" className="h-9" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="site@company.com" className="h-9" />
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

  // ── List View ─────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Site Management" subtitle="Manage operational sites and warehouses" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input placeholder="Search sites…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm focus-visible:ring-primary/30" />
        </div>
        <button onClick={openAdd} className="btn-gradient h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" /> Add Site
        </button>
      </div>

      <motion.div className="bg-card rounded-xl border border-border shadow-card overflow-hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Code</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Name</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Type</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">City</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Manager</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s, i) => (
              <TableRow key={s.id} className={cn("transition-colors duration-150", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}>
                <TableCell className="font-medium text-sm font-mono">{s.code}</TableCell>
                <TableCell className="text-sm">{s.name}</TableCell>
                <TableCell>
                  <span className={cn("inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full capitalize", typeColors[s.type])}>
                    {s.type}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{s.city}, {s.state}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{s.manager}</TableCell>
                <TableCell>
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", s.status === "active" ? "bg-success" : "bg-muted-foreground/40")} />
                    {s.status === "active" ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell><RowActions onEdit={() => openEdit(s)} onDelete={() => handleDelete(s.id)} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No sites found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────
function Section({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {error && <span className="text-[11px] text-destructive">{error}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
