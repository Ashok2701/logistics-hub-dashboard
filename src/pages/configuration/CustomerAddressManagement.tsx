import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/shared/MetricCard";
import { SortableTableHead } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowLeft, Pencil, RefreshCw, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  customerAddressApi, vehicleCategoryApi, driverApi,
  type CustomerAddress, type CustomerAddressTms,
  type VehicleCategory, type Driver,
} from "@/lib/fleetApi";

function currentUser(): string {
  try { return JSON.parse(localStorage.getItem("vanguard-user") || "{}").username || "admin"; }
  catch { return "admin"; }
}

const emptyTms: CustomerAddressTms = {
  anyTimeWindow: false, anyVehicleCategory: false, anyDriver: false,
  timeWindows: [], vehicles: [], drivers: [],
};

const isTmsActive = (t?: CustomerAddressTms | null) => {
  if (!t) return false;
  return t.anyTimeWindow || t.anyVehicleCategory || t.anyDriver ||
    (t.timeWindows?.length ?? 0) > 0 || (t.vehicles?.length ?? 0) > 0 || (t.drivers?.length ?? 0) > 0;
};

export default function CustomerAddressManagement() {
  const [items, setItems] = useState<CustomerAddress[]>([]);
  const [tmsMap, setTmsMap] = useState<Record<string, CustomerAddressTms>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingTms, setLoadingTms] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [tms, setTms] = useState<CustomerAddressTms>(emptyTms);

  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [list, cats, drs] = await Promise.all([
        customerAddressApi.list(),
        vehicleCategoryApi.list().catch(() => []),
        driverApi.list().catch(() => []),
      ]);
      setItems(list ?? []);
      setCategories(cats ?? []);
      setDrivers(drs ?? []);
    } catch (err: any) {
      toast({ title: "Failed to load addresses", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((a) => {
      const m = (a.addressCode ?? "").toLowerCase().includes(q) ||
                (a.customerCode ?? "").toLowerCase().includes(q) ||
                (a.addressDescription ?? "").toLowerCase().includes(q) ||
                (a.city ?? "").toLowerCase().includes(q);
      const active = isTmsActive(tmsMap[a.addressCode]);
      const s = statusFilter === "all" || (statusFilter === "active" ? active : !active);
      return m && s;
    });
  }, [items, search, statusFilter, tmsMap]);
  const sort = useSortable(filtered);

  const openEdit = async (a: CustomerAddress) => {
    setEditing(a);
    setTms(emptyTms);
    setView("form");
    setLoadingTms(true);
    try {
      const data = await customerAddressApi.getTms(a.addressCode);
      setTms({
        anyTimeWindow: !!data?.anyTimeWindow,
        anyVehicleCategory: !!data?.anyVehicleCategory,
        anyDriver: !!data?.anyDriver,
        timeWindows: data?.timeWindows ?? [],
        vehicles: data?.vehicles ?? [],
        drivers: data?.drivers ?? [],
      });
    } catch (err: any) {
      toast({ title: "Failed to load TMS data", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setLoadingTms(false); }
  };

  const goBack = () => { setView("list"); setEditing(null); };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        anyTimeWindow: tms.anyTimeWindow,
        anyVehicleCategory: tms.anyVehicleCategory,
        anyDriver: tms.anyDriver,
        timeWindows: tms.timeWindows.map((t, i) => ({
          fromTime: t.fromTime, toTime: t.toTime,
          displayOrder: t.displayOrder ?? i,
        })),
        vehicles: tms.vehicles.map((v) => ({ vehicleCategoryCode: v.vehicleCategoryCode })),
        drivers: tms.drivers.map((d) => ({ driverId: d.driverId })),
        updatedBy: currentUser(),
      };
      const updated = await customerAddressApi.updateTms(editing.addressCode, payload);
      setTmsMap((m) => ({ ...m, [editing.addressCode]: updated ?? payload as any }));
      toast({ title: "Address TMS data saved" });
      goBack();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ── Grid mutators ──
  const addTW = () => setTms((t) => ({ ...t, timeWindows: [...t.timeWindows, { fromTime: "09:00", toTime: "12:00", displayOrder: t.timeWindows.length }] }));
  const updTW = (i: number, k: "fromTime" | "toTime", v: string) => setTms((t) => ({ ...t, timeWindows: t.timeWindows.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  const delTW = (i: number) => setTms((t) => ({ ...t, timeWindows: t.timeWindows.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, displayOrder: idx })) }));

  const addV = () => setTms((t) => ({ ...t, vehicles: [...t.vehicles, { vehicleCategoryCode: categories[0]?.categoryCode ?? "" }] }));
  const updV = (i: number, v: string) => setTms((t) => ({ ...t, vehicles: t.vehicles.map((r, idx) => idx === i ? { ...r, vehicleCategoryCode: v } : r) }));
  const delV = (i: number) => setTms((t) => ({ ...t, vehicles: t.vehicles.filter((_, idx) => idx !== i) }));

  const addD = () => setTms((t) => ({ ...t, drivers: [...t.drivers, { driverId: drivers[0]?.driverId ?? "" }] }));
  const updD = (i: number, v: string) => setTms((t) => ({ ...t, drivers: t.drivers.map((r, idx) => idx === i ? { ...r, driverId: v } : r) }));
  const delD = (i: number) => setTms((t) => ({ ...t, drivers: t.drivers.filter((_, idx) => idx !== i) }));

  if (view === "form" && editing) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50"><ArrowLeft className="w-4 h-4" /></button>
            <div>
              <h1 className="text-lg font-semibold">Edit Customer Address</h1>
              <p className="text-xs text-muted-foreground">{editing.addressCode} — {editing.addressDescription ?? editing.customerCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goBack} disabled={saving} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || loadingTms} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save</button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-8">
          <Section title="Address Information (from X3)">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Address Code"><ReadOnly value={editing.addressCode} mono /></Field>
              <Field label="Customer Code"><ReadOnly value={editing.customerCode ?? ""} mono /></Field>
              <Field label="Description"><ReadOnly value={editing.addressDescription ?? ""} /></Field>
              <Field label="Address Line 1"><ReadOnly value={editing.addressLine1 ?? ""} /></Field>
              <Field label="Address Line 2"><ReadOnly value={editing.addressLine2 ?? ""} /></Field>
              <Field label="Address Line 3"><ReadOnly value={editing.addressLine3 ?? ""} /></Field>
              <Field label="City"><ReadOnly value={editing.city ?? ""} /></Field>
              <Field label="State"><ReadOnly value={editing.stateCode ?? ""} mono /></Field>
              <Field label="Postal Code"><ReadOnly value={editing.postalCode ?? ""} mono /></Field>
              <Field label="Country"><ReadOnly value={editing.countryName ? `${editing.countryName} (${editing.countryCode ?? ""})` : (editing.countryCode ?? "")} /></Field>
              <Field label="Phone"><ReadOnly value={editing.phone ?? ""} /></Field>
              <Field label="Email"><ReadOnly value={editing.email ?? ""} /></Field>
            </div>
          </Section>

          <Separator />

          {loadingTms ? (
            <div className="py-12 text-center text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading TMS data…</div>
          ) : (
            <>
              <Section title="Time Windows">
                <div className="flex items-center gap-3 mb-3">
                  <Switch checked={tms.anyTimeWindow} onCheckedChange={(v) => setTms((t) => ({ ...t, anyTimeWindow: v }))} />
                  <span className="text-sm">Allow any time window (ignore grid)</span>
                </div>
                <div className={cn("space-y-2", tms.anyTimeWindow && "opacity-50 pointer-events-none")}>
                  {tms.timeWindows.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5 sm:col-span-4"><Field label="From (HH:MM)"><Input value={r.fromTime} onChange={(e) => updTW(i, "fromTime", e.target.value)} className="h-9" placeholder="09:00" /></Field></div>
                      <div className="col-span-5 sm:col-span-4"><Field label="To (HH:MM)"><Input value={r.toTime} onChange={(e) => updTW(i, "toTime", e.target.value)} className="h-9" placeholder="12:00" /></Field></div>
                      <div className="col-span-2"><button onClick={() => delTW(i)} className="h-9 w-9 inline-flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button></div>
                    </div>
                  ))}
                  <button onClick={addTW} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Time Window</button>
                </div>
              </Section>

              <Separator />

              <Section title="Vehicle Categories">
                <div className="flex items-center gap-3 mb-3">
                  <Switch checked={tms.anyVehicleCategory} onCheckedChange={(v) => setTms((t) => ({ ...t, anyVehicleCategory: v }))} />
                  <span className="text-sm">Allow any vehicle category (ignore grid)</span>
                </div>
                <div className={cn("space-y-2", tms.anyVehicleCategory && "opacity-50 pointer-events-none")}>
                  {tms.vehicles.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-10 sm:col-span-6">
                        <Field label="Vehicle Category">
                          <Select value={r.vehicleCategoryCode} onValueChange={(v) => updV(i, v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>{categories.map((c) => <SelectItem key={c.categoryCode} value={c.categoryCode}>{c.categoryCode} — {c.description}</SelectItem>)}</SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <div className="col-span-2"><button onClick={() => delV(i)} className="h-9 w-9 inline-flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button></div>
                    </div>
                  ))}
                  <button onClick={addV} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Vehicle Category</button>
                </div>
              </Section>

              <Separator />

              <Section title="Drivers">
                <div className="flex items-center gap-3 mb-3">
                  <Switch checked={tms.anyDriver} onCheckedChange={(v) => setTms((t) => ({ ...t, anyDriver: v }))} />
                  <span className="text-sm">Allow any driver (ignore grid)</span>
                </div>
                <div className={cn("space-y-2", tms.anyDriver && "opacity-50 pointer-events-none")}>
                  {tms.drivers.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-10 sm:col-span-6">
                        <Field label="Driver">
                          <Select value={r.driverId} onValueChange={(v) => updD(i, v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select driver" /></SelectTrigger>
                            <SelectContent>{drivers.map((d) => <SelectItem key={d.driverId} value={d.driverId}>{d.driverId} — {d.driverName}</SelectItem>)}</SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <div className="col-span-2"><button onClick={() => delD(i)} className="h-9 w-9 inline-flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button></div>
                    </div>
                  ))}
                  <button onClick={addD} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Driver</button>
                </div>
              </Section>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <PageHeader title="Customer Addresses" subtitle="Manage delivery point TMS configuration" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input placeholder="Search addresses…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm" />
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
              <SortableTableHead sortKey="addressCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Address</SortableTableHead>
              <SortableTableHead sortKey="customerCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Customer</SortableTableHead>
              <SortableTableHead sortKey="addressDescription" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Description</SortableTableHead>
              <SortableTableHead sortKey="city" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">City</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">TMS</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading addresses…</TableCell></TableRow>
            ) : sort.sorted.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No addresses found</TableCell></TableRow>
            ) : sort.sorted.map((a, i) => {
              const active = isTmsActive(tmsMap[a.addressCode]);
              return (
                <TableRow key={a.addressCode} className={cn("transition-colors", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}>
                  <TableCell className="font-medium text-sm font-mono">{a.addressCode}</TableCell>
                  <TableCell className="text-sm font-mono">{a.customerCode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{a.addressDescription ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{a.city ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={active ? "Active" : "Inactive"} variant={active ? "primary" : "muted"} /></TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => openEdit(a)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="w-4 h-4" /></button>
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
