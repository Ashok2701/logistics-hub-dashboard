import { useEffect, useMemo, useRef, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Search, ArrowLeft, MapPin, Pencil, RefreshCw, Loader2, Locate } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { siteApi, type Site } from "@/lib/fleetApi";

// ─── Form ─────────────────────────────────────────────────────────
type FormState = {
  latitude: string;
  longitude: string;
  tmsFlag: boolean;
  remarks: string;
};

const emptyForm: FormState = {
  latitude: "", longitude: "", tmsFlag: false, remarks: "",
};

type ViewMode = "list" | "form";

// ─── Component ────────────────────────────────────────────────────
export default function SiteManagement() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<ViewMode>("list");
  const [editing, setEditing] = useState<Site | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [activeSection, setActiveSection] = useState<string>("general");

  useEffect(() => {
    if (view !== "form") return;
    const ids = ["general", "address", "comments"];
    const els = ids
      .map((id) => document.getElementById(`section-${id}`))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;

    // The app's scroll container is <main className="overflow-y-auto"> in AppLayout
    const scrollRoot =
      (els[0].closest("main") as HTMLElement | null) ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.id.replace("section-", "");
          setActiveSection(id);
        }
      },
      {
        root: scrollRoot,
        rootMargin: "-130px 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [view, editing]);

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
    return sites.filter((s) => {
      const matchesSearch =
        (s.siteName ?? "").toLowerCase().includes(q) ||
        (s.siteCode ?? "").toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? !!s.tmsFlag : !s.tmsFlag);
      return matchesSearch && matchesStatus;
    });
  }, [sites, search, statusFilter]);
  const sort = useSortable(filtered);
  const sorted = sort.sorted;

  const openEdit = (s: Site) => {
    setEditing(s);
    setForm({
      latitude: s.latitude != null ? String(s.latitude) : "",
      longitude: s.longitude != null ? String(s.longitude) : "",
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
        tmsFlag: form.tmsFlag,
        remarks: form.remarks || null,
        updatedBy: (() => { try { return JSON.parse(localStorage.getItem("vanguard-user") || "{}").username || "admin"; } catch { return "admin"; } })(),
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

  // ── Geocode via OpenStreetMap Nominatim ──────────────────────────
  const handleLocate = async () => {
    if (!editing) return;
    const parts = [
      editing.addressLine1, editing.addressLine2, editing.addressLine3,
      editing.city, editing.stateCode, editing.postalCode,
      editing.countryName || editing.countryCode,
    ].filter((p) => p && String(p).trim() !== "");
    if (parts.length === 0) {
      toast({ title: "No address available", description: "Cannot locate without address details.", variant: "destructive" });
      return;
    }
    setLocating(true);
    try {
      const query = encodeURIComponent(parts.join(", "));
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        toast({ title: "Location not found", description: "No coordinates found for this address.", variant: "destructive" });
        return;
      }
      const { lat, lon } = data[0];
      setForm((f) => ({ ...f, latitude: String(lat), longitude: String(lon) }));
      toast({ title: "Coordinates updated", description: `${lat}, ${lon}` });
    } catch (err: any) {
      toast({ title: "Failed to locate", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setLocating(false);
    }
  };

  // ── Form View ─────────────────────────────────────────────────────
  if (view === "form" && editing) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        {/* Sticky header + tab nav (always visible while scrolling) */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between py-4">
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
              <button onClick={handleLocate} disabled={locating || saving} className="h-9 px-4 rounded-lg text-sm font-medium border border-primary text-primary hover:bg-primary/10 inline-flex items-center gap-2 disabled:opacity-50">
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Locate className="w-4 h-4" />} Locate
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 h-11">
            {[
              { id: "general", label: "General" },
              { id: "address", label: "Address" },
              { id: "comments", label: "Comments" },
            ].map((t) => {
              const active = activeSection === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    const el = document.getElementById(`section-${t.id}`);
                    if (el) {
                      setActiveSection(t.id);
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className={cn(
                    "relative h-9 px-4 rounded-md text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  {t.label}
                  {active && (
                    <motion.span
                      layoutId="active-section-underline"
                      className="absolute left-2 right-2 -bottom-[5px] h-0.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card mt-6">
          <div className="p-6 space-y-8 scroll-smooth">
            <section id="section-general" className="scroll-mt-40">

              <Section title="Site Information">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 sm:col-span-2">
                    <Field label="Site Code"><ReadOnlyInput value={editing.siteCode} mono /></Field>
                  </div>
                  <div className="col-span-12 sm:col-span-2">
                    <Field label="Short Name"><ReadOnlyInput value={editing.shortName ?? ""} /></Field>
                  </div>
                  <div className="col-span-12 sm:col-span-5">
                    <Field label="Description"><ReadOnlyInput value={editing.siteName ?? ""} /></Field>
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <Field label="TMS Flag">
                      <div className="flex items-center gap-3 h-9">
                        <Switch checked={form.tmsFlag} onCheckedChange={(v) => setForm((f) => ({ ...f, tmsFlag: v }))} />
                        <span className="text-sm text-primary font-medium">{form.tmsFlag ? "Active" : "Inactive"}</span>
                      </div>
                    </Field>
                  </div>
                </div>
              </Section>
            </section>

            <Separator />

            <section id="section-address" className="scroll-mt-40">
              <Section title="Address">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Address details */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-4">
                      <Field label="Address Code"><ReadOnlyInput value={editing.addressCode ?? ""} mono /></Field>
                    </div>
                    <div className="col-span-12 sm:col-span-8">
                      <Field label="Address Description"><ReadOnlyInput value={editing.addressDescription ?? ""} /></Field>
                    </div>
                    <div className="col-span-12">
                      <Field label="Address Line 1"><ReadOnlyInput value={editing.addressLine1 ?? ""} /></Field>
                    </div>
                    <div className="col-span-12">
                      <Field label="Address Line 2"><ReadOnlyInput value={editing.addressLine2 ?? ""} /></Field>
                    </div>
                    <div className="col-span-12">
                      <Field label="Address Line 3"><ReadOnlyInput value={editing.addressLine3 ?? ""} /></Field>
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Field label="City"><ReadOnlyInput value={editing.city ?? ""} /></Field>
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Field label="State"><ReadOnlyInput value={editing.stateCode ?? ""} mono /></Field>
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Field label="Postal Code"><ReadOnlyInput value={editing.postalCode ?? ""} mono /></Field>
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Field label="Country">
                        <ReadOnlyInput
                          value={
                            editing.countryName
                              ? `${editing.countryName}${editing.countryCode ? ` (${editing.countryCode})` : ""}`
                              : editing.countryCode ?? ""
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Latitude + Longitude + Map */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Latitude">
                        <Input value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="e.g. 34.0522" className="h-9" />
                      </Field>
                      <Field label="Longitude">
                        <Input value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="e.g. -118.2437" className="h-9" />
                      </Field>
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden bg-secondary/30 h-[340px] flex items-center justify-center">
                      {mapUrl ? (
                        <iframe title="Site location" src={mapUrl} className="w-full h-full border-0" loading="lazy" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <MapPin className="w-10 h-10 opacity-30" />
                          <span className="text-xs">Click <span className="text-primary font-medium">Locate</span> to plot the site on the map</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Section>
            </section>

            <Separator />

            <section id="section-comments" className="scroll-mt-40">
              <Section title="Comments">
                <Textarea value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Notes / remarks about this site…" rows={6} />
              </Section>
            </section>
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
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">TMS Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
              <SelectTrigger className="h-9 w-36 rounded-lg bg-secondary/50 border-border/50 text-sm">
                <SelectValue placeholder="TMS Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button onClick={loadSites} disabled={loading} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary inline-flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>


      <motion.div className="bg-card rounded-xl border border-border shadow-card overflow-hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <SortableTableHead sortKey="siteCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70" style={{ width: "16.67%" }}>Code</SortableTableHead>
              <SortableTableHead sortKey="siteName" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70" style={{ width: "41.67%" }}>Name</SortableTableHead>
              <SortableTableHead sortKey="city" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell" style={{ width: "16.67%" }}>City</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell" style={{ width: "16.67%" }}>Coordinates</TableHead>
              <SortableTableHead sortKey="tmsFlag" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70" style={{ width: "8.33%" }}>TMS</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right" style={{ width: "8.33%" }}>Actions</TableHead>
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

function ReadOnlyInput({ value, mono }: { value: string; mono?: boolean }) {
  return (
    <Input value={value} readOnly className={cn("h-9 bg-secondary/40 text-foreground", mono && "font-mono")} />
  );
}
