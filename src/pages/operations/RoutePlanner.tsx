import { useMemo, useState, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Users, Calendar as CalIcon, Building2, Search, MapPin, Route as RouteIcon,
  PackageCheck, ArrowDownToLine, ArrowUpFromLine, CheckCheck, X, Plus, Play,
  Map as MapIcon, List, GripVertical, Loader2, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

// ---------- Mock data ----------
const SITES = [
  { code: "KCC01", name: "Kansas City Central" },
  { code: "KCC02", name: "Kansas City North" },
  { code: "WH-A",  name: "Warehouse Atlanta" },
  { code: "WH-D",  name: "Warehouse Dallas" },
];

type Vehicle = { code: string; plate: string; category: string; capacity: string; site: string };
const VEHICLES: Vehicle[] = [
  { code: "V-115", plate: "AY601W", category: "BOBTAIL",  capacity: "26 pal", site: "KCC01" },
  { code: "V-118", plate: "AZ472B", category: "BOBTAIL",  capacity: "26 pal", site: "KCC01" },
  { code: "V-091", plate: "AN846Y", category: "BOXTRUCK", capacity: "30 pal", site: "KCC01" },
  { code: "V-109", plate: "AW107G", category: "REEFER",   capacity: "22 pal", site: "KCC02" },
  { code: "V-213", plate: "BX902K", category: "VAN",      capacity: "12 pal", site: "WH-A"  },
];

type Driver = { id: string; name: string; license: string; status: "Available" | "On Trip" };
const DRIVERS: Driver[] = [
  { id: "DR-01", name: "Dan Taylor",   license: "CDL-A", status: "Available" },
  { id: "DR-02", name: "John Carter",  license: "CDL-A", status: "Available" },
  { id: "DR-03", name: "Sarah Miles",  license: "CDL-B", status: "Available" },
  { id: "DR-04", name: "Mike Rivera",  license: "CDL-A", status: "On Trip" },
  { id: "DR-05", name: "Lisa Brown",   license: "CDL-B", status: "Available" },
];

type Stop = {
  id: string;
  type: "DROP" | "PICKUP";
  txn: string;
  client: string;
  address: string;
  city: string;
  site: string;
  priority: "High" | "Med" | "Low";
  qty: number;
  lat: number; // 0-100 (svg viewBox space)
  lng: number;
};
const STOPS: Stop[] = [
  { id: "S1", type: "DROP",   txn: "ORD-2810", client: "Acme Co",     address: "12 Wilmington Ave",  city: "Wilmington",  site: "KCC01", priority: "High", qty: 6, lat: 30,  lng: 70 },
  { id: "S2", type: "DROP",   txn: "ORD-2811", client: "Bright Ltd",  address: "88 Newark Plaza",    city: "Newark",      site: "KCC01", priority: "Med",  qty: 4, lat: 45,  lng: 140 },
  { id: "S3", type: "DROP",   txn: "ORD-2812", client: "Northern",    address: "5 Glasgow Rd",       city: "Glasgow",     site: "KCC02", priority: "Low",  qty: 9, lat: 70,  lng: 90  },
  { id: "S4", type: "DROP",   txn: "ORD-2815", client: "Vista Corp",  address: "201 Market St",      city: "Camden",      site: "KCC01", priority: "Med",  qty: 5, lat: 95,  lng: 200 },
  { id: "S5", type: "PICKUP", txn: "ORD-2813", client: "Harbor Co",   address: "Port Terminal B",    city: "Wilmington",  site: "KCC01", priority: "High", qty: 8, lat: 55,  lng: 250 },
  { id: "S6", type: "PICKUP", txn: "ORD-2814", client: "South Inc",   address: "9 Glassboro Way",    city: "Glassboro",   site: "KCC01", priority: "Med",  qty: 3, lat: 80,  lng: 310 },
  { id: "S7", type: "PICKUP", txn: "ORD-2816", client: "Riverline",   address: "44 Dock Rd",         city: "Trenton",     site: "KCC02", priority: "Low",  qty: 7, lat: 35,  lng: 330 },
];

// ---------- Helpers ----------
const priorityClass = (p: Stop["priority"]) =>
  p === "High" ? "bg-rose-100 text-rose-700"
  : p === "Med" ? "bg-amber-100 text-amber-700"
  : "bg-slate-100 text-slate-600";

type ConfirmedTrip = {
  id: string;
  vehicle: Vehicle;
  driver: Driver;
  stops: Stop[];
  distanceKm: number;
  durationMin: number;
  createdAt: string;
};

// ---------- Section: site multi-select ----------
function SiteMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((x) => x !== code) : [...value, code]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 justify-between min-w-[200px]">
          <span className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm">
              {value.length === 0 ? "Select sites…" : `${value.length} site${value.length > 1 ? "s" : ""} selected`}
            </span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          {SITES.map((s) => (
            <label key={s.code} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
              <Checkbox checked={value.includes(s.code)} onCheckedChange={() => toggle(s.code)} />
              <span className="font-mono text-xs text-primary">{s.code}</span>
              <span className="text-muted-foreground text-xs truncate">{s.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------- KPI tile ----------
function Kpi({ label, value, icon: Icon, gradient }: { label: string; value: number | string; icon: typeof Truck; gradient: string }) {
  return (
    <div className={cn("rounded-xl px-4 py-3 text-white shadow-md", gradient)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/85">{label}</p>
          <p className="text-2xl font-bold leading-none mt-1">{value}</p>
        </div>
        <Icon className="w-5 h-5 text-white/85" />
      </div>
    </div>
  );
}

// ============================================================
export default function RoutePlanner() {
  // Filters
  const [selectedSites, setSelectedSites] = useState<string[]>(["KCC01"]);
  const [date, setDate] = useState("2026-06-10");

  // Loaded state
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Search
  const [vehSearch, setVehSearch] = useState("");
  const [drvSearch, setDrvSearch] = useState("");
  const [stopSearch, setStopSearch] = useState("");

  // Active trip builder (only one at a time)
  const [draftVehicle, setDraftVehicle] = useState<Vehicle | null>(null);
  const [draftDriver, setDraftDriver]   = useState<Driver | null>(null);
  const [draftStopIds, setDraftStopIds] = useState<string[]>([]);

  // Confirmed trips
  const [trips, setTrips] = useState<ConfirmedTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const [mapView, setMapView] = useState<"map" | "list">("map");

  // ---------- Load ----------
  function handleLoad() {
    if (!selectedSites.length) {
      toast({ title: "Select at least one site", description: "Pick one or more sites to load data." });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLoaded(true);
      toast({ title: "Data loaded", description: `${selectedSites.length} site(s) · ${date}` });
    }, 600);
  }

  // ---------- Filtered datasets ----------
  const vehicles = useMemo(
    () => VEHICLES.filter((v) =>
      selectedSites.includes(v.site) &&
      (!vehSearch || `${v.code} ${v.plate} ${v.category}`.toLowerCase().includes(vehSearch.toLowerCase()))
    ),
    [selectedSites, vehSearch]
  );

  const drivers = useMemo(
    () => DRIVERS.filter((d) =>
      !drvSearch || `${d.id} ${d.name} ${d.license}`.toLowerCase().includes(drvSearch.toLowerCase())
    ),
    [drvSearch]
  );

  const usedStopIds = useMemo(() => new Set(trips.flatMap((t) => t.stops.map((s) => s.id))), [trips]);

  const stops = useMemo(
    () => STOPS.filter((s) =>
      selectedSites.includes(s.site) &&
      !usedStopIds.has(s.id) &&
      (!stopSearch || `${s.txn} ${s.client} ${s.address} ${s.city}`.toLowerCase().includes(stopSearch.toLowerCase()))
    ),
    [selectedSites, stopSearch, usedStopIds]
  );

  const drops   = stops.filter((s) => s.type === "DROP");
  const pickups = stops.filter((s) => s.type === "PICKUP");

  const draftStops = useMemo(() => STOPS.filter((s) => draftStopIds.includes(s.id)), [draftStopIds]);

  // ---------- KPIs ----------
  const kpis = {
    vehicles: vehicles.length,
    drivers: drivers.filter((d) => d.status === "Available").length,
    drops: drops.length,
    pickups: pickups.length,
    trips: trips.length,
    assignedStops: trips.reduce((n, t) => n + t.stops.length, 0),
  };

  // ---------- Builder actions ----------
  function toggleStop(s: Stop) {
    setDraftStopIds((prev) => prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]);
  }
  function pickVehicle(v: Vehicle) {
    setDraftVehicle((prev) => prev?.code === v.code ? null : v);
  }
  function onDriverDragStart(e: DragEvent, d: Driver) {
    e.dataTransfer.setData("text/driver-id", d.id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDriverDrop(e: DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/driver-id");
    const d = DRIVERS.find((x) => x.id === id);
    if (!d) return;
    if (d.status !== "Available") {
      toast({ title: "Driver unavailable", description: `${d.name} is currently on a trip.` });
      return;
    }
    setDraftDriver(d);
  }
  function onStopDragStart(e: DragEvent, s: Stop) {
    e.dataTransfer.setData("text/stop-id", s.id);
    e.dataTransfer.effectAllowed = "copy";
  }
  function onActiveDrop(e: DragEvent) {
    e.preventDefault();
    const did = e.dataTransfer.getData("text/driver-id");
    const sid = e.dataTransfer.getData("text/stop-id");
    if (did) {
      const d = DRIVERS.find((x) => x.id === did);
      if (d) setDraftDriver(d);
    }
    if (sid && !draftStopIds.includes(sid)) {
      setDraftStopIds((prev) => [...prev, sid]);
    }
  }
  function clearDraft() {
    setDraftVehicle(null); setDraftDriver(null); setDraftStopIds([]);
  }
  function confirmTrip() {
    if (!draftVehicle) return toast({ title: "Pick a vehicle", description: "Select a vehicle for the trip." });
    if (!draftDriver)  return toast({ title: "Assign a driver", description: "Drag a driver into the active trip." });
    if (!draftStopIds.length) return toast({ title: "Add stops", description: "Select drops and/or pickups." });

    const trip: ConfirmedTrip = {
      id: `TR-${String(trips.length + 1).padStart(3, "0")}`,
      vehicle: draftVehicle,
      driver: draftDriver,
      stops: draftStops,
      distanceKm: Math.round(40 + draftStops.length * 12 + Math.random() * 30),
      durationMin: Math.round(60 + draftStops.length * 18),
      createdAt: new Date().toLocaleString(),
    };
    setTrips((prev) => [...prev, trip]);
    setSelectedTripId(trip.id);
    clearDraft();
    toast({ title: "Trip confirmed", description: `${trip.id} · ${trip.stops.length} stops` });
  }

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;

  // ============================================================
  return (
    <div className="p-4 lg:p-5 space-y-4 bg-background min-h-full">
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border/60 shadow-sm p-3 flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sites</label>
          <SiteMultiSelect value={selectedSites} onChange={setSelectedSites} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</label>
          <div className="relative">
            <CalIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="h-9 pl-7 pr-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
        <Button onClick={handleLoad} disabled={loading} className="h-9">
          {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
          {loaded ? "Reload Data" : "Load Data"}
        </Button>
        {loaded && (
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            Data loaded for <span className="font-mono text-foreground">{selectedSites.join(", ")}</span> on <span className="font-mono text-foreground">{date}</span>
          </div>
        )}
      </motion.div>

      {!loaded ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <RouteIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium text-foreground">Select sites and date, then click <span className="text-primary">Load Data</span></p>
          <p className="text-sm mt-1">Vehicles, drivers, drops and pickups will appear here.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Vehicles"        value={kpis.vehicles}      icon={Truck}            gradient="bg-gradient-to-br from-slate-500 to-slate-700" />
            <Kpi label="Drivers Avail."  value={kpis.drivers}       icon={Users}            gradient="bg-gradient-to-br from-indigo-500 to-indigo-700" />
            <Kpi label="Drops"           value={kpis.drops}         icon={ArrowDownToLine}  gradient="bg-gradient-to-br from-rose-500 to-rose-600" />
            <Kpi label="Pickups"         value={kpis.pickups}       icon={ArrowUpFromLine}  gradient="bg-gradient-to-br from-sky-500 to-sky-600" />
            <Kpi label="Confirmed Trips" value={kpis.trips}         icon={RouteIcon}        gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
            <Kpi label="Stops Assigned"  value={kpis.assignedStops} icon={PackageCheck}     gradient="bg-gradient-to-br from-amber-500 to-amber-600" />
          </div>

          {/* Resources: 4 panels */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Vehicles */}
            <ResourcePanel title="Vehicles" icon={Truck} count={vehicles.length} search={vehSearch} onSearch={setVehSearch} accent="from-slate-500 to-slate-700">
              {vehicles.map((v) => {
                const sel = draftVehicle?.code === v.code;
                return (
                  <div
                    key={v.code}
                    onClick={() => pickVehicle(v)}
                    className={cn(
                      "rounded-lg border p-2.5 cursor-pointer transition-all bg-card hover:border-primary/40 hover:shadow-sm",
                      sel ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-sm">{v.code}</span>
                      {sel && <Badge className="h-5 text-[10px]">Selected</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{v.plate}</span> · {v.category}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{v.capacity} · {v.site}</div>
                  </div>
                );
              })}
              {vehicles.length === 0 && <EmptyHint text="No vehicles" />}
            </ResourcePanel>

            {/* Drivers */}
            <ResourcePanel title="Drivers" icon={Users} count={drivers.length} search={drvSearch} onSearch={setDrvSearch} accent="from-indigo-500 to-indigo-700" hint="Drag → Active Trip">
              {drivers.map((d) => {
                const dis = d.status !== "Available";
                return (
                  <div
                    key={d.id}
                    draggable={!dis}
                    onDragStart={(e) => onDriverDragStart(e, d)}
                    className={cn(
                      "rounded-lg border border-border/60 bg-card p-2.5 flex items-center gap-2",
                      dis ? "opacity-50" : "cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-sm"
                    )}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{d.id} · {d.license}</div>
                    </div>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                      d.status === "Available" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>{d.status}</span>
                  </div>
                );
              })}
              {drivers.length === 0 && <EmptyHint text="No drivers" />}
            </ResourcePanel>

            {/* Drops */}
            <ResourcePanel title="Drops" icon={ArrowDownToLine} count={drops.length} search={stopSearch} onSearch={setStopSearch} accent="from-rose-500 to-rose-600">
              {drops.map((s) => (
                <StopCard key={s.id} stop={s} selected={draftStopIds.includes(s.id)} onClick={() => toggleStop(s)} onDragStart={(e) => onStopDragStart(e, s)} />
              ))}
              {drops.length === 0 && <EmptyHint text="No drops" />}
            </ResourcePanel>

            {/* Pickups */}
            <ResourcePanel title="Pickups" icon={ArrowUpFromLine} count={pickups.length} search={stopSearch} onSearch={setStopSearch} accent="from-sky-500 to-sky-600">
              {pickups.map((s) => (
                <StopCard key={s.id} stop={s} selected={draftStopIds.includes(s.id)} onClick={() => toggleStop(s)} onDragStart={(e) => onStopDragStart(e, s)} />
              ))}
              {pickups.length === 0 && <EmptyHint text="No pickups" />}
            </ResourcePanel>
          </div>

          {/* Active Trip builder */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onActiveDrop}
            className="bg-card rounded-xl border-2 border-dashed border-primary/30 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Active Trip <span className="text-muted-foreground font-normal">(in progress)</span></h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-8" onClick={clearDraft} disabled={!draftVehicle && !draftDriver && !draftStopIds.length}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
                <Button size="sm" className="h-8" onClick={confirmTrip}>
                  <CheckCheck className="w-3.5 h-3.5 mr-1" /> Confirm Trip
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-3">
              {/* Vehicle slot */}
              <Slot title="Vehicle" icon={Truck} filled={!!draftVehicle} hint="Click a vehicle on the left">
                {draftVehicle && (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono font-semibold text-sm">{draftVehicle.code} · {draftVehicle.plate}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{draftVehicle.category} · {draftVehicle.capacity}</div>
                    </div>
                    <button onClick={() => setDraftVehicle(null)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </Slot>

              {/* Driver slot (drop target) */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-indigo-400"); }}
                onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-indigo-400")}
                onDrop={(e) => { e.currentTarget.classList.remove("ring-2", "ring-indigo-400"); onDriverDrop(e); }}
              >
                <Slot title="Driver" icon={Users} filled={!!draftDriver} hint="Drag a driver here">
                  {draftDriver && (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{draftDriver.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{draftDriver.id} · {draftDriver.license}</div>
                      </div>
                      <button onClick={() => setDraftDriver(null)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </Slot>
              </div>

              {/* Stops count summary */}
              <Slot title="Stops" icon={MapPin} filled={draftStopIds.length > 0} hint="Click drops / pickups to add">
                {draftStopIds.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-rose-600 font-semibold flex items-center gap-1"><ArrowDownToLine className="w-3.5 h-3.5" /> {draftStops.filter(s => s.type === "DROP").length} drops</span>
                      <span className="text-sky-600 font-semibold flex items-center gap-1"><ArrowUpFromLine className="w-3.5 h-3.5" /> {draftStops.filter(s => s.type === "PICKUP").length} pickups</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{draftStops.reduce((n, s) => n + s.qty, 0)} qty</span>
                  </div>
                )}
              </Slot>
            </div>

            {/* Stops sequence */}
            {draftStopIds.length > 0 && (
              <div className="border-t border-border/60 px-3 py-3 bg-muted/20">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Sequence</div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {draftStops.map((s, i) => (
                      <motion.div
                        key={s.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                          "flex items-center gap-2 rounded-full pl-2 pr-1 py-1 border text-xs",
                          s.type === "DROP" ? "bg-rose-50 border-rose-200" : "bg-sky-50 border-sky-200"
                        )}
                      >
                        <span className="w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center font-mono text-[10px] font-bold">{i + 1}</span>
                        <span className="font-mono text-[11px]">{s.txn}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="truncate max-w-[120px]">{s.client}</span>
                        <button onClick={() => toggleStop(s)} className="w-5 h-5 rounded-full hover:bg-white/80 flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Trips list + Map */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Trips list */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-2">
                  <RouteIcon className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Confirmed Trips</h3>
                  <span className="text-[11px] text-muted-foreground">({trips.length})</span>
                </div>
              </div>
              <div className="max-h-[380px] overflow-auto">
                {trips.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    <RouteIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    No confirmed trips yet
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {trips.map((t) => {
                      const sel = t.id === selectedTripId;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTripId(t.id)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors",
                            sel && "bg-primary/5 border-l-2 border-primary"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-semibold text-sm text-primary">{t.id}</span>
                            <span className="text-[10px] text-muted-foreground">{t.createdAt}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="font-mono">{t.vehicle.plate}</Badge>
                            <span className="text-muted-foreground">·</span>
                            <span className="font-medium">{t.driver.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.stops.length} stops</span>
                            <span>{t.distanceKm} km</span>
                            <span>{Math.floor(t.durationMin / 60)}h {t.durationMin % 60}m</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Map + tabular */}
            <div className="lg:col-span-3 bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">
                    {selectedTrip ? <>Trip <span className="font-mono text-primary">{selectedTrip.id}</span></> : "Select a trip"}
                  </h3>
                </div>
                <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                  <button onClick={() => setMapView("map")} className={cn("h-6 px-2 text-[11px] rounded flex items-center gap-1", mapView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><MapIcon className="w-3 h-3" /> Map</button>
                  <button onClick={() => setMapView("list")} className={cn("h-6 px-2 text-[11px] rounded flex items-center gap-1", mapView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><List className="w-3 h-3" /> List</button>
                </div>
              </div>

              {mapView === "map" ? (
                <TripMap trip={selectedTrip} />
              ) : (
                <TripList trip={selectedTrip} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Resource panel ----------
function ResourcePanel({
  title, icon: Icon, count, search, onSearch, accent, hint, children,
}: {
  title: string; icon: typeof Truck; count: number; search: string; onSearch: (v: string) => void;
  accent: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
      <div className={cn("px-3 py-2 flex items-center justify-between text-white bg-gradient-to-r", accent)}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-[11px] bg-white/20 rounded-full px-2 py-0.5">{count}</span>
        </div>
        {hint && <span className="text-[10px] text-white/80">{hint}</span>}
      </div>
      <div className="p-2">
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search…" className="h-8 pl-8 text-xs" />
        </div>
        <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="text-center text-xs text-muted-foreground py-6">{text}</div>;
}

function StopCard({ stop, selected, onClick, onDragStart }: {
  stop: Stop; selected: boolean; onClick: () => void; onDragStart: (e: DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "rounded-lg border p-2.5 cursor-pointer transition-all bg-card",
        selected ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                 : "border-border/60 hover:border-primary/40 hover:shadow-sm"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-semibold text-xs text-primary">{stop.txn}</span>
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold", priorityClass(stop.priority))}>{stop.priority}</span>
      </div>
      <div className="text-xs font-medium mt-1 truncate">{stop.client}</div>
      <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
        <MapPin className="w-3 h-3 flex-shrink-0" /> {stop.address}, {stop.city}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground">Qty {stop.qty}</span>
        {selected && <span className="text-[10px] text-primary font-semibold flex items-center gap-0.5"><CheckCheck className="w-3 h-3" /> added</span>}
      </div>
    </div>
  );
}

function Slot({ title, icon: Icon, filled, hint, children }: {
  title: string; icon: typeof Truck; filled: boolean; hint: string; children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3 transition-colors min-h-[78px]",
      filled ? "border-border bg-muted/30" : "border-dashed border-border/70 bg-muted/10"
    )}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
        <Icon className="w-3 h-3" /> {title}
      </div>
      {filled ? children : <div className="text-xs text-muted-foreground flex items-center gap-1"><Plus className="w-3 h-3" /> {hint}</div>}
    </div>
  );
}

// ---------- Map ----------
function TripMap({ trip }: { trip: ConfirmedTrip | null }) {
  return (
    <div className="relative flex-1 min-h-[380px] bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50">
      {/* Decorative grid */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.4" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#grid)" />
        {trip && trip.stops.length > 0 && (
          <>
            <polyline
              points={trip.stops.map((s) => `${s.lng},${s.lat}`).join(" ")}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            {trip.stops.map((s, i) => (
              <g key={s.id}>
                <circle cx={s.lng} cy={s.lat} r="9" fill={s.type === "DROP" ? "#e11d48" : "#0284c7"} stroke="white" strokeWidth="2" />
                <text x={s.lng} y={s.lat + 3} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">{i + 1}</text>
              </g>
            ))}
          </>
        )}
      </svg>
      {!trip && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/85 backdrop-blur rounded-lg px-4 py-3 shadow-sm border border-border/60 text-center">
            <MapIcon className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-sm font-medium">Select a trip to see its route</p>
          </div>
        </div>
      )}
      {trip && (
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-border/60 px-3 py-2 text-xs">
          <div className="font-semibold">{trip.vehicle.plate} · {trip.driver.name}</div>
          <div className="text-muted-foreground mt-0.5">{trip.distanceKm} km · {Math.floor(trip.durationMin / 60)}h {trip.durationMin % 60}m · {trip.stops.length} stops</div>
        </div>
      )}
      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur rounded-md border border-border/60 px-2 py-1.5 text-[11px] flex items-center gap-3">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Drop</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> Pickup</span>
      </div>
    </div>
  );
}

// ---------- Table ----------
function TripList({ trip }: { trip: ConfirmedTrip | null }) {
  if (!trip) {
    return <div className="p-10 text-center text-muted-foreground text-sm flex-1">Select a trip to see its stops</div>;
  }
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 sticky top-0">
          <tr className="text-left text-muted-foreground">
            {["Seq", "Type", "Txn", "Client", "Address", "City", "Priority", "Qty"].map((h) => (
              <th key={h} className="px-2.5 py-2 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trip.stops.map((s, i) => (
            <tr key={s.id} className="border-t border-border/40 hover:bg-muted/30">
              <td className="px-2.5 py-2 font-mono font-semibold">{i + 1}</td>
              <td className="px-2.5 py-2">
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold",
                  s.type === "DROP" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700")}>{s.type}</span>
              </td>
              <td className="px-2.5 py-2 font-mono text-primary">{s.txn}</td>
              <td className="px-2.5 py-2">{s.client}</td>
              <td className="px-2.5 py-2 text-muted-foreground">{s.address}</td>
              <td className="px-2.5 py-2">{s.city}</td>
              <td className="px-2.5 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", priorityClass(s.priority))}>{s.priority}</span></td>
              <td className="px-2.5 py-2 font-mono">{s.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
