import { useState, useMemo } from "react";
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
import { Search, Plus, ArrowLeft, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────
interface Site {
  id: string;
  code: string;
  description: string;
  active: boolean;
  tmsActive: boolean;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude: string;
  longitude: string;
}

const COUNTRIES = ["United States", "Canada", "Mexico", "United Kingdom", "Germany", "France"];
const STATES = ["California", "Texas", "New York", "Florida", "Illinois", "Pennsylvania", "Ohio"];

// ─── Seed data ────────────────────────────────────────────────────
const seedSites: Site[] = [
  {
    id: "1", code: "HQ-WH01", description: "HQ Warehouse", active: true, tmsActive: true,
    address1: "1200 Industrial Blvd", address2: "", city: "Los Angeles", state: "California",
    country: "United States", zipCode: "90001", latitude: "34.0522", longitude: "-118.2437",
  },
  {
    id: "2", code: "ND-DC02", description: "North Distribution Center", active: true, tmsActive: true,
    address1: "800 Logistics Ave", address2: "Suite 200", city: "Chicago", state: "Illinois",
    country: "United States", zipCode: "60601", latitude: "41.8781", longitude: "-87.6298",
  },
  {
    id: "3", code: "SH-HB03", description: "South Hub", active: true, tmsActive: false,
    address1: "345 Transport Way", address2: "", city: "Houston", state: "Texas",
    country: "United States", zipCode: "77001", latitude: "29.7604", longitude: "-95.3698",
  },
  {
    id: "4", code: "EL-TM04", description: "East Logistics Park", active: false, tmsActive: false,
    address1: "90 Harbor Rd", address2: "Dock 5", city: "New York", state: "New York",
    country: "United States", zipCode: "10001", latitude: "40.7128", longitude: "-74.0060",
  },
  {
    id: "5", code: "WT-OF05", description: "West Terminal Office", active: true, tmsActive: true,
    address1: "567 Business Park Dr", address2: "", city: "San Francisco", state: "California",
    country: "United States", zipCode: "94102", latitude: "37.7749", longitude: "-122.4194",
  },
];

// ─── Form state ───────────────────────────────────────────────────
const emptyForm = {
  code: "", description: "", active: true, tmsActive: true,
  address1: "", address2: "", city: "", state: "", country: "United States", zipCode: "",
  latitude: "", longitude: "",
};

type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;
type ViewMode = "list" | "form";

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
    return s.description.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.city.toLowerCase().includes(q);
  });

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setErrors({}); setView("form"); };
  const openEdit = (s: Site) => {
    setEditingId(s.id);
    setForm({
      code: s.code, description: s.description, active: s.active, tmsActive: s.tmsActive,
      address1: s.address1, address2: s.address2, city: s.city, state: s.state,
      country: s.country, zipCode: s.zipCode, latitude: s.latitude, longitude: s.longitude,
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
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const siteData: Omit<Site, "id"> = {
      code: form.code.trim(), description: form.description.trim(),
      active: form.active, tmsActive: form.tmsActive,
      address1: form.address1, address2: form.address2, city: form.city, state: form.state,
      country: form.country, zipCode: form.zipCode, latitude: form.latitude, longitude: form.longitude,
    };
    if (editingId) {
      setSites((prev) => prev.map((s) => s.id === editingId ? { ...s, ...siteData } : s));
      toast({ title: "Site updated" });
    } else {
      setSites((prev) => [{ id: crypto.randomUUID(), ...siteData }, ...prev]);
      toast({ title: "Site created" });
    }
    setView("list");
  };

  // Map URL
  const hasCoords = form.latitude.trim() !== "" && form.longitude.trim() !== "";
  const mapUrl = useMemo(() => {
    if (!hasCoords) return "";
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) return "";
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
  }, [form.latitude, form.longitude, hasCoords]);

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
            {/* Site Info */}
            <Section title="Site Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Site Code" error={errors.code} required>
                  <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. HQ-WH01" className="h-9" />
                </Field>
                <Field label="Site Description" error={errors.description} required>
                  <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. HQ Warehouse" className="h-9" />
                </Field>
                <Field label="Active">
                  <div className="flex items-center gap-3 h-9">
                    <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                    <span className="text-sm">{form.active ? "Active" : "Inactive"}</span>
                  </div>
                </Field>
                <Field label="TMS Active">
                  <div className="flex items-center gap-3 h-9">
                    <Switch checked={form.tmsActive} onCheckedChange={(v) => setForm((f) => ({ ...f, tmsActive: v }))} />
                    <span className="text-sm">{form.tmsActive ? "Active" : "Inactive"}</span>
                  </div>
                </Field>
              </div>
            </Section>

            {/* Address */}
            <Section title="Address">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Address 1">
                  <Input value={form.address1} onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))} placeholder="Street address" className="h-9" />
                </Field>
                <Field label="Address 2">
                  <Input value={form.address2} onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))} placeholder="Suite, unit, etc." className="h-9" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="City">
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
                <Field label="Zip / Postal Code">
                  <Input value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} placeholder="Zip / Postal" className="h-9" />
                </Field>
              </div>
            </Section>

            {/* Coordinates & Map */}
            <Section title="Location">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-4">
                  <Field label="Latitude">
                    <Input value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="e.g. 34.0522" className="h-9" />
                  </Field>
                  <Field label="Longitude">
                    <Input value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="e.g. -118.2437" className="h-9" />
                  </Field>
                </div>
                <div className="lg:col-span-2 rounded-lg border border-border overflow-hidden bg-secondary/30 min-h-[220px] flex items-center justify-center">
                  {mapUrl ? (
                    <iframe
                      title="Site location"
                      src={mapUrl}
                      className="w-full h-[220px] border-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <MapPin className="w-8 h-8 opacity-30" />
                      <span className="text-xs">Enter latitude & longitude to preview location</span>
                    </div>
                  )}
                </div>
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
      <PageHeader title="Site Management" subtitle="Manage operational sites and locations" />

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
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Description</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">City</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">TMS</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s, i) => (
              <TableRow key={s.id} className={cn("transition-colors duration-150", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}>
                <TableCell className="font-medium text-sm font-mono">{s.code}</TableCell>
                <TableCell className="text-sm">{s.description}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{s.city}{s.state ? `, ${s.state}` : ""}</TableCell>
                <TableCell>
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", s.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", s.active ? "bg-success" : "bg-muted-foreground/40")} />
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", s.tmsActive ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", s.tmsActive ? "bg-blue-500" : "bg-muted-foreground/40")} />
                    {s.tmsActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell><RowActions onEdit={() => openEdit(s)} onDelete={() => handleDelete(s.id)} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No sites found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
