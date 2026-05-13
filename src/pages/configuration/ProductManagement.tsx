import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/shared/MetricCard";
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
import { Search, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: "general" | "hazardous" | "perishable" | "fragile" | "bulk" | "liquid";
  unit: string;
  weight: string;
  dimensions: string;
  description: string;
  handlingInstructions: string;
  temperatureRange: string;
  stackable: boolean;
  status: "active" | "inactive";
}

const CATEGORIES = ["general", "hazardous", "perishable", "fragile", "bulk", "liquid"] as const;
const UNITS = ["Kg", "Lbs", "Tons", "Litres", "Gallons", "Pallets", "Boxes", "Units"];

const seedProducts: Product[] = [
  { id: "1", sku: "PRD-0001", name: "Standard Pallet Goods", category: "general", unit: "Pallets", weight: "800 Kg", dimensions: "120×80×100 cm", description: "Standard palletized cargo for general transport", handlingInstructions: "Fork-lift required", temperatureRange: "N/A", stackable: true, status: "active" },
  { id: "2", sku: "PRD-0002", name: "Chilled Produce", category: "perishable", unit: "Boxes", weight: "25 Kg", dimensions: "60×40×30 cm", description: "Fresh produce requiring cold chain", handlingInstructions: "Do not stack more than 5", temperatureRange: "2°C – 8°C", stackable: true, status: "active" },
  { id: "3", sku: "PRD-0003", name: "Industrial Solvent", category: "hazardous", unit: "Litres", weight: "200 Kg", dimensions: "55 gal drum", description: "Class 3 flammable liquid", handlingInstructions: "Hazmat certified handler only", temperatureRange: "Below 30°C", stackable: false, status: "active" },
  { id: "4", sku: "PRD-0004", name: "Electronics - Displays", category: "fragile", unit: "Units", weight: "12 Kg", dimensions: "140×90×20 cm", description: "LCD display panels", handlingInstructions: "Fragile – keep upright", temperatureRange: "N/A", stackable: false, status: "inactive" },
  { id: "5", sku: "PRD-0005", name: "Gravel Aggregate", category: "bulk", unit: "Tons", weight: "20 Tons", dimensions: "Loose bulk", description: "Construction grade gravel", handlingInstructions: "Tipper truck required", temperatureRange: "N/A", stackable: false, status: "active" },
];

const emptyForm = {
  sku: "", name: "", category: "general" as Product["category"], unit: "Kg",
  weight: "", dimensions: "", description: "", handlingInstructions: "",
  temperatureRange: "", stackable: false, status: true,
};
type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;
type ViewMode = "list" | "form";

const catColors: Record<Product["category"], string> = {
  general: "bg-slate-500/10 text-slate-600",
  hazardous: "bg-red-500/10 text-red-600",
  perishable: "bg-cyan-500/10 text-cyan-600",
  fragile: "bg-amber-500/10 text-amber-600",
  bulk: "bg-stone-500/10 text-stone-600",
  liquid: "bg-blue-500/10 text-blue-600",
};

export default function ProductManagement() {
  const [items, setItems] = useState<Product[]>(seedProducts);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.includes(q);
  });

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setErrors({}); setView("form"); };
  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ sku: p.sku, name: p.name, category: p.category, unit: p.unit, weight: p.weight, dimensions: p.dimensions, description: p.description, handlingInstructions: p.handlingInstructions, temperatureRange: p.temperatureRange, stackable: p.stackable, status: p.status === "active" });
    setErrors({}); setView("form");
  };
  const goBack = () => setView("list");
  const handleDelete = (id: string) => { setItems((p) => p.filter((i) => i.id !== id)); toast({ title: "Product removed" }); };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.sku.trim()) e.sku = "SKU is required";
    else if (!editingId && items.some((p) => p.sku === form.sku.trim())) e.sku = "SKU already exists";
    if (!form.name.trim()) e.name = "Product name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingId) {
      setItems((p) => p.map((i) => i.id === editingId ? { ...i, ...form, sku: form.sku.trim(), name: form.name.trim(), status: form.status ? "active" : "inactive" } : i));
      toast({ title: "Product updated" });
    } else {
      setItems((p) => [{ id: crypto.randomUUID(), ...form, sku: form.sku.trim(), name: form.name.trim(), status: form.status ? "active" : "inactive" }, ...p]);
      toast({ title: "Product created" });
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
              <h1 className="text-lg font-semibold text-foreground">{editingId ? "Edit Product" : "Add Product"}</h1>
              <p className="text-xs text-muted-foreground">{editingId ? "Update product details" : "Register a new product"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors duration-150">Cancel</button>
            <button onClick={handleSave} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium">{editingId ? "Save Changes" : "Create Product"}</button>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card">
          <div className="p-6 space-y-6">
            <Section title="Product Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="SKU" error={errors.sku} required><Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="e.g. PRD-0001" className="h-9" /></Field>
                <Field label="Product Name" error={errors.name} required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Product name" className="h-9" /></Field>
                <Field label="Category">
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as Product["category"] }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Unit">
                  <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Weight"><Input value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} placeholder="e.g. 800 Kg" className="h-9" /></Field>
                <Field label="Dimensions"><Input value={form.dimensions} onChange={(e) => setForm((f) => ({ ...f, dimensions: e.target.value }))} placeholder="e.g. 120×80×100 cm" className="h-9" /></Field>
              </div>
            </Section>

            <Section title="Handling & Storage">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Temperature Range"><Input value={form.temperatureRange} onChange={(e) => setForm((f) => ({ ...f, temperatureRange: e.target.value }))} placeholder="e.g. 2°C – 8°C or N/A" className="h-9" /></Field>
                <Field label="Stackable">
                  <div className="flex items-center gap-3 h-9">
                    <Switch checked={form.stackable} onCheckedChange={(v) => setForm((f) => ({ ...f, stackable: v }))} />
                    <span className="text-sm">{form.stackable ? "Yes" : "No"}</span>
                  </div>
                </Field>
                <Field label="Status">
                  <div className="flex items-center gap-3 h-9">
                    <Switch checked={form.status} onCheckedChange={(v) => setForm((f) => ({ ...f, status: v }))} />
                    <span className="text-sm">{form.status ? "Active" : "Inactive"}</span>
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Product description" rows={3} className="resize-none" /></Field>
                <Field label="Handling Instructions"><Textarea value={form.handlingInstructions} onChange={(e) => setForm((f) => ({ ...f, handlingInstructions: e.target.value }))} placeholder="Special handling notes" rows={3} className="resize-none" /></Field>
              </div>
            </Section>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <PageHeader title="Products" subtitle="Manage product catalog for transport" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm focus-visible:ring-primary/30" />
        </div>
        <button onClick={openAdd} className="btn-gradient h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 flex-shrink-0"><Plus className="w-4 h-4" /> Add Product</button>
      </div>
      <motion.div className="bg-card rounded-xl border border-border shadow-card overflow-hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">SKU</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Name</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Category</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Weight</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Unit</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p, i) => (
              <TableRow key={p.id} className={cn("transition-colors duration-150", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}>
                <TableCell className="font-medium text-sm font-mono">{p.sku}</TableCell>
                <TableCell className="text-sm">{p.name}</TableCell>
                <TableCell><span className={cn("inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full capitalize", catColors[p.category])}>{p.category}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{p.weight}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{p.unit}</TableCell>
                <TableCell>
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", p.status === "active" ? "bg-success" : "bg-muted-foreground/40")} />{p.status === "active" ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell><RowActions onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No products found</TableCell></TableRow>}
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
