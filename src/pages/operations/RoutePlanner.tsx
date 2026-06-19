import { useEffect, useMemo, useState, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Users, Calendar as CalIcon, Building2, Search, MapPin, Route as RouteIcon,
  PackageCheck, ArrowDownToLine, ArrowUpFromLine, CheckCheck, X, Plus, RefreshCw,
  Map as MapIcon, List, GripVertical, Loader2, Trash2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge }    from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import {
  fetchTmsSites, loadPlannerData,
  type RpSite, type RpVehicle, type RpDriver, type RpStop,
} from "@/lib/routePlannerApi";

// ── Priority label helper ─────────────────────────────────────
function priorityLabel(p: number | null): "High" | "Med" | "Low" {
  if (p === null || p === undefined) return "Low";
  if (p >= 80) return "High";
  if (p >= 40) return "Med";
  return "Low";
}
function priorityClass(p: "High" | "Med" | "Low") {
  return p === "High" ? "bg-rose-100 text-rose-700"
       : p === "Med"  ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600";
}

// ── Confirmed trip (local, not yet saved to backend) ──────────
type ConfirmedTrip = {
  id:          string;
  vehicle:     RpVehicle;
  driver:      RpDriver;
  stops:       RpStop[];
  distanceKm:  number;
  durationMin: number;
  createdAt:   string;
};

// ── Site selector ─────────────────────────────────────────────
function SiteSelect({
  sites, value, onChange,
}: {
  sites: RpSite[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 min-w-[220px]">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground mr-1" />
        <SelectValue placeholder="Select site…" />
      </SelectTrigger>
      <SelectContent>
        {sites.map((s) => (
          <SelectItem key={s.siteCode} value={s.siteCode}>
            <span className="font-mono text-xs text-primary mr-2">{s.siteCode}</span>
            <span className="text-muted-foreground text-xs">{s.siteName}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── KPI tile ──────────────────────────────────────────────────
function Kpi({ label, value, icon: Icon, gradient }: {
  label: string; value: number | string; icon: typeof Truck; gradient: string;
}) {
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

// ── Main component ────────────────────────────────────────────
export default function RoutePlanner() {

  // Sites (loaded on mount)
  const [sites, setSites]           = useState<RpSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState<string | null>(null);

  // Filters
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [date, setDate]                 = useState(() => new Date().toISOString().slice(0, 10));

  // Refresh trigger — increment to force re-fetch with same site+date
  const [refreshKey, setRefreshKey] = useState(0);

  // Planner data
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<RpVehicle[]>([]);
  const [drivers,  setDrivers]  = useState<RpDriver[]>([]);
  const [drops,    setDrops]    = useState<RpStop[]>([]);
  const [pickups,  setPickups]  = useState<RpStop[]>([]);

  // Search
  const [vehSearch,  setVehSearch]  = useState("");
  const [drvSearch,  setDrvSearch]  = useState("");
  const [stopSearch, setStopSearch] = useState("");

  // Active trip builder
  const [draftVehicle,  setDraftVehicle]  = useState<RpVehicle | null>(null);
  const [draftDriver,   setDraftDriver]   = useState<RpDriver | null>(null);
  const [draftStopNums, setDraftStopNums] = useState<string[]>([]);

  // Confirmed trips
  const [trips,         setTrips]         = useState<ConfirmedTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const [mapView, setMapView] = useState<"map" | "list">("map");

  // ── Load sites on mount, auto-select first ───────────────
  useEffect(() => {
    setSitesLoading(true);
    fetchTmsSites()
      .then((data) => {
        setSites(data);
        if (data.length > 0) setSelectedSite(data[0].siteCode);
      })
      .catch((e) => setSitesError(e.message))
      .finally(() => setSitesLoading(false));
  }, []);

  // ── Auto-load planner data on site or date change ─────────
  // Fires whenever selectedSite or date changes (including initial site set)
  useEffect(() => {
    if (!selectedSite || !date) return;

    setLoading(true);
    setError(null);
    setLoaded(false);
    setVehicles([]); setDrivers([]); setDrops([]); setPickups([]);
    setDraftVehicle(null); setDraftDriver(null); setDraftStopNums([]);
    setTrips([]); setSelectedTripId(null);

    loadPlannerData(selectedSite, date)
      .then((data) => {
        setVehicles(data.vehicles ?? []);
        setDrivers(data.drivers  ?? []);
        setDrops(data.drops      ?? []);
        setPickups(data.pickups  ?? []);
        setLoaded(true);
      })
      .catch((e: any) => {
        setError(e.message);
        toast({ title: "Failed to load data", description: e.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [selectedSite, date, refreshKey]);

  // ── Filtered lists ───────────────────────────────────────
  const usedDocNums = useMemo(
    () => new Set(trips.flatMap((t) => t.stops.map((s) => s.docNum))),
    [trips]
  );

  const filteredVehicles = useMemo(() =>
    vehicles.filter((v) =>
      !vehSearch ||
      `${v.vehicleCode} ${v.vehicleNumber} ${v.categoryCode}`.toLowerCase().includes(vehSearch.toLowerCase())
    ), [vehicles, vehSearch]);

  const filteredDrivers = useMemo(() =>
    drivers.filter((d) =>
      !drvSearch ||
      `${d.driverId} ${d.driverName} ${d.licenseNumber}`.toLowerCase().includes(drvSearch.toLowerCase())
    ), [drivers, drvSearch]);

  const filteredDrops = useMemo(() =>
    drops.filter((s) =>
      !usedDocNums.has(s.docNum) &&
      (!stopSearch || `${s.docNum} ${s.bpName} ${s.addLine1} ${s.city}`.toLowerCase().includes(stopSearch.toLowerCase()))
    ), [drops, stopSearch, usedDocNums]);

  const filteredPickups = useMemo(() =>
    pickups.filter((s) =>
      !usedDocNums.has(s.docNum) &&
      (!stopSearch || `${s.docNum} ${s.bpName} ${s.addLine1} ${s.city}`.toLowerCase().includes(stopSearch.toLowerCase()))
    ), [pickups, stopSearch, usedDocNums]);

  const allStops = useMemo(() => [...drops, ...pickups], [drops, pickups]);
  const draftStops = useMemo(
    () => allStops.filter((s) => draftStopNums.includes(s.docNum)),
    [allStops, draftStopNums]
  );

  // ── KPIs ─────────────────────────────────────────────────
  const kpis = {
    vehicles:      vehicles.length,
    drivers:       drivers.length,
    drops:         drops.length,
    pickups:       pickups.length,
    trips:         trips.length,
    assignedStops: trips.reduce((n, t) => n + t.stops.length, 0),
  };

  // ── Builder actions ───────────────────────────────────────
  function toggleStop(s: RpStop) {
    setDraftStopNums((prev) =>
      prev.includes(s.docNum) ? prev.filter((x) => x !== s.docNum) : [...prev, s.docNum]
    );
  }
  function onDriverDragStart(e: DragEvent, d: RpDriver) {
    e.dataTransfer.setData("text/driver-id", d.driverId);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDriverDrop(e: DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/driver-id");
    const d = drivers.find((x) => x.driverId === id);
    if (d) setDraftDriver(d);
  }
  function onStopDragStart(e: DragEvent, s: RpStop) {
    e.dataTransfer.setData("text/stop-num", s.docNum);
    e.dataTransfer.effectAllowed = "copy";
  }
  function onActiveDrop(e: DragEvent) {
    e.preventDefault();
    const did = e.dataTransfer.getData("text/driver-id");
    const num = e.dataTransfer.getData("text/stop-num");
    if (did) { const d = drivers.find((x) => x.driverId === did); if (d) setDraftDriver(d); }
    if (num && !draftStopNums.includes(num)) setDraftStopNums((prev) => [...prev, num]);
  }
  function clearDraft() {
    setDraftVehicle(null); setDraftDriver(null); setDraftStopNums([]);
  }
  function confirmTrip() {
    if (!draftVehicle)        return toast({ title: "Pick a vehicle" });
    if (!draftDriver)         return toast({ title: "Assign a driver", description: "Drag a driver into the active trip." });
    if (!draftStopNums.length) return toast({ title: "Add stops", description: "Select drops and/or pickups." });

    const trip: ConfirmedTrip = {
      id:          `TR-${String(trips.length + 1).padStart(3, "0")}`,
      vehicle:     draftVehicle,
      driver:      draftDriver,
      stops:       draftStops,
      distanceKm:  Math.round(40 + draftStops.length * 12 + Math.random() * 30),
      durationMin: Math.round(60 + draftStops.length * 18),
      createdAt:   new Date().toLocaleString(),
    };
    setTrips((prev) => [...prev, trip]);
    setSelectedTripId(trip.id);
    clearDraft();
    toast({ title: "Trip confirmed", description: `${trip.id} · ${trip.stops.length} stops` });
  }

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-5 space-y-4 bg-background min-h-full">

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border/60 shadow-sm p-3 flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Site</label>
          {sitesLoading ? (
            <div className="h-9 flex items-center gap-2 px-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading sites…
            </div>
          ) : sitesError ? (
            <div className="h-9 flex items-center gap-2 px-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" /> {sitesError}
            </div>
          ) : (
            <SiteSelect sites={sites} value={selectedSite} onChange={setSelectedSite} />
          )}
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



        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={loading || !selectedSite}
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </Button>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Loading data…</span></>
          ) : loaded ? (
            <><CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono text-foreground">{selectedSite}</span>
            <span>·</span>
            <span className="font-mono text-foreground">{date}</span></>
          ) : error ? (
            <><AlertCircle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-destructive">{error}</span></>
          ) : null}
        </div>
      </motion.div>

      {!loaded ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
          {loading ? (
            <>
              <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
              <p className="font-medium text-foreground">Loading planner data…</p>
              <p className="text-sm mt-1 font-mono text-primary">{selectedSite} · {date}</p>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-destructive" />
              <p className="font-medium text-foreground">Failed to load data</p>
              <p className="text-sm mt-1 text-destructive">{error}</p>
            </>
          ) : (
            <>
              <RouteIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium text-foreground">Select a site to load planner data</p>
              <p className="text-sm mt-1">Vehicles, drivers, drops and pickups will load automatically.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Vehicles"        value={kpis.vehicles}      icon={Truck}           gradient="bg-gradient-to-br from-slate-500 to-slate-700" />
            <Kpi label="Drivers"         value={kpis.drivers}       icon={Users}           gradient="bg-gradient-to-br from-indigo-500 to-indigo-700" />
            <Kpi label="Drops"           value={kpis.drops}         icon={ArrowDownToLine} gradient="bg-gradient-to-br from-rose-500 to-rose-600" />
            <Kpi label="Pickups"         value={kpis.pickups}       icon={ArrowUpFromLine} gradient="bg-gradient-to-br from-sky-500 to-sky-600" />
            <Kpi label="Confirmed Trips" value={kpis.trips}         icon={RouteIcon}       gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
            <Kpi label="Stops Assigned"  value={kpis.assignedStops} icon={PackageCheck}    gradient="bg-gradient-to-br from-amber-500 to-amber-600" />
          </div>

          {/* 4 panels */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

            {/* Vehicles */}
            <ResourcePanel title="Vehicles" icon={Truck} count={filteredVehicles.length} search={vehSearch} onSearch={setVehSearch} accent="from-slate-500 to-slate-700">
              {filteredVehicles.map((v) => {
                const sel = draftVehicle?.vehicleCode === v.vehicleCode;
                return (
                  <div
                    key={v.vehicleCode}
                    onClick={() => setDraftVehicle((p) => p?.vehicleCode === v.vehicleCode ? null : v)}
                    className={cn(
                      "rounded-lg border p-2.5 cursor-pointer transition-all bg-card hover:border-primary/40",
                      sel ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-sm">{v.vehicleCode}</span>
                      {sel && <Badge className="h-5 text-[10px]">Selected</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{v.vehicleNumber}</span>
                      {v.categoryCode && <> · {v.categoryCode}</>}
                    </div>
                    {(v.capacityWeight || v.capacityVolume) && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {v.capacityWeight && <>{v.capacityWeight}{v.weightUnit}</>}
                        {v.capacityWeight && v.capacityVolume && " · "}
                        {v.capacityVolume && <>{v.capacityVolume}{v.volumeUnit}</>}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredVehicles.length === 0 && <EmptyHint text="No vehicles" />}
            </ResourcePanel>

            {/* Drivers */}
            <ResourcePanel title="Drivers" icon={Users} count={filteredDrivers.length} search={drvSearch} onSearch={setDrvSearch} accent="from-indigo-500 to-indigo-700" hint="Drag → Active Trip">
              {filteredDrivers.map((d) => (
                <div
                  key={d.driverId}
                  draggable
                  onDragStart={(e) => onDriverDragStart(e, d)}
                  className="rounded-lg border border-border/60 bg-card p-2.5 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-sm"
                >
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.driverName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {d.driverId}{d.licenseNumber && ` · ${d.licenseNumber}`}
                    </div>
                  </div>
                  {d.driverStatus === 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">Active</span>
                  )}
                </div>
              ))}
              {filteredDrivers.length === 0 && <EmptyHint text="No drivers" />}
            </ResourcePanel>

            {/* Drops */}
            <ResourcePanel title="Drops" icon={ArrowDownToLine} count={filteredDrops.length} search={stopSearch} onSearch={setStopSearch} accent="from-rose-500 to-rose-600">
              {filteredDrops.map((s) => (
                <StopCard key={s.docNum} stop={s} selected={draftStopNums.includes(s.docNum)}
                  onClick={() => toggleStop(s)} onDragStart={(e) => onStopDragStart(e, s)} />
              ))}
              {filteredDrops.length === 0 && <EmptyHint text="No drops" />}
            </ResourcePanel>

            {/* Pickups */}
            <ResourcePanel title="Pickups" icon={ArrowUpFromLine} count={filteredPickups.length} search={stopSearch} onSearch={setStopSearch} accent="from-sky-500 to-sky-600">
              {filteredPickups.map((s) => (
                <StopCard key={s.docNum} stop={s} selected={draftStopNums.includes(s.docNum)}
                  onClick={() => toggleStop(s)} onDragStart={(e) => onStopDragStart(e, s)} />
              ))}
              {filteredPickups.length === 0 && <EmptyHint text="No pickups" />}
            </ResourcePanel>
          </div>

          {/* Active Trip builder */}
          <div
            onDragOver={(e) => e.preventDefault()} onDrop={onActiveDrop}
            className="bg-card rounded-xl border-2 border-dashed border-primary/30 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Active Trip <span className="text-muted-foreground font-normal">(in progress)</span></h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-8" onClick={clearDraft}
                  disabled={!draftVehicle && !draftDriver && !draftStopNums.length}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
                <Button size="sm" className="h-8" onClick={confirmTrip}>
                  <CheckCheck className="w-3.5 h-3.5 mr-1" /> Confirm Trip
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-3">
              <Slot title="Vehicle" icon={Truck} filled={!!draftVehicle} hint="Click a vehicle above">
                {draftVehicle && (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono font-semibold text-sm">{draftVehicle.vehicleCode} · {draftVehicle.vehicleNumber}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{draftVehicle.categoryCode} {draftVehicle.vehicleName && `· ${draftVehicle.vehicleName}`}</div>
                    </div>
                    <button onClick={() => setDraftVehicle(null)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </Slot>

              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-indigo-400"); }}
                onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-indigo-400")}
                onDrop={(e) => { e.currentTarget.classList.remove("ring-2", "ring-indigo-400"); onDriverDrop(e); }}
              >
                <Slot title="Driver" icon={Users} filled={!!draftDriver} hint="Drag a driver here">
                  {draftDriver && (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{draftDriver.driverName}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{draftDriver.driverId}{draftDriver.licenseNumber && ` · ${draftDriver.licenseNumber}`}</div>
                      </div>
                      <button onClick={() => setDraftDriver(null)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </Slot>
              </div>

              <Slot title="Stops" icon={MapPin} filled={draftStopNums.length > 0} hint="Click drops / pickups to add">
                {draftStopNums.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <ArrowDownToLine className="w-3.5 h-3.5" /> {draftStops.filter(s => s.stopType === "DROP").length} drops
                      </span>
                      <span className="text-sky-600 font-semibold flex items-center gap-1">
                        <ArrowUpFromLine className="w-3.5 h-3.5" /> {draftStops.filter(s => s.stopType === "PICKUP").length} pickups
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {draftStops.reduce((n, s) => n + (s.nbPack ?? 0), 0)} packs
                    </span>
                  </div>
                )}
              </Slot>
            </div>

            {draftStopNums.length > 0 && (
              <div className="border-t border-border/60 px-3 py-3 bg-muted/20">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Sequence</div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {draftStops.map((s, i) => (
                      <motion.div
                        key={s.docNum} layout
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                          "flex items-center gap-2 rounded-full pl-2 pr-1 py-1 border text-xs",
                          s.stopType === "DROP" ? "bg-rose-50 border-rose-200" : "bg-sky-50 border-sky-200"
                        )}
                      >
                        <span className="w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center font-mono text-[10px] font-bold">{i + 1}</span>
                        <span className="font-mono text-[11px]">{s.docNum}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="truncate max-w-[120px]">{s.bpName}</span>
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

          {/* Trips + Map */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
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
                        <button key={t.id} onClick={() => setSelectedTripId(t.id)}
                          className={cn("w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors",
                            sel && "bg-primary/5 border-l-2 border-primary")}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-semibold text-sm text-primary">{t.id}</span>
                            <span className="text-[10px] text-muted-foreground">{t.createdAt}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="font-mono">{t.vehicle.vehicleNumber}</Badge>
                            <span className="text-muted-foreground">·</span>
                            <span className="font-medium">{t.driver.driverName}</span>
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

            <div className="lg:col-span-3 bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">
                    {selectedTrip ? <>Trip <span className="font-mono text-primary">{selectedTrip.id}</span></> : "Select a trip"}
                  </h3>
                </div>
                <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                  <button onClick={() => setMapView("map")} className={cn("h-6 px-2 text-[11px] rounded flex items-center gap-1",
                    mapView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                    <MapIcon className="w-3 h-3" /> Map
                  </button>
                  <button onClick={() => setMapView("list")} className={cn("h-6 px-2 text-[11px] rounded flex items-center gap-1",
                    mapView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                    <List className="w-3 h-3" /> List
                  </button>
                </div>
              </div>
              {mapView === "map" ? <TripMap trip={selectedTrip} /> : <TripList trip={selectedTrip} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function ResourcePanel({ title, icon: Icon, count, search, onSearch, accent, hint, children }: {
  title: string; icon: typeof Truck; count: number; search: string;
  onSearch: (v: string) => void; accent: string; hint?: string; children: React.ReactNode;
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
        <div className="space-y-2 max-h-[280px] overflow-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="text-center text-xs text-muted-foreground py-6">{text}</div>;
}

function StopCard({ stop, selected, onClick, onDragStart }: {
  stop: RpStop; selected: boolean; onClick: () => void; onDragStart: (e: DragEvent) => void;
}) {
  const pl = priorityLabel(stop.priority);
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className={cn("rounded-lg border p-2.5 cursor-pointer transition-all bg-card",
        selected ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                 : "border-border/60 hover:border-primary/40 hover:shadow-sm")}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-semibold text-xs text-primary">{stop.docNum}</span>
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold", priorityClass(pl))}>{pl}</span>
      </div>
      <div className="text-xs font-medium mt-1 truncate">{stop.bpName}</div>
      <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        {[stop.addLine1, stop.city].filter(Boolean).join(", ")}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground">
          {stop.nbPack != null ? `${stop.nbPack} packs` : ""}
          {stop.netWeight != null ? ` · ${stop.netWeight}${stop.weightUnit ?? ""}` : ""}
        </span>
        {selected && <span className="text-[10px] text-primary font-semibold flex items-center gap-0.5"><CheckCheck className="w-3 h-3" /> added</span>}
      </div>
    </div>
  );
}

function Slot({ title, icon: Icon, filled, hint, children }: {
  title: string; icon: typeof Truck; filled: boolean; hint: string; children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border p-3 transition-colors min-h-[78px]",
      filled ? "border-border bg-muted/30" : "border-dashed border-border/70 bg-muted/10")}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
        <Icon className="w-3 h-3" /> {title}
      </div>
      {filled ? children : <div className="text-xs text-muted-foreground flex items-center gap-1"><Plus className="w-3 h-3" /> {hint}</div>}
    </div>
  );
}

function TripMap({ trip }: { trip: ConfirmedTrip | null }) {
  const stops = trip?.stops ?? [];
  return (
    <div className="relative flex-1 min-h-[380px] bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.4" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#grid)" />
        {stops.length > 1 && stops.every(s => s.latitude && s.longitude) && (() => {
          const lats  = stops.map(s => s.latitude!);
          const lngs  = stops.map(s => s.longitude!);
          const minLat = Math.min(...lats), maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
          const toX = (lng: number) => ((lng - minLng) / ((maxLng - minLng) || 1)) * 360 + 20;
          const toY = (lat: number) => 280 - ((lat - minLat) / ((maxLat - minLat) || 1)) * 260;
          return (
            <>
              <polyline
                points={stops.map(s => `${toX(s.longitude!)},${toY(s.latitude!)}`).join(" ")}
                fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 3"
              />
              {stops.map((s, i) => (
                <g key={s.docNum}>
                  <circle cx={toX(s.longitude!)} cy={toY(s.latitude!)} r="9"
                    fill={s.stopType === "DROP" ? "#e11d48" : "#0284c7"} stroke="white" strokeWidth="2" />
                  <text x={toX(s.longitude!)} y={toY(s.latitude!) + 3} textAnchor="middle"
                    fill="white" fontSize="9" fontWeight="700">{i + 1}</text>
                </g>
              ))}
            </>
          );
        })()}
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
          <div className="font-semibold">{trip.vehicle.vehicleNumber} · {trip.driver.driverName}</div>
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

function TripList({ trip }: { trip: ConfirmedTrip | null }) {
  if (!trip) return <div className="p-10 text-center text-muted-foreground text-sm flex-1">Select a trip to see its stops</div>;
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 sticky top-0">
          <tr className="text-left text-muted-foreground">
            {["#", "Type", "Doc", "Customer", "Address", "City", "Priority", "Packs", "Weight"].map((h) => (
              <th key={h} className="px-2.5 py-2 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trip.stops.map((s, i) => {
            const pl = priorityLabel(s.priority);
            return (
              <tr key={s.docNum} className="border-t border-border/40 hover:bg-muted/30">
                <td className="px-2.5 py-2 font-mono font-semibold">{i + 1}</td>
                <td className="px-2.5 py-2">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold",
                    s.stopType === "DROP" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700")}>
                    {s.stopType}
                  </span>
                </td>
                <td className="px-2.5 py-2 font-mono text-primary">{s.docNum}</td>
                <td className="px-2.5 py-2 font-medium">{s.bpName}</td>
                <td className="px-2.5 py-2 text-muted-foreground">{s.addLine1}</td>
                <td className="px-2.5 py-2">{s.city}</td>
                <td className="px-2.5 py-2">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", priorityClass(pl))}>{pl}</span>
                </td>
                <td className="px-2.5 py-2 font-mono">{s.nbPack ?? "-"}</td>
                <td className="px-2.5 py-2 font-mono">{s.netWeight != null ? `${s.netWeight}${s.weightUnit ?? ""}` : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
