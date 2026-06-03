import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/shared/MetricCard";
import { SortableTableHead } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Search, ArrowLeft, MapPin, Pencil, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { siteApi, type Site } from "@/lib/fleetApi";

// ─── Form ─────────────────────────────────────────────────────────
type FormState = {
  latitude: string;
  longitude: string;
  workingStartTime: string;
  workingEndTime: string;
  loadingDockCount: string;
  maxVehicleCapacity: string;
  tmsFlag: boolean;
  remarks: string;
};

const emptyForm: FormState = {
  latitude: "", longitude: "", workingStartTime: "", workingEndTime: "",
  loadingDockCount: "", maxVehicleCapacity: "", tmsFlag: false, remarks: "",
};

type ViewMode = "list" | "form";

// ─── Component ────────────────────────────────────────────────────
export default function SiteManagement() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [editing, setEditing] = useState<Site | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadSites = async () => {
    setLoading(true);
    try {
      const data = await siteApi.list();
      setSites(data ?? []);
    } catch (err: any) {
      toast({ title: "Failed to load sites", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSites(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sites.filter((s) =>
      (s.siteName ?? "").toLowerCase().includes(q) ||
      (s.siteCode ?? "").toLowerCase().includes(q) ||
      (s.city ?? "").toLowerCase().includes(q),
    );
  }, [sites, search]);
  const sort = useSortable(filtered);
  const sorted = sort.sorted;

  const openEdit = (s: Site) => {
    setEditing(s);
    setForm({
      latitude: s.latitude != null ? String(s.latitude) : "",
      longitude: s.longitude != null ? String(s.longitude) : "",
      workingStartTime: s.workingStartTime ?? "",
      workingEndTime: s.workingEndTime ?? "",
      loadingDockCount: s.loadingDockCount != null ? String(s.loadingDockCount) : "",
      maxVehicleCapacity: s.maxVehicleCapacity != null ? String(s.maxVehicleCapacity) : "",
      tmsFlag: !!s.tmsFlag,
      remarks: s.remarks ?? "",
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
        workingStartTime: form.workingStartTime || null,
        workingEndTime: form.workingEndTime || null,
        loadingDockCount: form.loadingDockCount === "" ? null : parseInt(form.loadingDockCount, 10),
        maxVehicleCapacity: form.maxVehicleCapacity === "" ? null : parseInt(form.maxVehicleCapacity, 10),
        tmsFlag: form.tmsFlag,
        remarks: form.remarks || null,
        updatedBy: localStorage.getItem("vanguard-user") || "admin",
      };
      const updated = await siteApi.update(editing.siteCode, payload);
      setSites((prev) => prev.map((s) => s.siteCode === editing.siteCode ? { ...s, ...updated, ...payload } as Site : s));
      toast({ title: "Site updated" });
      goBack();
    } catch (err: any) {
      toast({ title: "Failed to update site", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
  if (view === "form" && editing) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors duration-150">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Edit Site</h1>
              <p className="text-xs text-muted-foreground">{editing.siteCode} — {editing.siteName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goBack} disabled={saving} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors duration-150 disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save Changes
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card">
          <div className="p-6 space-y-6">
            <Section title="Site Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Site Code">
                  <Input value={editing.siteCode} readOnly className="h-9 bg-secondary/40 font-mono" />
                </Field>
                <Field label="Short Name">
                  <Input value={editing.shortName ?? ""} readOnly className="h-9 bg-secondary/40" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description">
                    <Input value={editing.siteName ?? ""} readOnly className="h-9 bg-secondary/40" />
                  </Field>
                </div>
                <Field label="TMS Active">
                  <div className="flex items-center gap-3 h-9">
                    <Switch checked={form.tmsFlag} onCheckedChange={(v) => setForm((f) => ({ ...f, tmsFlag: v }))} />
                    <span className="text-sm">{form.tmsFlag ? "Active" : "Inactive"}</span>
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Address">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Address Code">
                  <Input value={editing.addressCode ?? ""} readOnly className="h-9 bg-secondary/40 font-mono" />
                </Field>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Address Description">
                    <Input value={editing.addressDescription ?? ""} readOnly className="h-9 bg-secondary/40" />
                  </Field>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <Field label="Address Line 1">
                    <Input value={editing.addressLine1 ?? ""} readOnly className="h-9 bg-secondary/40" />
                  </Field>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <Field label="Address Line 2">
                    <Input value={editing.addressLine2 ?? ""} readOnly className="h-9 bg-secondary/40" />
                  </Field>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <Field label="Address Line 3">
                    <Input value={editing.addressLine3 ?? ""} readOnly className="h-9 bg-secondary/40" />
                  </Field>
                </div>
                <Field label="City">
                  <Input value={editing.city ?? ""} readOnly className="h-9 bg-secondary/40" />
                </Field>
                <Field label="State Code">
                  <Input value={editing.stateCode ?? ""} readOnly className="h-9 bg-secondary/40 font-mono" />
                </Field>
                <Field label="Postal Code">
                  <Input value={editing.postalCode ?? ""} readOnly className="h-9 bg-secondary/40 font-mono" />
                </Field>
                <Field label="Country">
                  <Input
                    value={
                      editing.countryName
                        ? `${editing.countryName}${editing.countryCode ? ` (${editing.countryCode})` : ""}`
                        : editing.countryCode ?? ""
                    }
                    readOnly
                    className="h-9 bg-secondary/40"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Operations">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Working Start Time">
                  <Input type="time" value={form.workingStartTime} onChange={(e) => setForm((f) => ({ ...f, workingStartTime: e.target.value }))} className="h-9" />
                </Field>
                <Field label="Working End Time">
                  <Input type="time" value={form.workingEndTime} onChange={(e) => setForm((f) => ({ ...f, workingEndTime: e.target.value }))} className="h-9" />
                </Field>
                <Field label="Loading Dock Count">
                  <Input type="number" min={0} value={form.loadingDockCount} onChange={(e) => setForm((f) => ({ ...f, loadingDockCount: e.target.value }))} className="h-9" />
                </Field>
                <Field label="Max Vehicle Capacity">
                  <Input type="number" min={0} value={form.maxVehicleCapacity} onChange={(e) => setForm((f) => ({ ...f, maxVehicleCapacity: e.target.value }))} className="h-9" />
                </Field>
              </div>
            </Section>

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
                    <iframe title="Site location" src={mapUrl} className="w-full h-[220px] border-0" loading="lazy" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <MapPin className="w-8 h-8 opacity-30" />
                      <span className="text-xs">Enter latitude & longitude to preview location</span>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Remarks">
              <Textarea value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Notes about this site…" rows={3} />
            </Section>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Site" subtitle="Manage operational sites and locations" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input placeholder="Search sites…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm focus-visible:ring-primary/30" />
        </div>
        <button onClick={loadSites} disabled={loading} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary inline-flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      <motion.div className="bg-card rounded-xl border border-border shadow-card overflow-hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <SortableTableHead sortKey="siteCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Code</SortableTableHead>
              <SortableTableHead sortKey="siteName" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Name</SortableTableHead>
              <SortableTableHead sortKey="city" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">City</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Coordinates</TableHead>
              <SortableTableHead sortKey="tmsFlag" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">TMS</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading sites…
              </TableCell></TableRow>
            ) : sorted.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No sites found</TableCell></TableRow>
            ) : sorted.map((s, i) => (
              <TableRow key={s.siteCode} className={cn("transition-colors duration-150", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}>
                <TableCell className="font-medium text-sm font-mono">{s.siteCode}</TableCell>
                <TableCell className="text-sm">{s.siteName}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{s.city ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono hidden lg:table-cell">
                  {s.latitude != null && s.longitude != null ? `${s.latitude}, ${s.longitude}` : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.tmsFlag ? "Active" : "Inactive"} variant={s.tmsFlag ? "primary" : "muted"} />
                </TableCell>
                <TableCell className="text-right">
                  <button onClick={() => openEdit(s)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Edit site">
                    <Pencil className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

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
