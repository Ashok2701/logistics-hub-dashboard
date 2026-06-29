import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
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
import { Search, ArrowLeft, Pencil, RefreshCw, Loader2, Plus, Trash2, MapPin, Locate } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  customerApi, vehicleCategoryApi, driverApi,
  type Customer, type CustomerAddress, type AddressTimeWindow,
  type VehicleCategory, type Driver,
} from "@/lib/fleetApi";

type InfoForm = { serviceTime: string; waitingTime: string; };
const emptyInfo: InfoForm = { serviceTime: "", waitingTime: "" };

type AddrForm = {
  anyTimeWindow: boolean;
  anyVehicleCategory: boolean;
  anyDriver: boolean;
  timeWindows: AddressTimeWindow[];
  vehicles: { vehicleCategoryCode: string }[];
  drivers: { driverId: string }[];
};
const emptyAddr: AddrForm = {
  anyTimeWindow: false, anyVehicleCategory: false, anyDriver: false,
  timeWindows: [], vehicles: [], drivers: [],
};

const isTmsActive = (c: Customer) =>
  c.latitude != null || c.longitude != null || !!c.serviceTime || !!c.waitingTime;

const addrLabel = (a: CustomerAddress) =>
  a.addressDescription ?? a.description ?? a.city ?? a.addressCode;

const isDefault = (a: CustomerAddress) => !!(a.defaultAddress ?? a.isDefault);

function currentUser(): string {
  try { return JSON.parse(localStorage.getItem("vanguard-user") || "{}").username || "admin"; }
  catch { return "admin"; }
}

export default function CustomerManagement() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [view, setView] = useState<"list" | "form">("list");
  const [detail, setDetail] = useState<Customer | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [info, setInfo] = useState<InfoForm>(emptyInfo);
  const [tab, setTab] = useState<"info" | "addresses">("info");

  // Addresses sub-state
  const [selectedAddrCode, setSelectedAddrCode] = useState<string | null>(null);
  const [addr, setAddr] = useState<AddrForm>(emptyAddr);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [locatingAddr, setLocatingAddr] = useState(false);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const load = async () => {
    setLoading(true);
    try { setItems((await customerApi.list()) ?? []); }
    catch (err: any) { toast({ title: "Failed to load customers", description: err?.message ?? String(err), variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    // preload lookup lists for address tab
    vehicleCategoryApi.list().then(setCategories).catch(() => setCategories([]));
    driverApi.list().then(setDrivers).catch(() => setDrivers([]));
  }, []);

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

  const openEdit = async (c: Customer) => {
    setDetail(c);
    setInfo({
      serviceTime: c.serviceTime ?? "",
      waitingTime: c.waitingTime ?? "",
    });
    setTab("info");
    setSelectedAddrCode(null);
    setAddr(emptyAddr);
    setView("form");
    setLoadingDetail(true);
    try {
      const full = await customerApi.get(c.customerCode);
      setDetail(full);
      setInfo({
        serviceTime: full.serviceTime ?? "",
        waitingTime: full.waitingTime ?? "",
      });
    } catch (err: any) {
      toast({ title: "Failed to load customer", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setLoadingDetail(false); }
  };

  const goBack = () => { setView("list"); setDetail(null); };

  const handleSaveInfo = async () => {
    if (!detail) return;
    setSavingInfo(true);
    try {
      const payload = {
        serviceTime: info.serviceTime || null,
        waitingTime: info.waitingTime || null,
        updatedBy: currentUser(),
      };
      const updated = await customerApi.update(detail.customerCode, payload);
      setDetail((d) => d ? { ...d, ...updated, ...payload } as Customer : d);
      setItems((p) => p.map((c) => c.customerCode === detail.customerCode ? { ...c, ...payload } as Customer : c));
      toast({ title: "Customer updated" });
    } catch (err: any) {
      toast({ title: "Failed to update customer", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setSavingInfo(false); }
  };

  const pickAddress = async (a: CustomerAddress) => {
    if (!detail) return;
    setSelectedAddrCode(a.addressCode);
    setAddr({
      anyTimeWindow: !!a.anyTimeWindow,
      anyVehicleCategory: !!a.anyVehicleCategory,
      anyDriver: !!a.anyDriver,
      timeWindows: a.timeWindows ?? [],
      vehicles: (a.vehicles ?? []).map((v) => ({ vehicleCategoryCode: v.vehicleCategoryCode })),
      drivers: (a.drivers ?? []).map((d) => ({ driverId: d.driverId })),
    });
    setLoadingAddr(true);
    try {
      const data = await customerApi.getAddress(detail.customerCode, a.addressCode);
      setAddr({
        anyTimeWindow: !!data.anyTimeWindow,
        anyVehicleCategory: !!data.anyVehicleCategory,
        anyDriver: !!data.anyDriver,
        timeWindows: data.timeWindows ?? [],
        vehicles: (data.vehicles ?? []).map((v) => ({ vehicleCategoryCode: v.vehicleCategoryCode })),
        drivers: (data.drivers ?? []).map((d) => ({ driverId: d.driverId })),
      });
      // update merged address in detail
      setDetail((d) => d ? {
        ...d,
        addresses: (d.addresses ?? []).map((x) => x.addressCode === a.addressCode ? { ...x, ...data } : x),
      } : d);
    } catch (err: any) {
      toast({ title: "Failed to load address", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setLoadingAddr(false); }
  };

  const handleSaveAddr = async () => {
    if (!detail || !selectedAddrCode) return;
    // Validate time windows (unless flagged as Any)
    if (!addr.anyTimeWindow) {
      const mins = addr.timeWindows.map((r) => [toMin(r.fromTime), toMin(r.toTime)] as const);
      for (let i = 0; i < mins.length; i++) {
        const [a1, a2] = mins[i];
        if (isNaN(a1) || isNaN(a2)) { toast({ title: "Invalid time window", description: `Row ${i + 1}: use HH:MM`, variant: "destructive" }); return; }
        if (a2 <= a1) { toast({ title: "Invalid time window", description: `Row ${i + 1}: To must be after From`, variant: "destructive" }); return; }
        for (let j = i + 1; j < mins.length; j++) {
          const [b1, b2] = mins[j];
          if (!isNaN(b1) && !isNaN(b2) && a1 < b2 && b1 < a2) {
            toast({ title: "Overlapping time windows", description: `Rows ${i + 1} and ${j + 1} overlap`, variant: "destructive" });
            return;
          }
        }
      }
    }
    if (!addr.anyVehicleCategory) {
      const codes = addr.vehicles.map((v) => v.vehicleCategoryCode);
      if (new Set(codes).size !== codes.length) { toast({ title: "Duplicate vehicle category", variant: "destructive" }); return; }
    }
    if (!addr.anyDriver) {
      const ids = addr.drivers.map((d) => d.driverId);
      if (new Set(ids).size !== ids.length) { toast({ title: "Duplicate driver", variant: "destructive" }); return; }
    }
    setSavingAddr(true);
    try {
      const cur = (detail.addresses ?? []).find((x) => x.addressCode === selectedAddrCode);
      const payload = {
        anyTimeWindow: addr.anyTimeWindow,
        anyVehicleCategory: addr.anyVehicleCategory,
        anyDriver: addr.anyDriver,
        timeWindows: addr.timeWindows.map((t, i) => ({
          fromTime: t.fromTime, toTime: t.toTime, displayOrder: t.displayOrder ?? i,
        })),
        vehicles: addr.vehicles.map((v) => ({ vehicleCategoryCode: v.vehicleCategoryCode })),
        drivers: addr.drivers.map((d) => ({ driverId: d.driverId })),
        latitude: cur?.latitude ?? null,
        longitude: cur?.longitude ?? null,
        updatedBy: currentUser(),
      };
      const updated = await customerApi.updateAddress(detail.customerCode, selectedAddrCode, payload);
      setDetail((d) => d ? {
        ...d,
        addresses: (d.addresses ?? []).map((x) => x.addressCode === selectedAddrCode ? { ...x, ...updated, ...payload } : x),
      } : d);
      toast({ title: "Address updated" });
    } catch (err: any) {
      toast({ title: "Failed to save address", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setSavingAddr(false); }
  };

  const handleLocateAddr = async () => {
    if (!detail || !selectedAddrCode) return;
    const a = (detail.addresses ?? []).find((x) => x.addressCode === selectedAddrCode);
    if (!a) return;
    const parts = [
      a.addressLine1, a.addressLine2, a.addressLine3,
      a.city, a.stateCode, a.postalCode, a.countryName || a.countryCode,
    ].filter((p) => p && String(p).trim() !== "");
    if (parts.length === 0) {
      toast({ title: "No address available", description: "Cannot locate without address details.", variant: "destructive" });
      return;
    }
    setLocatingAddr(true);
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
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      const payload = {
        anyTimeWindow: addr.anyTimeWindow,
        anyVehicleCategory: addr.anyVehicleCategory,
        anyDriver: addr.anyDriver,
        timeWindows: addr.timeWindows.map((t, i) => ({
          fromTime: t.fromTime, toTime: t.toTime, displayOrder: t.displayOrder ?? i,
        })),
        vehicles: addr.vehicles.map((v) => ({ vehicleCategoryCode: v.vehicleCategoryCode })),
        drivers: addr.drivers.map((d) => ({ driverId: d.driverId })),
        latitude: lat,
        longitude: lon,
        updatedBy: currentUser(),
      };
      const updated = await customerApi.updateAddress(detail.customerCode, selectedAddrCode, payload);
      setDetail((d) => d ? {
        ...d,
        addresses: (d.addresses ?? []).map((x) => x.addressCode === selectedAddrCode ? { ...x, ...updated, latitude: lat, longitude: lon } : x),
      } : d);
      toast({ title: "Coordinates updated", description: `${lat}, ${lon}` });
    } catch (err: any) {
      toast({ title: "Failed to locate", description: err?.message ?? String(err), variant: "destructive" });
    } finally { setLocatingAddr(false); }
  };

  // Grid mutators for address tab
  const toMin = (s: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec((s ?? "").trim());
    if (!m) return NaN;
    const h = +m[1], mm = +m[2];
    if (h > 23 || mm > 59) return NaN;
    return h * 60 + mm;
  };
  const overlapsExisting = (from: string, to: string, ignoreIdx = -1) => {
    const a1 = toMin(from), a2 = toMin(to);
    if (isNaN(a1) || isNaN(a2) || a2 <= a1) return false;
    return addr.timeWindows.some((r, idx) => {
      if (idx === ignoreIdx) return false;
      const b1 = toMin(r.fromTime), b2 = toMin(r.toTime);
      if (isNaN(b1) || isNaN(b2)) return false;
      return a1 < b2 && b1 < a2;
    });
  };
  const addTW = () => {
    // find a non-overlapping default slot
    const tries = [["09:00","12:00"],["13:00","17:00"],["08:00","09:00"],["17:00","18:00"]];
    const slot = tries.find(([f,t]) => !overlapsExisting(f, t)) ?? ["",""];
    setAddr((t) => ({ ...t, timeWindows: [...t.timeWindows, { fromTime: slot[0], toTime: slot[1], displayOrder: t.timeWindows.length }] }));
  };
  const updTW = (i: number, k: "fromTime" | "toTime", v: string) => {
    setAddr((t) => {
      const next = t.timeWindows.map((r, idx) => idx === i ? { ...r, [k]: v } : r);
      const cur = next[i];
      const a1 = toMin(cur.fromTime), a2 = toMin(cur.toTime);
      if (!isNaN(a1) && !isNaN(a2) && a2 > a1) {
        const clash = next.some((r, idx) => {
          if (idx === i) return false;
          const b1 = toMin(r.fromTime), b2 = toMin(r.toTime);
          return !isNaN(b1) && !isNaN(b2) && a1 < b2 && b1 < a2;
        });
        if (clash) {
          toast({ title: "Overlapping time window", description: `${cur.fromTime}–${cur.toTime} overlaps an existing window`, variant: "destructive" });
        }
      }
      return { ...t, timeWindows: next };
    });
  };
  const delTW = (i: number) => setAddr((t) => ({ ...t, timeWindows: t.timeWindows.filter((_, idx) => idx !== i) }));

  const addV = () => {
    const used = new Set(addr.vehicles.map((v) => v.vehicleCategoryCode));
    const next = categories.find((c) => !used.has(c.categoryCode));
    if (categories.length > 0 && !next) { toast({ title: "All vehicle categories added", variant: "destructive" }); return; }
    setAddr((t) => ({ ...t, vehicles: [...t.vehicles, { vehicleCategoryCode: next?.categoryCode ?? "" }] }));
  };
  const updV = (i: number, v: string) => {
    if (addr.vehicles.some((r, idx) => idx !== i && r.vehicleCategoryCode === v)) {
      toast({ title: "Duplicate vehicle category", description: `${v} is already added`, variant: "destructive" });
      return;
    }
    setAddr((t) => ({ ...t, vehicles: t.vehicles.map((r, idx) => idx === i ? { ...r, vehicleCategoryCode: v } : r) }));
  };
  const delV = (i: number) => setAddr((t) => ({ ...t, vehicles: t.vehicles.filter((_, idx) => idx !== i) }));

  const addD = () => {
    const used = new Set(addr.drivers.map((d) => d.driverId));
    const next = drivers.find((d) => !used.has(d.driverId));
    if (drivers.length > 0 && !next) { toast({ title: "All drivers added", variant: "destructive" }); return; }
    setAddr((t) => ({ ...t, drivers: [...t.drivers, { driverId: next?.driverId ?? "" }] }));
  };
  const updD = (i: number, v: string) => {
    if (addr.drivers.some((r, idx) => idx !== i && r.driverId === v)) {
      toast({ title: "Duplicate driver", description: `${v} is already added`, variant: "destructive" });
      return;
    }
    setAddr((t) => ({ ...t, drivers: t.drivers.map((r, idx) => idx === i ? { ...r, driverId: v } : r) }));
  };
  const delD = (i: number) => setAddr((t) => ({ ...t, drivers: t.drivers.filter((_, idx) => idx !== i) }));

  // ───── Detail view ─────
  if (view === "form" && detail) {
    const addresses = detail.addresses ?? [];
    const selectedAddress = addresses.find((a) => a.addressCode === selectedAddrCode) ?? null;

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        {/* Sticky header + tab nav (matches Site pattern) */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors duration-150">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Edit Customer</h1>
                <p className="text-xs text-muted-foreground">{detail.customerCode} — {detail.customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors duration-150">Cancel</button>
              {tab === "info" ? (
                <button onClick={handleSaveInfo} disabled={savingInfo || loadingDetail} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">{savingInfo && <Loader2 className="w-4 h-4 animate-spin" />}Save</button>
              ) : (
                <button onClick={handleSaveAddr} disabled={savingAddr || !selectedAddrCode || loadingAddr} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">{savingAddr && <Loader2 className="w-4 h-4 animate-spin" />}Save</button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 h-11">
            {[
              { id: "info" as const, label: "Info" },
              { id: "addresses" as const, label: `Addresses${addresses.length > 0 ? ` (${addresses.length})` : ""}` },
            ].map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative h-9 px-4 rounded-md text-sm font-medium transition-all duration-200",
                    active ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  {t.label}
                  {active && (
                    <motion.span layoutId="customer-active-section-underline" className="absolute left-2 right-2 -bottom-[5px] h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          {tab === "info" ? (
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
              <Section title="Customer Information (from X3)">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Customer Code"><ReadOnly value={detail.customerCode} mono /></Field>
                  <Field label="Short Name"><ReadOnly value={detail.shortName ?? ""} /></Field>
                  <Field label="Customer Name"><ReadOnly value={detail.customerName ?? ""} /></Field>
                  <Field label="Country Code"><ReadOnly value={detail.countryCode ?? ""} mono /></Field>
                  <Field label="Currency Code"><ReadOnly value={detail.currencyCode ?? ""} mono /></Field>
                  <Field label="Active"><ReadOnly value={detail.active ? "Yes" : "No"} /></Field>
                  <Field label="Last Synced"><ReadOnly value={detail.syncedAt ?? ""} /></Field>
                </div>
              </Section>

              <Separator />

              <Section title="TMS Configuration">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Service Time (HH:MM)"><Input value={info.serviceTime} onChange={(e) => setInfo((f) => ({ ...f, serviceTime: e.target.value }))} placeholder="00:15" className="h-9" /></Field>
                  <Field label="Waiting Time (HH:MM)"><Input value={info.waitingTime} onChange={(e) => setInfo((f) => ({ ...f, waitingTime: e.target.value }))} placeholder="00:10" className="h-9" /></Field>
                </div>
              </Section>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
                {/* Left list */}
                <div className="lg:col-span-4 border-r border-border bg-secondary/20">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold">Addresses ({addresses.length})</h3>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
                    {loadingDetail ? (
                      <div className="px-4 py-6 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
                    ) : addresses.length === 0 ? (
                      <div className="px-4 py-6 text-center text-muted-foreground text-sm">No addresses</div>
                    ) : addresses.map((a) => (
                      <button
                        key={a.addressCode}
                        onClick={() => pickAddress(a)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-primary/[0.05] transition-colors",
                          selectedAddrCode === a.addressCode && "bg-primary/[0.08]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium font-mono">{a.addressCode}</div>
                          {isDefault(a) && <StatusBadge status="Default" variant="primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-1">{addrLabel(a)}</div>
                        {a.city && <div className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{a.city}</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right detail */}
                <div className="lg:col-span-8 p-6">
                  {!selectedAddress ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Select an address from the list to configure</div>
                  ) : loadingAddr ? (
                    <div className="py-12 text-center text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading address…</div>
                  ) : (
                    <div className="space-y-6">
                      {/* Address + Map split */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left: address details */}
                        <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold">{selectedAddress.addressCode} — {addrLabel(selectedAddress)}</h3>
                            {isDefault(selectedAddress) && <StatusBadge status="Default" variant="primary" />}
                          </div>
                          <div className="space-y-1.5 text-sm">
                            {selectedAddress.addressLine1 && <div className="text-foreground">{selectedAddress.addressLine1}</div>}
                            {selectedAddress.addressLine2 && <div className="text-foreground">{selectedAddress.addressLine2}</div>}
                            {selectedAddress.addressLine3 && <div className="text-foreground">{selectedAddress.addressLine3}</div>}
                            <div className="text-muted-foreground text-xs">
                              {[selectedAddress.city, selectedAddress.stateCode, selectedAddress.postalCode].filter(Boolean).join(", ")}
                              {selectedAddress.countryName ? ` · ${selectedAddress.countryName}` : selectedAddress.countryCode ? ` · ${selectedAddress.countryCode}` : ""}
                            </div>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Latitude</Label>
                              <div className="mt-1 text-sm font-mono">
                                {selectedAddress.latitude != null ? Number(selectedAddress.latitude).toFixed(6) : <span className="text-muted-foreground/70 italic font-sans text-xs">— not set —</span>}
                              </div>
                            </div>
                            <div>
                              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Longitude</Label>
                              <div className="mt-1 text-sm font-mono">
                                {selectedAddress.longitude != null ? Number(selectedAddress.longitude).toFixed(6) : <span className="text-muted-foreground/70 italic font-sans text-xs">— not set —</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: map */}
                        <div className="relative rounded-lg border border-border overflow-hidden bg-slate-50 min-h-[260px]">
                          <button
                            onClick={handleLocateAddr}
                            disabled={locatingAddr || savingAddr}
                            className="absolute top-2 right-2 z-[400] h-8 px-3 rounded-md text-xs font-semibold bg-white/95 backdrop-blur border border-primary text-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-50 shadow"
                          >
                            {locatingAddr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Locate className="w-3.5 h-3.5" />} Locate
                          </button>
                          <AddressMiniMap
                            lat={selectedAddress.latitude != null ? Number(selectedAddress.latitude) : null}
                            lng={selectedAddress.longitude != null ? Number(selectedAddress.longitude) : null}
                            label={addrLabel(selectedAddress)}
                          />
                        </div>
                      </div>

                      <Section title="Flags">
                        <div className="flex flex-wrap items-center gap-6">
                          <FlagSwitch label="Any Time Window" checked={addr.anyTimeWindow} onChange={(v) => setAddr((t) => ({ ...t, anyTimeWindow: v }))} />
                          <FlagSwitch label="Any Vehicle Category" checked={addr.anyVehicleCategory} onChange={(v) => setAddr((t) => ({ ...t, anyVehicleCategory: v }))} />
                          <FlagSwitch label="Any Driver" checked={addr.anyDriver} onChange={(v) => setAddr((t) => ({ ...t, anyDriver: v }))} />
                        </div>
                      </Section>

                      <Separator />

                      <Section title="Time Windows">
                        <div className={cn("space-y-2", addr.anyTimeWindow && "opacity-50 pointer-events-none")}>
                          {addr.timeWindows.map((r, i) => (
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
                        <div className={cn("space-y-2", addr.anyVehicleCategory && "opacity-50 pointer-events-none")}>
                          {addr.vehicles.map((r, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-10 sm:col-span-8">
                                <Field label="Vehicle Category">
                                  <Select value={r.vehicleCategoryCode} onValueChange={(v) => updV(i, v)}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                                    <SelectContent>{categories.map((c) => {
                                      const used = addr.vehicles.some((v, idx) => idx !== i && v.vehicleCategoryCode === c.categoryCode);
                                      return <SelectItem key={c.categoryCode} value={c.categoryCode} disabled={used}>{c.categoryCode} — {c.description}{used ? " (added)" : ""}</SelectItem>;
                                    })}</SelectContent>
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
                        <div className={cn("space-y-2", addr.anyDriver && "opacity-50 pointer-events-none")}>
                          {addr.drivers.map((r, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-10 sm:col-span-8">
                                <Field label="Driver">
                                  <Select value={r.driverId} onValueChange={(v) => updD(i, v)}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Select driver" /></SelectTrigger>
                                    <SelectContent>{drivers.map((d) => {
                                      const used = addr.drivers.some((x, idx) => idx !== i && x.driverId === d.driverId);
                                      return <SelectItem key={d.driverId} value={d.driverId} disabled={used}>{d.driverId} — {d.driverName}{used ? " (added)" : ""}</SelectItem>;
                                    })}</SelectContent>
                                  </Select>
                                </Field>
                              </div>
                              <div className="col-span-2"><button onClick={() => delD(i)} className="h-9 w-9 inline-flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button></div>
                            </div>
                          ))}
                          <button onClick={addD} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Driver</button>
                        </div>
                      </Section>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ───── List view ─────
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
              <SortableTableHead sortKey="shortName" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Short</SortableTableHead>
              <SortableTableHead sortKey="countryCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Country</SortableTableHead>
              <SortableTableHead sortKey="currencyCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Currency</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Active</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Service</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Waiting</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell text-right">Addresses</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading customers…</TableCell></TableRow>
            ) : sort.sorted.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">No customers found</TableCell></TableRow>
            ) : sort.sorted.map((c, i) => (
              <TableRow
                key={c.customerCode}
                onClick={() => openEdit(c)}
                className={cn("transition-colors cursor-pointer", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.05]")}
              >
                <TableCell className="font-medium text-sm font-mono">{c.customerCode}</TableCell>
                <TableCell className="text-sm">{c.customerName}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{c.shortName ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{c.countryCode ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono hidden lg:table-cell">{c.currencyCode ?? "—"}</TableCell>
                <TableCell><StatusBadge status={c.active ? "Active" : "Inactive"} variant={c.active ? "primary" : "muted"} /></TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono hidden lg:table-cell">{c.serviceTime ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono hidden lg:table-cell">{c.waitingTime ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell text-right">{c.addressCount ?? c.addresses?.length ?? 0}</TableCell>
                <TableCell className="text-right">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="w-4 h-4" /></button>
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
  return <div className="space-y-3"><h3 className="text-sm font-semibold">{title}</h3>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function ReadOnly({ value, mono }: { value: string; mono?: boolean }) {
  return <Input value={value} readOnly className={cn("h-9 bg-secondary/40", mono && "font-mono")} />;
}
function FlagSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
