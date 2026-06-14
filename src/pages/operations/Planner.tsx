import { useMemo, useState, useCallback, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Users, Calendar as CalIcon, Building2, Search,
  MapPin, Route as RouteIcon, ArrowDownToLine, ArrowUpFromLine,
  CheckCheck, X, Play, Map as MapIcon, List, GripVertical,
  Loader2, Trash2, Lock, Unlock, RefreshCw, ChevronDown,
  Package, AlertCircle, Info, Eye, Zap, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ═══════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════

const SITES = [
  { id: "62000", name: "Site 62000 – Chicago Hub" },
  { id: "62100", name: "Site 62100 – North Distribution" },
  { id: "62200", name: "Site 62200 – South Depot" },
];

type Vehicle = {
  code: string; vehicleNo: string; departureSite: string; arrivalSite: string;
  driverName: string; category: string; capacity: number; vol: number;
  maxOrders: number; startTime: string; site: string;
};
const VEHICLES: Vehicle[] = [
  { code: "CH200", vehicleNo: "CO5000509801", departureSite: "62000", arrivalSite: "62000", driverName: "",         category: "CH100", capacity: 2600, vol: 40, maxOrders: 20, startTime: "07:00", site: "62000" },
  { code: "CH201", vehicleNo: "CO5000509812", departureSite: "62000", arrivalSite: "62000", driverName: "",         category: "CH100", capacity: 2600, vol: 40, maxOrders: 20, startTime: "07:00", site: "62000" },
  { code: "CH202", vehicleNo: "CO5000509824", departureSite: "62000", arrivalSite: "62000", driverName: "",         category: "CH100", capacity: 3000, vol: 60, maxOrders: 30, startTime: "06:30", site: "62000" },
  { code: "CH203", vehicleNo: "CO5000509839", departureSite: "62000", arrivalSite: "62000", driverName: "",         category: "CH100", capacity: 2200, vol: 35, maxOrders: 18, startTime: "07:00", site: "62000" },
  { code: "CH204", vehicleNo: "CO5000509848", departureSite: "62000", arrivalSite: "62000", driverName: "",         category: "CH100", capacity: 5000, vol: 80, maxOrders: 10, startTime: "05:00", site: "62000" },
  { code: "ND101", vehicleNo: "CO5000600101", departureSite: "62100", arrivalSite: "62100", driverName: "",         category: "VAN",   capacity: 1200, vol: 20, maxOrders: 12, startTime: "07:30", site: "62100" },
];

type Driver = { id: string; name: string; license: string; status: "Available" | "On Trip"; hoursToday: number; };
const DRIVERS: Driver[] = [
  { id: "DR-001", name: "Holder",      license: "CDL-A", status: "Available", hoursToday: 4.5 },
  { id: "DR-002", name: "Nabil Leroy", license: "CDL-A", status: "Available", hoursToday: 2.0 },
  { id: "DR-003", name: "Sarah Miles", license: "CDL-B", status: "Available", hoursToday: 6.5 },
  { id: "DR-004", name: "Mike Rivera", license: "CDL-A", status: "On Trip",   hoursToday: 9.0 },
  { id: "DR-005", name: "Lisa Brown",  license: "CDL-B", status: "Available", hoursToday: 1.0 },
  { id: "DR-006", name: "Tom Hayes",   license: "CDL-A", status: "On Trip",   hoursToday: 8.5 },
];

type Stop = {
  id: string; type: "DROP" | "PICKUP"; txn: string; prepList: string;
  pairedDoc: string; doctype: string; client: string; bpcode: string;
  address: string; city: string; postalCity: string; site: string;
  priority: "NORMAL" | "URGENT" | "LOW"; routeCode: string;
  qty: number; netweight: number; vol: number;
  dlvyStatus: "open" | "Allocated" | "8";
  lat: number; lng: number;
};
const ALL_STOPS: Stop[] = [
  { id:"S01", type:"DROP",   txn:"PIC620001267", prepList:"PCKT", pairedDoc:"",        doctype:"Corporate", client:"Midland Tools",    bpcode:"CH107", address:"12 State St",      city:"Chicago",    postalCity:"60142, Huntley",    site:"62000", priority:"NORMAL", routeCode:"Route code 1", qty:6,  netweight:240, vol:8,  dlvyStatus:"open",      lat:32, lng:75 },
  { id:"S02", type:"DROP",   txn:"PIC620001246", prepList:"PCKT", pairedDoc:"",        doctype:"Corporate", client:"The Home Depot",   bpcode:"CH100", address:"88 Michigan Ave",  city:"Chicago",    postalCity:"60532, Lisle",      site:"62000", priority:"URGENT", routeCode:"Route code 1", qty:4,  netweight:180, vol:6,  dlvyStatus:"open",      lat:48, lng:145 },
  { id:"S03", type:"DROP",   txn:"PIC620001288", prepList:"PCKT", pairedDoc:"",        doctype:"Corporate", client:"Northern Supply",  bpcode:"CH101", address:"5 Wacker Dr",      city:"Chicago",    postalCity:"60611, Loop",       site:"62000", priority:"NORMAL", routeCode:"Route code 2", qty:9,  netweight:360, vol:12, dlvyStatus:"open",      lat:68, lng:92 },
  { id:"S04", type:"DROP",   txn:"PIC620001301", prepList:"PCKT", pairedDoc:"",        doctype:"Corporate", client:"Vista Corp",       bpcode:"CH102", address:"201 W Jackson",    city:"Chicago",    postalCity:"60606, Loop",       site:"62000", priority:"NORMAL", routeCode:"Route code 3", qty:5,  netweight:220, vol:7,  dlvyStatus:"Allocated", lat:92, lng:198 },
  { id:"S05", type:"DROP",   txn:"PIC620001315", prepList:"PCKT", pairedDoc:"",        doctype:"Corporate", client:"Metro Goods",      bpcode:"CH103", address:"77 Bridge Rd",     city:"Evanston",   postalCity:"60202, Evanston",   site:"62000", priority:"URGENT", routeCode:"Route code 1", qty:12, netweight:480, vol:16, dlvyStatus:"open",      lat:58, lng:178 },
  { id:"S06", type:"DROP",   txn:"PIC620001322", prepList:"PCKT", pairedDoc:"",        doctype:"Corporate", client:"Pacific Ltd",      bpcode:"CH104", address:"30 Lake Shore",    city:"Wilmette",   postalCity:"60091, Wilmette",   site:"62000", priority:"LOW",    routeCode:"Route code 2", qty:3,  netweight:120, vol:4,  dlvyStatus:"Allocated", lat:38, lng:255 },
  { id:"S07", type:"DROP",   txn:"PIC620001338", prepList:"PCKT", pairedDoc:"",        doctype:"Corporate", client:"Summit Retail",    bpcode:"CH105", address:"44 Oak Ave",       city:"Oak Park",   postalCity:"60301, Oak Park",   site:"62000", priority:"NORMAL", routeCode:"Route code 4", qty:7,  netweight:280, vol:9,  dlvyStatus:"open",      lat:33, lng:325 },
  { id:"S08", type:"PICKUP", txn:"PIC620001350", prepList:"PCKT", pairedDoc:"S01",     doctype:"Corporate", client:"Midland Tools",    bpcode:"CH107", address:"Port Terminal B",  city:"Joliet",     postalCity:"60432, Joliet",     site:"62000", priority:"URGENT", routeCode:"Route code 1", qty:8,  netweight:310, vol:11, dlvyStatus:"open",      lat:53, lng:248 },
  { id:"S09", type:"PICKUP", txn:"PIC620001362", prepList:"PCKT", pairedDoc:"",        doctype:"Corporate", client:"South Inc",        bpcode:"CH106", address:"9 Glassboro Way",  city:"Naperville", postalCity:"60540, Naperville", site:"62000", priority:"NORMAL", routeCode:"Route code 2", qty:3,  netweight:130, vol:4,  dlvyStatus:"open",      lat:78, lng:308 },
  { id:"S10", type:"DROP",   txn:"PIC621000101", prepList:"PCKT", pairedDoc:"",        doctype:"Corporate", client:"Riverline LLC",    bpcode:"ND001", address:"44 Dock Rd",       city:"Skokie",     postalCity:"60077, Skokie",     site:"62100", priority:"LOW",    routeCode:"Route code 1", qty:7,  netweight:280, vol:9,  dlvyStatus:"open",      lat:35, lng:328 },
];

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
type TripStatus = "Open" | "Optimized" | "Locked" | "Confirmed";
type Trip = {
  id: string; routeCode: string; seq: number;
  vehicle: Vehicle; driver: Driver; stops: Stop[];
  distanceKm: number; travelTimeMin: number; totalWeight: number; totalVol: number;
  totalQty: number; pickups: number; deliveries: number;
  status: TripStatus; locked: boolean; tmsValidated: boolean;
  createdAt: string; departSite: string; arrivalSite: string;
};

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
const priorityColor = (p: Stop["priority"]) =>
  p === "URGENT" ? "bg-rose-100 text-rose-800 border-rose-200"
  : p === "LOW"    ? "bg-slate-100 text-slate-600 border-slate-200"
  : "bg-green-100 text-green-800 border-green-200";

const statusColor = (s: TripStatus) => ({
  Open:      "bg-sky-100 text-sky-800",
  Optimized: "bg-violet-100 text-violet-800",
  Locked:    "bg-orange-100 text-orange-800",
  Confirmed: "bg-emerald-100 text-emerald-800",
}[s]);

const hoursColor = (h: number) =>
  h >= 10 ? "text-rose-600" : h >= 8 ? "text-amber-600" : "text-emerald-600";

const dlvyColor = (s: Stop["dlvyStatus"]) =>
  s === "open" ? "text-emerald-700" : "text-amber-700";

// ═══════════════════════════════════════════════════════
// SITE SELECT
// ═══════════════════════════════════════════════════════
function SiteSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[220px]">
        <SelectValue placeholder="Select site…" />
      </SelectTrigger>
      <SelectContent>
        {SITES.map((s) => (
          <SelectItem key={s.id} value={s.id}>{s.id} — {s.name.split("–")[1]?.trim()}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ═══════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════
function KpiCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: typeof Truck }) {
  return (
    <div className={cn("rounded-lg px-4 py-3 text-white flex items-center justify-between shadow-sm", color)}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75">{label}</p>
        <p className="text-2xl font-bold leading-none mt-1">{value}</p>
      </div>
      <Icon className="w-6 h-6 text-white/50" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STOP ROW — used in drops/pickups table
// ═══════════════════════════════════════════════════════
function StopRow({
  stop, selected, onToggle, onDragStart, dragging,
}: {
  stop: Stop; selected: boolean; onToggle: () => void;
  onDragStart: (e: DragEvent) => void; dragging: boolean;
}) {
  return (
    <tr
      draggable
      onDragStart={onDragStart}
      onClick={onToggle}
      className={cn(
        "border-b border-border/40 cursor-pointer transition-colors select-none group",
        selected ? "bg-primary/8" : "hover:bg-muted/50",
        dragging && "opacity-50"
      )}
    >
      <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggle} />
      </td>
      <td className="px-2 py-1.5 font-mono text-[11px] text-primary font-semibold whitespace-nowrap">{stop.txn}</td>
      <td className="px-2 py-1.5 text-[11px] text-muted-foreground">{stop.prepList}</td>
      <td className="px-2 py-1.5 text-[11px]">
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold", priorityColor(stop.priority))}>{stop.priority}</span>
      </td>
      <td className="px-2 py-1.5 text-[11px] text-muted-foreground font-mono">{stop.bpcode}</td>
      <td className="px-2 py-1.5 text-[11px] font-medium max-w-[120px] truncate">{stop.client}</td>
      <td className="px-2 py-1.5 text-[11px] text-muted-foreground">{stop.routeCode}</td>
      <td className="px-2 py-1.5 text-[11px] text-muted-foreground max-w-[100px] truncate">{stop.postalCity}</td>
      <td className="px-2 py-1.5 text-[11px] font-mono">{stop.qty}</td>
      <td className="px-2 py-1.5 text-[11px] font-mono">{stop.netweight}</td>
      <td className="px-2 py-1.5">
        <GripVertical className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════
// MAP VIEW
// ═══════════════════════════════════════════════════════
function RouteMapView({ trip }: { trip: Trip | null }) {
  if (!trip) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50/50 min-h-[320px]">
        <div className="text-center">
          <MapIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a trip to preview its route</p>
        </div>
      </div>
    );
  }
  const stops = trip.stops;
  return (
    <div className="relative flex-1 min-h-[320px] bg-gradient-to-br from-blue-50/60 via-sky-50/40 to-indigo-50/50 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 300" preserveAspectRatio="none">
        <defs>
          <pattern id="mapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.4" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="420" height="300" fill="url(#mapGrid)" />
        {stops.length > 1 && (
          <polyline
            points={stops.map((s) => `${Math.min(s.lng * 1.2, 410)},${Math.min(s.lat * 1.12, 290)}`).join(" ")}
            fill="none" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6 3" opacity="0.7"
          />
        )}
        {stops.map((s, i) => {
          const cx = Math.min(s.lng * 1.2, 410);
          const cy = Math.min(s.lat * 1.12, 290);
          const color = s.type === "DROP" ? "#e11d48" : "#0284c7";
          return (
            <g key={s.id}>
              <circle cx={cx} cy={cy} r="12" fill={color} opacity="0.15" />
              <circle cx={cx} cy={cy} r="8" fill={color} stroke="white" strokeWidth="2" />
              <text x={cx} y={cy + 3.5} textAnchor="middle" fill="white" fontSize="8" fontWeight="700">{i + 1}</text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg border border-border/60 px-3 py-2 text-[11px] flex items-center gap-4">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Drop</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" /> Pickup</span>
      </div>
      {/* Trip info */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-lg border border-border/60 px-3 py-2 text-xs">
        <p className="font-semibold">{trip.vehicle.code} · {trip.driver.name}</p>
        <p className="text-muted-foreground mt-0.5">{trip.distanceKm} km · {Math.floor(trip.travelTimeMin / 60)}h {trip.travelTimeMin % 60}m · {stops.length} stops</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STOP LIST VIEW (for selected trip)
// ═══════════════════════════════════════════════════════
function TripStopListView({ trip }: { trip: Trip | null }) {
  if (!trip) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[320px]">
        <p className="text-sm text-muted-foreground">Select a trip to see its stops</p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-auto min-h-[320px]">
      <table className="w-full text-xs min-w-[600px]">
        <thead className="bg-muted/40 sticky top-0 z-10">
          <tr>
            {["Seq","Type","Txn","Client","Address","City","Route","Priority","Qty","Weight"].map((h) => (
              <th key={h} className="px-2.5 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap border-b border-border/50">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trip.stops.map((s, i) => (
            <tr key={s.id} className={cn("border-b border-border/30 hover:bg-muted/30", i % 2 === 0 ? "" : "bg-muted/10")}>
              <td className="px-2.5 py-1.5 font-mono font-bold text-center">{i + 1}</td>
              <td className="px-2.5 py-1.5">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold",
                  s.type === "DROP" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700")}>{s.type}</span>
              </td>
              <td className="px-2.5 py-1.5 font-mono text-primary">{s.txn}</td>
              <td className="px-2.5 py-1.5 font-medium">{s.client}</td>
              <td className="px-2.5 py-1.5 text-muted-foreground max-w-[120px] truncate">{s.address}</td>
              <td className="px-2.5 py-1.5">{s.city}</td>
              <td className="px-2.5 py-1.5 text-muted-foreground text-[10px]">{s.routeCode}</td>
              <td className="px-2.5 py-1.5">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold", priorityColor(s.priority))}>{s.priority}</span>
              </td>
              <td className="px-2.5 py-1.5 font-mono">{s.qty}</td>
              <td className="px-2.5 py-1.5 font-mono">{s.netweight} kg</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-muted/20 border-t-2 border-border">
          <tr>
            <td colSpan={8} className="px-2.5 py-1.5 text-xs font-semibold text-right text-muted-foreground">Totals:</td>
            <td className="px-2.5 py-1.5 font-mono font-bold text-xs">{trip.totalQty}</td>
            <td className="px-2.5 py-1.5 font-mono font-bold text-xs">{trip.totalWeight} kg</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function Planner() {
  // ── Toolbar state ─────────────────────────────────────
  const [site, setSite]         = useState("62000");
  const [date, setDate]         = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);

  // ── Search strings ────────────────────────────────────
  const [vehSearch, setVehSearch]   = useState("");
  const [drvSearch, setDrvSearch]   = useState("");
  const [dropSearch, setDropSearch] = useState("");
  const [pickSearch, setPickSearch] = useState("");
  const [tripSearch, setTripSearch] = useState("");

  // ── Active draft ──────────────────────────────────────
  const [draftVehicle, setDraftVehicle] = useState<Vehicle | null>(null);
  const [draftDriver,  setDraftDriver]  = useState<Driver  | null>(null);
  const [draftStopIds, setDraftStopIds] = useState<string[]>([]);

  // ── Drag state ────────────────────────────────────────
  const [dragStopIds, setDragStopIds] = useState<string[]>([]);  // stops being dragged
  const [dropZoneActive, setDropZoneActive] = useState(false);

  // ── Confirmed trips ───────────────────────────────────
  const [trips, setTrips]                   = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripView, setTripView]             = useState<"map" | "list">("map");

  // ── Filters ───────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stopTypeTab, setStopTypeTab]   = useState<"drops" | "pickups">("drops");
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(new Set()); // multi-select in tables

  // ── Load data ──────────────────────────────────────────
  function handleLoad() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLoaded(true);
      setDraftVehicle(null); setDraftDriver(null); setDraftStopIds([]);
      setSelectedStopIds(new Set());
      toast({ title: "Data loaded", description: `Site ${site} · ${date}` });
    }, 600);
  }

  // ── Derived datasets ───────────────────────────────────
  const usedStopIds = useMemo(() => new Set(trips.flatMap((t) => t.stops.map((s) => s.id))), [trips]);

  const vehicles = useMemo(() =>
    VEHICLES.filter((v) =>
      v.site === site &&
      (!vehSearch || `${v.code} ${v.vehicleNo} ${v.category}`.toLowerCase().includes(vehSearch.toLowerCase()))
    ), [site, vehSearch]);

  const drivers = useMemo(() =>
    DRIVERS.filter((d) =>
      !drvSearch || `${d.id} ${d.name}`.toLowerCase().includes(drvSearch.toLowerCase())
    ), [drvSearch]);

  const availableStops = useMemo(() =>
    ALL_STOPS.filter((s) => s.site === site && !usedStopIds.has(s.id)),
    [site, usedStopIds]);

  const drops = useMemo(() =>
    availableStops.filter((s) =>
      s.type === "DROP" &&
      (!dropSearch || `${s.txn} ${s.client} ${s.city} ${s.routeCode} ${s.bpcode}`.toLowerCase().includes(dropSearch.toLowerCase()))
    ), [availableStops, dropSearch]);

  const pickups = useMemo(() =>
    availableStops.filter((s) =>
      s.type === "PICKUP" &&
      (!pickSearch || `${s.txn} ${s.client} ${s.city} ${s.routeCode} ${s.bpcode}`.toLowerCase().includes(pickSearch.toLowerCase()))
    ), [availableStops, pickSearch]);

  const draftStops = useMemo(() =>
    ALL_STOPS.filter((s) => draftStopIds.includes(s.id)),
    [draftStopIds]);

  const filteredTrips = useMemo(() =>
    trips.filter((t) =>
      (statusFilter === "all" || t.status === statusFilter) &&
      (!tripSearch || `${t.id} ${t.routeCode} ${t.vehicle.code} ${t.driver.name}`.toLowerCase().includes(tripSearch.toLowerCase()))
    ), [trips, statusFilter, tripSearch]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;

  // KPIs
  const kpis = useMemo(() => ({
    vehicles: vehicles.length,
    trips: trips.length,
    assignedDocs: trips.reduce((n, t) => n + t.stops.length, 0),
    unassignedDocs: availableStops.length,
    totalDeliveryQty: drops.reduce((n, s) => n + s.qty, 0),
    totalPickupQty: pickups.reduce((n, s) => n + s.qty, 0),
  }), [vehicles, trips, availableStops, drops, pickups]);

  // ── Draft actions ──────────────────────────────────────
  const addStopsToDraft = useCallback((ids: string[]) => {
    setDraftStopIds((prev) => {
      const next = [...prev];
      ids.forEach((id) => { if (!next.includes(id)) next.push(id); });
      return next;
    });
  }, []);

  const toggleSelectedStop = useCallback((id: string) => {
    setSelectedStopIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAllStops = useCallback((stops: Stop[]) => {
    setSelectedStopIds((prev) => {
      const allIds = stops.map((s) => s.id);
      const allSelected = allIds.every((id) => prev.has(id));
      const next = new Set(prev);
      allIds.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }, []);

  // Drag from table
  function onStopsDragStart(e: DragEvent, stopIds: string[]) {
    setDragStopIds(stopIds);
    e.dataTransfer.setData("text/stop-ids", JSON.stringify(stopIds));
    e.dataTransfer.effectAllowed = "copy";
  }

  // Drag vehicle row
  function onVehicleDragStart(e: DragEvent, v: Vehicle) {
    e.dataTransfer.setData("text/vehicle-code", v.code);
    e.dataTransfer.effectAllowed = "move";
  }

  // Drag driver row
  function onDriverDragStart(e: DragEvent, d: Driver) {
    e.dataTransfer.setData("text/driver-id", d.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onActivePanelDrop(e: DragEvent) {
    e.preventDefault();
    setDropZoneActive(false);

    const vehicleCode = e.dataTransfer.getData("text/vehicle-code");
    const driverId    = e.dataTransfer.getData("text/driver-id");
    const stopIdsRaw  = e.dataTransfer.getData("text/stop-ids");

    if (vehicleCode) {
      const v = VEHICLES.find((x) => x.code === vehicleCode);
      if (v) setDraftVehicle(v);
    }
    if (driverId) {
      const d = DRIVERS.find((x) => x.id === driverId);
      if (d) {
        if (d.status !== "Available") { toast({ title: "Driver unavailable", description: `${d.name} is on a trip.` }); return; }
        setDraftDriver(d);
      }
    }
    if (stopIdsRaw) {
      try { addStopsToDraft(JSON.parse(stopIdsRaw)); } catch {}
    }
    setDragStopIds([]);
  }

  function clearDraft() {
    setDraftVehicle(null); setDraftDriver(null); setDraftStopIds([]);
  }

  function addSelectedStopsToDraft() {
    addStopsToDraft(Array.from(selectedStopIds));
    setSelectedStopIds(new Set());
    toast({ title: `${selectedStopIds.size} stop(s) added to active trip` });
  }

  function confirmTrip() {
    if (!draftVehicle) return toast({ title: "Select a vehicle", description: "Click a vehicle row to assign." });
    if (!draftDriver)  return toast({ title: "Assign a driver",  description: "Drag a driver or click a driver row." });
    if (!draftStopIds.length) return toast({ title: "Add stops", description: "Select drops/pickups and add to trip." });

    const totalWeight = draftStops.reduce((n, s) => n + s.netweight, 0);
    const totalVol    = draftStops.reduce((n, s) => n + s.vol, 0);
    const totalQty    = draftStops.reduce((n, s) => n + s.qty, 0);
    const deliveries  = draftStops.filter((s) => s.type === "DROP").length;
    const pickupCount = draftStops.filter((s) => s.type === "PICKUP").length;
    const newId       = `XVR-${date.replace(/-/g, "")}-${site}-${String(trips.length + 1).padStart(3, "0")}`;

    const trip: Trip = {
      id: newId,
      routeCode: `Route code ${trips.length + 1}`,
      seq: trips.length + 1,
      vehicle: draftVehicle, driver: draftDriver, stops: draftStops,
      distanceKm: Math.round(40 + draftStops.length * 12 + Math.random() * 30),
      travelTimeMin: Math.round(60 + draftStops.length * 18),
      totalWeight, totalVol, totalQty, deliveries, pickups: pickupCount,
      status: "Open", locked: false, tmsValidated: false,
      createdAt: new Date().toLocaleTimeString(),
      departSite: site, arrivalSite: site,
    };
    setTrips((prev) => [...prev, trip]);
    setSelectedTripId(trip.id);
    clearDraft();
    toast({ title: "Trip confirmed", description: `${newId} · ${draftStops.length} stops · ${totalWeight} kg` });
  }

  // ── Trip row actions ───────────────────────────────────
  function selectTrip(t: Trip) {
    setSelectedTripId(t.id);
    // load trip stops back into active panel for viewing
    setDraftVehicle(t.vehicle);
    setDraftDriver(t.driver);
    setDraftStopIds(t.stops.map((s) => s.id));
  }

  function lockTrip(id: string) {
    setTrips((prev) => prev.map((t) =>
      t.id === id ? { ...t, locked: !t.locked, status: t.locked ? "Optimized" : "Locked" } : t
    ));
  }
  function deleteTrip(id: string) {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    if (selectedTripId === id) { setSelectedTripId(null); clearDraft(); }
    toast({ title: "Trip removed" });
  }

  // ── Render ─────────────────────────────────────────────
  const currentStops = stopTypeTab === "drops" ? drops : pickups;
  const currentSearch = stopTypeTab === "drops" ? dropSearch : pickSearch;
  const setCurrentSearch = stopTypeTab === "drops" ? setDropSearch : setPickSearch;
  const allCurrentSelected = currentStops.length > 0 && currentStops.every((s) => selectedStopIds.has(s.id));

  return (
    <div className="space-y-3 bg-background min-h-full">

      {/* ── TOOLBAR ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border/60 shadow-sm p-3 flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Site</label>
          <SiteSelect value={site} onChange={setSite} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</label>
          <div className="relative">
            <CalIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="h-9 pl-8 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
        <Button onClick={handleLoad} disabled={loading} className="h-9">
          {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
          {loaded ? "Refresh" : "Load Data"}
        </Button>
        {loaded && (
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            Site <span className="font-mono font-semibold text-foreground">{site}</span> ·
            <span className="font-mono text-foreground">{date}</span>
          </div>
        )}
      </motion.div>

      {!loaded ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-20 text-center">
          <RouteIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-foreground">Select a site and date, then click <span className="text-primary">Load Data</span></p>
          <p className="text-sm text-muted-foreground mt-1">Vehicles, drivers, drops and pickups will appear below.</p>
        </div>
      ) : (
        <>
          {/* ── KPI STRIP ──────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <KpiCard label="Vehicles"          value={kpis.vehicles}       icon={Truck}           color="bg-gradient-to-br from-slate-500 to-slate-700" />
            <KpiCard label="Trips"             value={kpis.trips}          icon={RouteIcon}       color="bg-gradient-to-br from-indigo-500 to-indigo-700" />
            <KpiCard label="Assigned Docs"     value={kpis.assignedDocs}   icon={CheckCheck}      color="bg-gradient-to-br from-emerald-500 to-emerald-700" />
            <KpiCard label="Non-Assigned Docs" value={kpis.unassignedDocs} icon={AlertCircle}     color="bg-gradient-to-br from-amber-500 to-amber-600" />
            <KpiCard label="Total Delivery Qty"value={kpis.totalDeliveryQty} icon={ArrowDownToLine} color="bg-gradient-to-br from-rose-500 to-rose-600" />
            <KpiCard label="Total Pickup Qty"  value={kpis.totalPickupQty} icon={ArrowUpFromLine}  color="bg-gradient-to-br from-sky-500 to-sky-600" />
          </div>

          {/* ── TOP SECTION: Vehicles | Drivers | Drops/Pickups ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_220px_1fr] gap-3">

            {/* VEHICLES TABLE */}
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-border/60 bg-gradient-to-r from-slate-600 to-slate-700 flex items-center gap-2">
                <Truck className="w-4 h-4 text-white" />
                <h3 className="text-sm font-semibold text-white">Vehicles</h3>
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2">{vehicles.length}</span>
              </div>
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={vehSearch} onChange={(e) => setVehSearch(e.target.value)} placeholder="Search…" className="h-7 pl-7 text-xs" />
                </div>
              </div>
              <div className="overflow-auto flex-1" style={{ maxHeight: 260 }}>
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      {["Vehicle Code","Vehicle No","Category","Start"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40 text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => {
                      const sel = draftVehicle?.code === v.code;
                      return (
                        <tr key={v.code}
                          draggable onDragStart={(e) => onVehicleDragStart(e, v)}
                          onClick={() => setDraftVehicle(sel ? null : v)}
                          className={cn(
                            "border-b border-border/30 cursor-pointer transition-colors select-none",
                            sel ? "bg-emerald-50 border-l-2 border-l-emerald-500" : "hover:bg-muted/50"
                          )}
                        >
                          <td className="px-2 py-1.5 font-mono font-bold text-[11px]" style={{ color: sel ? "#16a34a" : "#2563eb" }}>{v.code}</td>
                          <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{v.vehicleNo}</td>
                          <td className="px-2 py-1.5 text-[10px]">{v.category}</td>
                          <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{v.startTime}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DRIVERS TABLE */}
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-border/60 bg-gradient-to-r from-indigo-600 to-indigo-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <h3 className="text-sm font-semibold text-white">Drivers</h3>
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2">{drivers.length}</span>
                <span className="text-[9px] text-white/60 ml-auto">drag → active</span>
              </div>
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={drvSearch} onChange={(e) => setDrvSearch(e.target.value)} placeholder="Search…" className="h-7 pl-7 text-xs" />
                </div>
              </div>
              <div className="overflow-auto flex-1 px-2 pb-2 space-y-1" style={{ maxHeight: 260 }}>
                {drivers.map((d) => {
                  const busy = d.status !== "Available";
                  const sel  = draftDriver?.id === d.id;
                  return (
                    <div key={d.id}
                      draggable={!busy}
                      onDragStart={(e) => onDriverDragStart(e, d)}
                      onClick={() => { if (!busy) setDraftDriver(sel ? null : d); }}
                      className={cn(
                        "rounded-lg border p-2 flex items-center gap-2 transition-colors select-none",
                        sel  ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300"
                             : busy ? "opacity-50 border-border/40 bg-muted/20"
                             : "border-border/50 bg-card cursor-grab hover:border-indigo-300 hover:bg-indigo-50/40"
                      )}
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{d.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{d.id} · {d.license}</p>
                        <p className={cn("text-[10px] font-semibold", hoursColor(d.hoursToday))}>{d.hoursToday}h today</p>
                      </div>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0",
                        busy ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>{busy ? "On Trip" : "Avail"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DROPS / PICKUPS TABLE */}
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
              {/* Tab header */}
              <div className="flex border-b border-border/60">
                <button
                  onClick={() => setStopTypeTab("drops")}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors",
                    stopTypeTab === "drops"
                      ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Deliveries <span className={cn("text-[10px] rounded-full px-2", stopTypeTab === "drops" ? "bg-white/20 text-white" : "bg-border/40")}>{drops.length}</span>
                </button>
                <button
                  onClick={() => setStopTypeTab("pickups")}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors",
                    stopTypeTab === "pickups"
                      ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                  Pickups <span className={cn("text-[10px] rounded-full px-2", stopTypeTab === "pickups" ? "bg-white/20 text-white" : "bg-border/40")}>{pickups.length}</span>
                </button>
              </div>

              {/* Toolbar row */}
              <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={currentSearch} onChange={(e) => setCurrentSearch(e.target.value)} placeholder="Search…" className="h-7 pl-7 text-xs" />
                </div>
                {selectedStopIds.size > 0 && (
                  <Button size="sm" className="h-7 text-xs" onClick={addSelectedStopsToDraft}>
                    Add {selectedStopIds.size} to Trip
                  </Button>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  drag row(s) or select + Add
                </span>
              </div>

              {/* Table */}
              <div className="overflow-auto flex-1" style={{ maxHeight: 260 }}>
                <table className="w-full text-xs min-w-[680px]">
                  <thead className="bg-muted/40 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1.5 border-b border-border/40">
                        <Checkbox
                          checked={allCurrentSelected}
                          onCheckedChange={() => toggleAllStops(currentStops)}
                        />
                      </th>
                      {["Transaction No","Prep List","Priority","Client Code","Client","Route Code","Postal City","Qty","Weight",""].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentStops.map((s) => (
                      <StopRow
                        key={s.id} stop={s}
                        selected={selectedStopIds.has(s.id)}
                        onToggle={() => toggleSelectedStop(s.id)}
                        dragging={dragStopIds.includes(s.id)}
                        onDragStart={(e) => {
                          const ids = selectedStopIds.has(s.id) && selectedStopIds.size > 1
                            ? Array.from(selectedStopIds)
                            : [s.id];
                          onStopsDragStart(e, ids);
                        }}
                      />
                    ))}
                    {currentStops.length === 0 && (
                      <tr><td colSpan={11} className="px-3 py-8 text-center text-xs text-muted-foreground">No {stopTypeTab} available</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── ACTIVE TRIP BUILDER (middle row) ─────────────── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDropZoneActive(true); }}
            onDragLeave={() => setDropZoneActive(false)}
            onDrop={onActivePanelDrop}
            className={cn(
              "bg-card rounded-xl border-2 shadow-sm overflow-hidden transition-colors",
              dropZoneActive ? "border-primary bg-primary/3" : "border-dashed border-border/60"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <Play className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Active Tour</h3>
                {dropZoneActive && <span className="text-xs text-primary animate-pulse">Drop here…</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={clearDraft}
                  disabled={!draftVehicle && !draftDriver && !draftStopIds.length}>
                  <Trash2 className="w-3 h-3" /> Clear
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1" onClick={confirmTrip}>
                  <CheckCheck className="w-3 h-3" /> Confirm Trip
                </Button>
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto_auto_auto_auto_auto_auto_auto] gap-px bg-border/20 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/40">
              {["Vehicle","Driver","Trailer","Depart Site","Arrival Site","Seq","Travel Time","Distance","Total Weight","Total Vol","Total Qty","Pickups","Deliveries","Stops"].map((h) => (
                <div key={h} className="bg-muted/30 px-3 py-1.5 whitespace-nowrap">{h}</div>
              ))}
            </div>

            {/* Active row */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto_auto_auto_auto_auto_auto_auto_auto] gap-px bg-border/10 min-h-[44px]">
              {/* Vehicle */}
              <div className="bg-card px-3 py-2 flex items-center gap-2">
                {draftVehicle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-mono font-bold text-sm text-emerald-700">{draftVehicle.code}</span>
                    <span className="text-[10px] text-muted-foreground">{draftVehicle.vehicleNo}</span>
                    <button onClick={() => setDraftVehicle(null)} className="ml-auto text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : <span className="text-xs text-muted-foreground/50 italic">Click / drag vehicle</span>}
              </div>
              {/* Driver */}
              <div className="bg-card px-3 py-2 flex items-center gap-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.stopPropagation(); const id = e.dataTransfer.getData("text/driver-id"); const d = DRIVERS.find((x) => x.id === id); if (d) setDraftDriver(d); }}
              >
                {draftDriver ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-semibold text-sm">{draftDriver.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{draftDriver.id}</span>
                    <button onClick={() => setDraftDriver(null)} className="ml-auto text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : <span className="text-xs text-muted-foreground/50 italic">Drag driver here</span>}
              </div>
              {/* Static fields */}
              <div className="bg-card px-3 py-2 text-xs text-muted-foreground/40">—</div>
              <div className="bg-card px-3 py-2 text-xs font-mono">{draftVehicle ? draftVehicle.departureSite : "—"}</div>
              <div className="bg-card px-3 py-2 text-xs font-mono">{draftVehicle ? draftVehicle.arrivalSite : "—"}</div>
              <div className="bg-card px-3 py-2 text-xs font-mono text-center">{draftStopIds.length > 0 ? draftStops.length : "—"}</div>
              <div className="bg-card px-3 py-2 text-xs text-muted-foreground">—</div>
              <div className="bg-card px-3 py-2 text-xs text-muted-foreground">—</div>
              <div className="bg-card px-3 py-2 text-xs font-mono font-semibold">{draftStops.reduce((n, s) => n + s.netweight, 0) || "—"}</div>
              <div className="bg-card px-3 py-2 text-xs font-mono">{draftStops.reduce((n, s) => n + s.vol, 0) || "—"}</div>
              <div className="bg-card px-3 py-2 text-xs font-mono font-semibold">{draftStops.reduce((n, s) => n + s.qty, 0) || "—"}</div>
              <div className="bg-card px-3 py-2 text-xs font-mono">{draftStops.filter((s) => s.type === "PICKUP").length || "—"}</div>
              <div className="bg-card px-3 py-2 text-xs font-mono">{draftStops.filter((s) => s.type === "DROP").length || "—"}</div>
              <div className="bg-card px-3 py-2 text-xs font-mono">{draftStops.length || "—"}</div>
            </div>

            {/* Sequence pills */}
            {draftStopIds.length > 0 && (
              <div className="border-t border-border/40 px-4 py-2.5 bg-muted/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Trip Sequence</span>
                  <span className="text-[10px] text-muted-foreground">({draftStops.length} stops · {draftStops.reduce((n,s) => n+s.netweight, 0)} kg)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <AnimatePresence>
                    {draftStops.map((s, i) => (
                      <motion.div key={s.id} layout
                        initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border pl-2 pr-1 py-0.5 text-xs",
                          s.type === "DROP" ? "bg-rose-50 border-rose-200" : "bg-sky-50 border-sky-200"
                        )}
                      >
                        <span className="w-4 h-4 rounded-full bg-white border border-current flex items-center justify-center font-mono text-[9px] font-bold">{i + 1}</span>
                        <span className="text-[10px] font-mono">{s.txn}</span>
                        <span className="text-muted-foreground text-[10px] hidden sm:inline">· {s.client}</span>
                        <button onClick={() => setDraftStopIds((prev) => prev.filter((id) => id !== s.id))}
                          className="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* ── BOTTOM: Trips list + Map ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-3">

            {/* TRIPS LIST */}
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-3 py-2.5 border-b border-border/60 bg-muted/20 flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={tripSearch} onChange={(e) => setTripSearch(e.target.value)}
                    placeholder="Search trips…" className="h-7 pl-7 text-xs w-40" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-7 w-[110px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Optimized">Optimized</SelectItem>
                    <SelectItem value="Locked">Locked</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground ml-auto">({filteredTrips.length} trips)</span>
              </div>

              {/* Table */}
              <div className="overflow-auto flex-1">
                <table className="w-full text-xs min-w-[560px]">
                  <thead className="bg-muted/30 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1.5 border-b border-border/40 w-6"></th>
                      {["Details","Route Code","Seq","Vehicle","Status","Lock","Driver","Depart","Arrival"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrips.length === 0 && (
                      <tr><td colSpan={10} className="px-3 py-12 text-center text-xs text-muted-foreground">
                        {trips.length === 0 ? "No trips planned yet — confirm a trip above" : "No trips match filters"}
                      </td></tr>
                    )}
                    {filteredTrips.map((t) => {
                      const sel = t.id === selectedTripId;
                      return (
                        <tr key={t.id}
                          onClick={() => selectTrip(t)}
                          className={cn(
                            "border-b border-border/30 cursor-pointer transition-colors group",
                            sel ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40",
                            t.locked ? "bg-amber-50/40" : ""
                          )}
                        >
                          <td className="px-2 py-1.5">
                            <Checkbox checked={sel} onCheckedChange={() => selectTrip(t)} onClick={(e) => e.stopPropagation()} />
                          </td>
                          <td className="px-2 py-1.5">
                            <button className="text-sky-600 hover:text-sky-700" onClick={(e) => e.stopPropagation()}>
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[11px] text-primary font-semibold whitespace-nowrap">{t.id.slice(-12)}</td>
                          <td className="px-2 py-1.5 text-[11px] font-mono text-center">{t.seq}</td>
                          <td className="px-2 py-1.5 font-mono font-bold text-[11px]">{t.vehicle.code}</td>
                          <td className="px-2 py-1.5">
                            <span className={cn("text-[9px] px-2 py-0.5 rounded font-bold", statusColor(t.status))}>
                              {t.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); lockTrip(t.id); }}
                              className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted"
                            >
                              {t.locked
                                ? <Lock className="w-3.5 h-3.5 text-orange-500" />
                                : <Unlock className="w-3.5 h-3.5 text-muted-foreground/50" />}
                            </button>
                          </td>
                          <td className="px-2 py-1.5 text-[11px]">{t.driver.name}</td>
                          <td className="px-2 py-1.5 text-[11px] font-mono text-muted-foreground">{t.departSite}</td>
                          <td className="px-2 py-1.5 text-[11px] font-mono text-muted-foreground">{t.arrivalSite}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MAP + LIST VIEW */}
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">
                  {selectedTrip
                    ? <><span className="font-mono text-primary">{selectedTrip.id.slice(-12)}</span><span className="text-muted-foreground font-normal"> · {selectedTrip.stops.length} stops</span></>
                    : "Route Preview"}
                </h3>
                {selectedTrip && (
                  <button onClick={() => deleteTrip(selectedTrip.id)}
                    className="ml-auto text-muted-foreground/50 hover:text-destructive p-1 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className={cn("flex items-center gap-0.5 border border-border rounded-md p-0.5 ml-auto", selectedTrip && "ml-2")}>
                  <button onClick={() => setTripView("map")}
                    className={cn("h-6 px-2 text-[11px] rounded flex items-center gap-1 transition-colors",
                      tripView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                    <MapIcon className="w-3 h-3" /> Map
                  </button>
                  <button onClick={() => setTripView("list")}
                    className={cn("h-6 px-2 text-[11px] rounded flex items-center gap-1 transition-colors",
                      tripView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                    <List className="w-3 h-3" /> List View
                  </button>
                </div>
              </div>

              {tripView === "map" ? <RouteMapView trip={selectedTrip} /> : <TripStopListView trip={selectedTrip} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
