import { useMemo, useState, useCallback, useRef, useEffect, type DragEvent } from "react";
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
import { fetchTmsSites, loadPlannerData, type RpSite, type RpVehicle, type RpDriver, type RpStop } from "@/lib/routePlannerApi";

// ═══════════════════════════════════════════════════════
// TYPES — mapped from RpStop / RpVehicle / RpDriver
// ═══════════════════════════════════════════════════════

type Vehicle = {
  code: string; vehicleNo: string; departureSite: string; arrivalSite: string;
  driverName: string; category: string; capacity: number; vol: number;
  maxOrders: number; startTime: string; site: string;
};

type Driver = { id: string; name: string; license: string; status: "Available" | "On Trip"; hoursToday: number; };

type Stop = {
  id: string; type: "DROP" | "PICKUP"; txn: string; prepList: string;
  pairedDoc: string; doctype: string; client: string; bpcode: string;
  address: string; city: string; postalCity: string; site: string;
  priority: "NORMAL" | "URGENT" | "LOW"; routeCode: string;
  qty: number; netweight: number; vol: number;
  dlvyStatus: "open" | "Allocated" | "8";
  lat: number; lng: number;
};

// ── Mappers: API types → Planner internal types ──────────────
function mapVehicle(v: RpVehicle): Vehicle {
  return {
    code:         v.vehicleCode,
    vehicleNo:    v.vehicleNumber ?? v.vehicleCode,
    departureSite: "",
    arrivalSite:  "",
    driverName:   v.driverId ?? "",
    category:     v.categoryCode ?? "",
    capacity:     Number(v.capacityWeight ?? 0),
    vol:          Number(v.capacityVolume ?? 0),
    maxOrders:    20,
    startTime:    "07:00",
    site:         "",
  };
}

function mapDriver(d: RpDriver): Driver {
  return {
    id:         d.driverId,
    name:       d.driverName,
    license:    d.licenseNumber ?? "",
    status:     d.driverStatus === 1 ? "Available" : "On Trip",
    hoursToday: 0,
  };
}

function priorityFromNum(p: number | null): "NORMAL" | "URGENT" | "LOW" {
  if (p === null || p === undefined) return "NORMAL";
  if (p >= 80) return "URGENT";
  if (p <= 10) return "LOW";
  return "NORMAL";
}

function mapStop(s: RpStop): Stop {
  return {
    id:          s.docNum,
    type:        s.stopType === "DROP" ? "DROP" : "PICKUP",
    txn:         s.docNum,
    prepList:    s.docType ?? "",
    pairedDoc:   "",
    doctype:     s.docType ?? "",
    client:      s.bpName ?? "",
    bpcode:      s.bpCode ?? "",
    address:     s.addLine1 ?? "",
    city:        s.city ?? "",
    postalCity:  [s.posCode, s.city].filter(Boolean).join(", "),
    site:        s.site ?? "",
    priority:    priorityFromNum(s.priority),
    routeCode:   s.routeCode ?? "",
    qty:         Number(s.nbPack ?? 0),
    netweight:   Number(s.netWeight ?? 0),
    vol:         Number(s.volume ?? 0),
    dlvyStatus:  s.routeStatus === "Allocated" ? "Allocated" : "open",
    lat:         Number(s.latitude ?? 0),
    lng:         Number(s.longitude ?? 0),
  };
}

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
// SITE SELECT — driven by real API sites
// ═══════════════════════════════════════════════════════
function SiteSelect({ sites, value, onChange }: { sites: RpSite[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[240px]">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground mr-1 flex-shrink-0" />
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

// ═══════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════
function KpiCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: typeof Truck }) {
  return (
    <div className={cn("rounded-md px-3 py-2 text-white flex items-center justify-between shadow-sm", color)}>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70">{label}</p>
        <p className="text-xl font-bold leading-none mt-0.5">{value}</p>
      </div>
      <Icon className="w-5 h-5 text-white/40" />
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
      <td className="px-2 py-1.5 font-mono text-xs text-primary font-semibold whitespace-nowrap">{stop.txn}</td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground">{stop.prepList}</td>
      <td className="px-2 py-1.5 text-xs">
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold", priorityColor(stop.priority))}>{stop.priority}</span>
      </td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground font-mono">{stop.bpcode}</td>
      <td className="px-2 py-1.5 text-xs font-medium max-w-[120px] truncate">{stop.client}</td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground">{stop.routeCode}</td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground max-w-[100px] truncate">{stop.postalCity}</td>
      <td className="px-2 py-1.5 text-xs font-mono">{stop.qty}</td>
      <td className="px-2 py-1.5 text-xs font-mono">{stop.netweight}</td>
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
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg border border-border/60 px-3 py-2 text-xs flex items-center gap-4">
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
              <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{s.routeCode}</td>
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
// ACTIVE TOUR PANEL — redesigned: 3-zone layout
// Zone 1 (top): Assignment bar — vehicle + driver + key stats
// Zone 2 (mid): Sequence timeline
// Zone 3 (bottom): Stops table (collapsible)
// ═══════════════════════════════════════════════════════
type ActiveTourPanelProps = {
  vehicle: Vehicle | null; driver: Driver | null; stops: Stop[];
  dropZoneActive: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDriverDrop: (e: React.DragEvent) => void;
  onClearVehicle: () => void;
  onClearDriver: () => void;
  onRemoveStop: (id: string) => void;
  onClear: () => void;
  onConfirm: () => void;
};

function genTimes(count: number): string[] {
  let mins = 7 * 60 + 30;
  return Array.from({ length: count }, () => {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    mins += 18 + Math.round(Math.random() * 10);
    return `${h}:${m}`;
  });
}

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-muted/40 border border-border/40 min-w-[72px]">
      <span className={cn("text-sm font-bold leading-tight", accent ?? "text-foreground")}>{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

function AssignSlot({
  icon: Icon, label, filled, placeholder, children, onDragOver, onDrop,
}: {
  icon: React.ElementType; label: string; filled: boolean;
  placeholder: string; children?: React.ReactNode;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver} onDrop={onDrop}
      className={cn(
        "flex-1 min-w-[160px] rounded-xl border-2 transition-all",
        filled
          ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"
          : "border-dashed border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-primary/3"
      )}
    >
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-0.5">
        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", filled ? "text-emerald-600" : "text-muted-foreground/50")} />
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="px-3 pb-2.5 min-h-[36px] flex items-center">
        {filled ? children : <span className="text-xs text-muted-foreground/50 italic">{placeholder}</span>}
      </div>
    </div>
  );
}

function ActiveTourPanel({
  vehicle, driver, stops,
  dropZoneActive, onDragOver, onDragLeave, onDrop, onDriverDrop,
  onClearVehicle, onClearDriver, onRemoveStop, onClear, onConfirm,
}: ActiveTourPanelProps) {
  const [stopsOpen, setStopsOpen] = useState(true);
  const times = useMemo(() => genTimes(stops.length), [stops.length]);

  const totalWeight = stops.reduce((n, s) => n + s.netweight, 0);
  const totalVol    = stops.reduce((n, s) => n + s.vol, 0);
  const totalQty    = stops.reduce((n, s) => n + s.qty, 0);
  const dropCount   = stops.filter((s) => s.type === "DROP").length;
  const pickCount   = stops.filter((s) => s.type === "PICKUP").length;
  const travelMins  = stops.length * 18;
  const travelStr   = stops.length
    ? `${String(Math.floor(travelMins / 60)).padStart(2,"0")}:${String(travelMins % 60).padStart(2,"0")}`
    : "—";
  const distMiles   = stops.length ? stops.length * 12 + 30 : 0;

  // capacity bar
  const capPct = vehicle ? Math.min(100, Math.round((totalWeight / vehicle.capacity) * 100)) : 0;
  const capColor = capPct > 90 ? "bg-rose-500" : capPct > 70 ? "bg-amber-500" : "bg-emerald-500";

  const hasAssignment = !!(vehicle || driver || stops.length);

  return (
    <div
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={cn(
        "rounded-xl border-2 shadow-sm transition-all overflow-hidden",
        dropZoneActive
          ? "border-primary bg-primary/3 shadow-primary/10"
          : "border-dashed border-border/60 bg-card"
      )}
    >
      {/* ══════════════════════════════════════════
          HEADER BAR
      ══════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-gradient-to-r from-[#0f172a] to-[#1e3a5f]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Play className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-tight">Active Tour</h3>
            {dropZoneActive
              ? <p className="text-[11px] text-primary animate-pulse font-medium">Drop vehicle, driver or stops here…</p>
              : <p className="text-[11px] text-white/40">Drag resources here or click to assign</p>
            }
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost"
            className="h-7 text-xs gap-1 text-white/60 hover:text-white hover:bg-white/10"
            onClick={onClear} disabled={!hasAssignment}>
            <Trash2 className="w-3 h-3" /> Clear
          </Button>
          <Button size="sm"
            className="h-7 text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/30"
            onClick={onConfirm}>
            <CheckCheck className="w-3.5 h-3.5" /> Confirm Trip
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ZONE 1 — ASSIGNMENT + STATS
      ══════════════════════════════════════════ */}
      <div className="p-3 border-b border-border/40 bg-card">
        <div className="flex flex-wrap gap-2.5 items-stretch">

          {/* Vehicle slot */}
          <AssignSlot icon={Truck} label="Vehicle" filled={!!vehicle} placeholder="Click a vehicle row above">
            {vehicle && (
              <div className="flex items-start justify-between w-full gap-2">
                <div>
                  <p className="font-mono font-bold text-base text-blue-700 leading-tight">{vehicle.code}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{vehicle.vehicleNo}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{vehicle.category} · Cap: {vehicle.capacity.toLocaleString()} kg</p>
                </div>
                <button onClick={onClearVehicle} className="text-muted-foreground/40 hover:text-destructive mt-0.5 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </AssignSlot>

          {/* Driver slot */}
          <AssignSlot icon={Users} label="Driver" filled={!!driver} placeholder="Drag a driver here"
            onDragOver={(e) => e.preventDefault()} onDrop={onDriverDrop}>
            {driver && (
              <div className="flex items-start justify-between w-full gap-2">
                <div>
                  <p className="font-semibold text-sm leading-tight">{driver.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{driver.id} · {driver.license}</p>
                  <p className={cn("text-[11px] font-semibold mt-0.5", hoursColor(driver.hoursToday))}>{driver.hoursToday}h today</p>
                </div>
                <button onClick={onClearDriver} className="text-muted-foreground/40 hover:text-destructive mt-0.5 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </AssignSlot>

          {/* Divider */}
          <div className="w-px bg-border/40 self-stretch hidden lg:block" />

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <StatPill label="Stops"     value={stops.length}           accent={stops.length > 0 ? "text-primary" : undefined} />
            <StatPill label="Drops"     value={dropCount}              accent={dropCount  > 0 ? "text-rose-600"  : undefined} />
            <StatPill label="Pickups"   value={pickCount}              accent={pickCount  > 0 ? "text-sky-600"   : undefined} />
            <StatPill label="Weight"    value={totalWeight ? `${totalWeight} kg` : "—"} />
            <StatPill label="Volume"    value={totalVol    ? `${totalVol} m³`    : "—"} />
            <StatPill label="Qty"       value={totalQty    ? `${totalQty} UN`    : "—"} />
            <StatPill label="Travel"    value={travelStr} />
            <StatPill label="Distance"  value={distMiles ? `${distMiles} mi` : "—"} />
          </div>

          {/* Capacity bar (only when vehicle assigned) */}
          {vehicle && stops.length > 0 && (
            <div className="flex flex-col justify-center gap-1 min-w-[120px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Capacity</span>
                <span className={cn("font-bold", capPct > 90 ? "text-rose-600" : capPct > 70 ? "text-amber-600" : "text-emerald-600")}>
                  {capPct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", capColor)}
                  style={{ width: `${capPct}%` }}
                />
              </div>
              <p className="text-[9px] text-muted-foreground">{totalWeight.toLocaleString()} / {vehicle.capacity.toLocaleString()} kg</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ZONE 2 — TRIP SEQUENCE TIMELINE
      ══════════════════════════════════════════ */}
      <div className="px-5 py-3 border-b border-border/40 bg-muted/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
            <RouteIcon className="w-3 h-3" /> Trip Sequence
          </span>
          {stops.length > 0 && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/>Drop</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block"/>Pickup</span>
            </div>
          )}
        </div>

        {stops.length === 0 ? (
          <div className="flex items-center gap-3 py-2">
            <div className="h-0.5 flex-1 bg-border/40 rounded" />
            <span className="text-xs text-muted-foreground/50 italic whitespace-nowrap">Add stops to build the sequence</span>
            <div className="h-0.5 flex-1 bg-border/40 rounded" />
          </div>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="relative flex items-start" style={{ minWidth: stops.length * 96 }}>
              {/* Connecting line */}
              <div className="absolute top-[18px] left-8 right-8 h-0.5 bg-emerald-400/70 rounded" />

              {stops.map((s, i) => (
                <div key={s.id} className="flex flex-col items-center flex-1 relative group">
                  {/* Seq number */}
                  <span className="text-[9px] font-bold text-slate-500 mb-1 leading-none">{i + 1}</span>
                  {/* Circle node */}
                  <div className={cn(
                    "w-9 h-9 rounded-full border-[3px] border-white flex items-center justify-center z-10 shadow-md cursor-pointer transition-transform group-hover:scale-110",
                    s.type === "DROP" ? "bg-rose-500" : "bg-sky-500"
                  )}>
                    <span className="text-xs text-white font-bold">{i + 1}</span>
                  </div>
                  {/* Time */}
                  <span className="text-[9px] font-mono text-muted-foreground mt-1 leading-none">{times[i]}</span>
                  {/* Txn */}
                  <span className="text-[8px] text-muted-foreground/70 mt-0.5 max-w-[72px] truncate text-center leading-none">{s.txn}</span>
                  {/* Remove on hover */}
                  <button
                    onClick={() => onRemoveStop(s.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-rose-300 text-rose-500 items-center justify-center hidden group-hover:flex shadow-sm hover:bg-rose-50 z-20"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          ZONE 3 — STOPS TABLE (collapsible)
      ══════════════════════════════════════════ */}
      {stops.length > 0 && (
        <>
          {/* Toggle */}
          <button
            onClick={() => setStopsOpen(!stopsOpen)}
            className="w-full flex items-center justify-between px-4 py-1.5 bg-muted/20 hover:bg-muted/40 border-b border-border/40 transition-colors group"
          >
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
              <List className="w-3 h-3" /> Stop Details
              <span className="bg-border/60 text-muted-foreground rounded-full px-1.5 text-[9px] font-bold ml-1">{stops.length}</span>
            </span>
            <motion.div animate={{ rotate: stopsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {stopsOpen && (
              <motion.div
                key="stops-table"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[640px]">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/40">
                        <th className="w-8 px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Type</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Document</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Client Code</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Client</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Postal City</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">Weight</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">Vol</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">Qty</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {stops.map((s, i) => (
                          <motion.tr key={s.id} layout
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={cn(
                              "border-b border-border/25 group hover:bg-primary/3 transition-colors",
                              i % 2 === 1 ? "bg-muted/15" : ""
                            )}
                          >
                            <td className="px-2 py-2 text-center">
                              <span className={cn(
                                "w-5 h-5 rounded-full text-[9px] font-bold inline-flex items-center justify-center text-white shadow-sm",
                                s.type === "DROP" ? "bg-rose-500" : "bg-sky-500"
                              )}>{i + 1}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={cn(
                                "text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wide",
                                s.type === "DROP"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-sky-100 text-sky-700"
                              )}>{s.type === "DROP" ? "DROP" : "PICK"}</span>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-blue-600 hover:underline cursor-pointer whitespace-nowrap">{s.txn}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{s.bpcode}</td>
                            <td className="px-3 py-2 text-xs font-medium max-w-[140px] truncate">{s.client}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{s.postalCity}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs">{s.netweight} kg</td>
                            <td className="px-3 py-2 text-right font-mono text-xs">{s.vol} m³</td>
                            <td className="px-3 py-2 text-right font-mono text-xs font-semibold">{s.qty}</td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => onRemoveStop(s.id)}
                                className="w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-100 text-muted-foreground hover:text-rose-600 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/25 font-semibold">
                        <td colSpan={6} className="px-3 py-2 text-right text-[11px] text-muted-foreground uppercase tracking-wider">Totals</td>
                        <td className="px-3 py-2 text-right font-mono text-xs font-bold">{totalWeight} kg</td>
                        <td className="px-3 py-2 text-right font-mono text-xs font-bold">{totalVol} m³</td>
                        <td className="px-3 py-2 text-right font-mono text-xs font-bold">{totalQty}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Empty state */}
      {!hasAssignment && (
        <div className="flex items-center justify-center gap-6 py-6 text-muted-foreground/40">
          <div className="flex flex-col items-center gap-1">
            <Truck className="w-5 h-5" />
            <span className="text-[11px]">Vehicle</span>
          </div>
          <span className="text-border">+</span>
          <div className="flex flex-col items-center gap-1">
            <Users className="w-5 h-5" />
            <span className="text-[11px]">Driver</span>
          </div>
          <span className="text-border">+</span>
          <div className="flex flex-col items-center gap-1">
            <Package className="w-5 h-5" />
            <span className="text-[11px]">Stops</span>
          </div>
          <span className="text-border text-lg">→</span>
          <div className="flex flex-col items-center gap-1">
            <CheckCheck className="w-5 h-5" />
            <span className="text-[11px]">Confirm</span>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// RESIZABLE SPLIT PANEL
// ═══════════════════════════════════════════════════════
function ResizableSplit({
  left, right, defaultLeftPct = 35, minPct = 20, maxPct = 80, leftLabel,
}: {
  left: React.ReactNode; right: React.ReactNode;
  defaultLeftPct?: number; minPct?: number; maxPct?: number; leftLabel?: string;
}) {
  const [leftPct, setLeftPct] = useState(defaultLeftPct);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number | null>(null);

  const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);

    const getX = (ev: MouseEvent | TouchEvent) =>
      "touches" in ev ? ev.touches[0].clientX : ev.clientX;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = containerRef.current!.getBoundingClientRect();
        const raw  = ((getX(ev) - rect.left) / rect.width) * 100;
        setLeftPct(Math.min(maxPct, Math.max(minPct, raw)));
      });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);
  }, [minPct, maxPct]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const presets = [
    { label: "30 / 70", value: 30 },
    { label: "50 / 50", value: 50 },
    { label: "70 / 30", value: 70 },
  ];

  return (
    <div>
      {/* Preset quick-buttons */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Split:</span>
        {presets.map((p) => (
          <button key={p.value} onClick={() => setLeftPct(p.value)}
            className={cn(
              "text-[11px] px-2 py-0.5 rounded border transition-colors font-mono",
              Math.round(leftPct) === p.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 text-muted-foreground hover:border-primary/60 hover:text-foreground"
            )}
          >{p.label}</button>
        ))}
        <span className="text-[11px] text-muted-foreground ml-2 font-mono">
          {Math.round(leftPct)}% / {Math.round(100 - leftPct)}%
        </span>
        <span className="text-[11px] text-muted-foreground ml-auto hidden sm:block">drag the divider to resize</span>
      </div>

      {/* Split panels */}
      <div ref={containerRef} className="flex gap-0 relative" style={{ minHeight: 420 }}>
        {/* Left panel */}
        <div style={{ width: `calc(${leftPct}% - 5px)` }} className="flex-shrink-0 min-w-0">
          {left}
        </div>

        {/* Draggable divider */}
        <div
          onMouseDown={startDrag} onTouchStart={startDrag}
          className={cn(
            "flex-shrink-0 flex flex-col items-center justify-center gap-1 cursor-col-resize select-none z-10 transition-colors group",
            "w-[10px] mx-0 rounded-sm",
            dragging ? "bg-primary/20" : "hover:bg-primary/10"
          )}
          title="Drag to resize"
        >
          {/* Visual handle pill */}
          <div className={cn(
            "w-1 rounded-full transition-all",
            dragging ? "h-16 bg-primary" : "h-10 bg-border group-hover:bg-primary/60"
          )} />
          {/* 3-dot grip */}
          {[0,1,2].map((i) => (
            <div key={i} className={cn(
              "w-1 h-1 rounded-full transition-colors",
              dragging ? "bg-primary" : "bg-border/60 group-hover:bg-primary/40"
            )} />
          ))}
        </div>

        {/* Right panel */}
        <div style={{ width: `calc(${100 - leftPct}% - 5px)` }} className="flex-shrink-0 min-w-0">
          {right}
        </div>

        {/* Full-width drag capture overlay when dragging */}
        {dragging && (
          <div className="absolute inset-0 z-20 cursor-col-resize" />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function Planner() {
  // ── Sites from API ────────────────────────────────────
  const [sites, setSites]           = useState<RpSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);

  // ── Toolbar state ─────────────────────────────────────
  const [site, setSite]         = useState("");
  const [date, setDate]         = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── API data ──────────────────────────────────────────
  const [apiVehicles, setApiVehicles] = useState<Vehicle[]>([]);
  const [apiDrivers,  setApiDrivers]  = useState<Driver[]>([]);
  const [allStops,    setAllStops]    = useState<Stop[]>([]);

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
  const [fleetTab, setFleetTab]         = useState<"vehicles" | "drivers">("vehicles");
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(new Set()); // multi-select in tables

  // ── Load sites on mount ──────────────────────────────
  useEffect(() => {
    setSitesLoading(true);
    fetchTmsSites()
      .then((data) => {
        setSites(data);
        if (data.length > 0) setSite(data[0].siteCode);
      })
      .catch(() => {})
      .finally(() => setSitesLoading(false));
  }, []);

  // ── Auto-load planner data on site / date / refresh change
  useEffect(() => {
    if (!site || !date) return;
    setLoading(true);
    setLoaded(false);
    setApiVehicles([]); setApiDrivers([]); setAllStops([]);
    setDraftVehicle(null); setDraftDriver(null); setDraftStopIds([]);
    setSelectedStopIds(new Set());

    loadPlannerData(site, date)
      .then((data) => {
        setApiVehicles((data.vehicles ?? []).map(mapVehicle));
        setApiDrivers((data.drivers  ?? []).map(mapDriver));
        setAllStops([
          ...(data.drops   ?? []).map(mapStop),
          ...(data.pickups ?? []).map(mapStop),
        ]);
        setLoaded(true);
        toast({
          title: "Data loaded",
          description: `${data.vehicleCount} vehicles · ${data.driverCount} drivers · ${data.dropCount} drops · ${data.pickupCount} pickups`,
        });
      })
      .catch((e: any) => {
        toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [site, date, refreshKey]);

  // ── Derived datasets ───────────────────────────────────
  const usedStopIds = useMemo(() => new Set(trips.flatMap((t) => t.stops.map((s) => s.id))), [trips]);

  const vehicles = useMemo(() =>
    apiVehicles.filter((v) =>
      (!vehSearch || `${v.code} ${v.vehicleNo} ${v.category} ${v.departureSite} ${v.arrivalSite} ${v.driverName} ${v.capacity} ${v.vol} ${v.startTime}`.toLowerCase().includes(vehSearch.toLowerCase()))
    ), [apiVehicles, vehSearch]);

  const drivers = useMemo(() =>
    apiDrivers.filter((d) =>
      !drvSearch || `${d.id} ${d.name} ${d.license} ${d.status} ${d.hoursToday}`.toLowerCase().includes(drvSearch.toLowerCase())
    ), [apiDrivers, drvSearch]);

  const availableStops = useMemo(() =>
    allStops.filter((s) => !usedStopIds.has(s.id)),
    [allStops, usedStopIds]);

  const drops = useMemo(() =>
    availableStops.filter((s) =>
      s.type === "DROP" &&
      (!dropSearch || `${s.txn} ${s.prepList} ${s.pairedDoc} ${s.doctype} ${s.client} ${s.bpcode} ${s.address} ${s.city} ${s.postalCity} ${s.routeCode} ${s.priority} ${s.qty} ${s.netweight} ${s.vol} ${s.dlvyStatus}`.toLowerCase().includes(dropSearch.toLowerCase()))
    ), [availableStops, dropSearch]);

  const pickups = useMemo(() =>
    availableStops.filter((s) =>
      s.type === "PICKUP" &&
      (!pickSearch || `${s.txn} ${s.prepList} ${s.pairedDoc} ${s.doctype} ${s.client} ${s.bpcode} ${s.address} ${s.city} ${s.postalCity} ${s.routeCode} ${s.priority} ${s.qty} ${s.netweight} ${s.vol} ${s.dlvyStatus}`.toLowerCase().includes(pickSearch.toLowerCase()))
    ), [availableStops, pickSearch]);

  const draftStops = useMemo(() =>
    allStops.filter((s) => draftStopIds.includes(s.id)),
    [allStops, draftStopIds]);

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
      const v = apiVehicles.find((x) => x.code === vehicleCode);
      if (v) setDraftVehicle(v);
    }
    if (driverId) {
      const d = apiDrivers.find((x) => x.id === driverId);
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
    <div className="flex flex-col bg-background" style={{ height: "calc(100vh - 56px)", fontFamily: "Inter, system-ui, sans-serif", fontSize: "12px" }}>

      {/* ── TOOLBAR ─ compact single row ─────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-card border-b border-border/60 flex-shrink-0">
        {/* Site */}
        {sitesLoading
          ? <div className="h-8 flex items-center gap-1.5 px-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading sites…</div>
          : <SiteSelect sites={sites} value={site} onChange={setSite} />
        }
        {/* Date */}
        <div className="relative">
          <CalIcon className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="h-8 pl-6 pr-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        {/* Refresh icon-only with tooltip */}
        <div className="relative group">
          <button
            disabled={loading || !site}
            onClick={() => setRefreshKey((k) => k + 1)}
            className="h-8 w-8 rounded-md border border-input bg-background flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", loading && "animate-spin")} />
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 top-9 z-50 px-2 py-1 rounded bg-foreground text-background text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Refresh
          </span>
        </div>
        {/* Status */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {loading
            ? <><Loader2 className="w-3 h-3 animate-spin text-primary" /><span>Loading…</span></>
            : loaded
              ? <><CheckCheck className="w-3 h-3 text-emerald-500" />
                  <span className="font-medium text-foreground">{site}</span>
                  <span>·</span>
                  <span className="text-foreground">{date}</span></>
              : null}
        </div>
      </div>

      {!loaded ? (
        <div className="flex-1 flex items-center justify-center">
          {loading
            ? <div className="text-center"><Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
                <p className="font-medium text-foreground text-sm">Loading planner data…</p>
                <p className="text-xs text-muted-foreground mt-1">{site} · {date}</p></div>
            : <div className="text-center"><RouteIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium text-foreground text-sm">Select a site to load planner data</p>
                <p className="text-xs text-muted-foreground mt-1">Data loads automatically when site or date changes.</p></div>
          }
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── KPI STRIP ──────────────────────────────── */}
          <div className="grid grid-cols-6 gap-1.5 px-3 pt-1.5 pb-1 flex-shrink-0">
            <KpiCard label="Vehicles"          value={kpis.vehicles}       icon={Truck}           color="bg-gradient-to-br from-slate-500 to-slate-700" />
            <KpiCard label="Trips"             value={kpis.trips}          icon={RouteIcon}       color="bg-gradient-to-br from-indigo-500 to-indigo-700" />
            <KpiCard label="Assigned Docs"     value={kpis.assignedDocs}   icon={CheckCheck}      color="bg-gradient-to-br from-emerald-500 to-emerald-700" />
            <KpiCard label="Non-Assigned Docs" value={kpis.unassignedDocs} icon={AlertCircle}     color="bg-gradient-to-br from-amber-500 to-amber-600" />
            <KpiCard label="Delivery Qty"      value={kpis.totalDeliveryQty} icon={ArrowDownToLine} color="bg-gradient-to-br from-rose-500 to-rose-600" />
            <KpiCard label="Pickup Qty"        value={kpis.totalPickupQty} icon={ArrowUpFromLine}  color="bg-gradient-to-br from-sky-500 to-sky-600" />
          </div>

          {/* ── FLEET | DOCUMENTS — fixed 40% height ─── */}
          <div className="grid grid-cols-2 gap-1.5 px-3 pb-1" style={{ height: "35vh", minHeight: 220 }}>

            {/* ════════════════════════════════════════
                LEFT 50% — FLEET (Vehicles + Drivers tabbed)
                ════════════════════════════════════════ */}
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">

                {/* Fleet tabs */}
              <div className="flex border-b border-border/60 flex-shrink-0">
                {([
                  { key: "vehicles", label: "Vehicles", icon: Truck,  count: vehicles.length, active: "bg-slate-700 text-white" },
                  { key: "drivers",  label: "Drivers",  icon: Users,  count: drivers.length,  active: "bg-indigo-600 text-white" },
                ] as const).map(({ key, label, icon: Icon, count, active }) => (
                  <button key={key} onClick={() => setFleetTab(key)}
                    className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all border-b-2",
                      fleetTab === key ? `${active} border-transparent` : "text-muted-foreground bg-muted/10 hover:bg-muted/30 border-transparent"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    <span className={cn("text-[11px] rounded-full px-1.5 py-0.5 font-bold",
                      fleetTab === key ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                    )}>{count}</span>
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="px-3 py-2 border-b border-border/40">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={fleetTab === "vehicles" ? vehSearch : drvSearch}
                    onChange={(e) => fleetTab === "vehicles" ? setVehSearch(e.target.value) : setDrvSearch(e.target.value)}
                    placeholder={`Search ${fleetTab}…`}
                    className="h-7 pl-7 text-xs"
                  />
                </div>
              </div>

              {/* VEHICLES content */}
              {fleetTab === "vehicles" && (
                <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr>
                        {["Vehicle Code","Vehicle No","Category","Depart Site","Start"].map((h) => (
                          <th key={h} className="px-2.5 py-2 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40">{h}</th>
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
                              "border-b border-border/30 cursor-pointer transition-colors select-none group",
                              sel
                                ? "bg-emerald-50 dark:bg-emerald-950/30"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <td className={cn("px-2.5 py-2 font-mono font-bold text-[12px]", sel ? "text-emerald-700" : "text-primary")}>
                              {v.code}
                              {sel && <span className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded font-semibold">Selected</span>}
                            </td>
                            <td className="px-2.5 py-2 font-mono text-[11px] text-muted-foreground">{v.vehicleNo}</td>
                            <td className="px-2.5 py-2 text-xs">{v.category}</td>
                            <td className="px-2.5 py-2 text-xs font-mono text-muted-foreground">{v.departureSite}</td>
                            <td className="px-2.5 py-2 text-xs text-muted-foreground">{v.startTime}</td>
                          </tr>
                        );
                      })}
                      {vehicles.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">No vehicles for this site</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* DRIVERS content */}
              {fleetTab === "drivers" && (
                <div className="overflow-auto flex-1 p-2 space-y-1.5" style={{ minHeight: 0 }}>
                  {drivers.map((d) => {
                    const busy = d.status !== "Available";
                    const sel  = draftDriver?.id === d.id;
                    return (
                      <div key={d.id}
                        draggable={!busy}
                        onDragStart={(e) => onDriverDragStart(e, d)}
                        onClick={() => { if (!busy) setDraftDriver(sel ? null : d); }}
                        className={cn(
                          "rounded-lg border px-3 py-2 flex items-center gap-3 transition-colors select-none",
                          sel
                            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-300"
                            : busy
                              ? "opacity-50 border-border/40 bg-muted/10"
                              : "border-border/50 bg-card cursor-grab hover:border-indigo-300 hover:bg-indigo-50/40"
                        )}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto] items-center gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{d.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{d.id} · {d.license}</p>
                          </div>
                          <p className={cn("text-xs font-bold whitespace-nowrap", hoursColor(d.hoursToday))}>{d.hoursToday}h today</p>
                          <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap",
                            busy ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          )}>{busy ? "On Trip" : "Avail"}</span>
                        </div>
                      </div>
                    );
                  })}
                  {drivers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">No drivers found</p>
                  )}
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════
                RIGHT 50% — DOCUMENTS (Drops + Pickups tabbed)
                ════════════════════════════════════════ */}
            <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden flex flex-col">

              {/* Docs tabs */}
              <div className="flex border-b border-border/60 flex-shrink-0">
                {([
                  { key: "drops",   label: "Deliveries", icon: ArrowDownToLine, count: drops.length,   active: "bg-rose-600 text-white" },
                  { key: "pickups", label: "Pickups",    icon: ArrowUpFromLine, count: pickups.length, active: "bg-sky-600 text-white" },
                ] as const).map(({ key, label, icon: Icon, count, active }) => (
                  <button key={key} onClick={() => setStopTypeTab(key)}
                    className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all border-b-2",
                      stopTypeTab === key ? `${active} border-transparent` : "text-muted-foreground bg-muted/10 hover:bg-muted/30 border-transparent"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    <span className={cn("text-[11px] rounded-full px-1.5 py-0.5 font-bold",
                      stopTypeTab === key ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                    )}>{count}</span>
                  </button>
                ))}
              </div>

              {/* Search + action bar */}
              <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={currentSearch}
                    onChange={(e) => setCurrentSearch(e.target.value)}
                    placeholder={`Search ${stopTypeTab === "drops" ? "deliveries" : "pickups"}…`}
                    className="h-7 pl-7 text-xs"
                  />
                </div>
                {selectedStopIds.size > 0 ? (
                  <Button size="sm" className="h-7 text-xs gap-1 flex-shrink-0" onClick={addSelectedStopsToDraft}>
                    <CheckCheck className="w-3 h-3" />
                    Add {selectedStopIds.size} to Trip
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground flex-shrink-0 hidden sm:block">drag or select + Add</span>
                )}
              </div>

              {/* Table */}
              <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
                <table className="w-full text-xs min-w-[600px]">
                  <thead className="bg-muted/40 sticky top-0 z-10">
                    <tr>
                      <th className="px-2.5 py-2 border-b border-border/40 w-8">
                        <Checkbox
                          checked={allCurrentSelected}
                          onCheckedChange={() => toggleAllStops(currentStops)}
                        />
                      </th>
                      {["Transaction No","Prep List","Priority","Client Code","Client","Route Code","Postal City","Qty","Weight",""].map((h) => (
                        <th key={h} className="px-2.5 py-2 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40">{h}</th>
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
                      <tr>
                        <td colSpan={11} className="px-3 py-10 text-center text-xs text-muted-foreground">
                          No {stopTypeTab === "drops" ? "deliveries" : "pickups"} available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── ACTIVE TOUR PANEL ────────────────────────────── */}
          <div className="px-3 pb-1 flex-shrink-0" style={{ height: "22vh", minHeight: 140, overflowY: "auto" }}>
          <ActiveTourPanel
            vehicle={draftVehicle}
            driver={draftDriver}
            stops={draftStops}
            dropZoneActive={dropZoneActive}
            onDragOver={(e) => { e.preventDefault(); setDropZoneActive(true); }}
            onDragLeave={() => setDropZoneActive(false)}
            onDrop={onActivePanelDrop}
            onDriverDrop={(e) => {
              e.stopPropagation();
              const id = e.dataTransfer.getData("text/driver-id");
              const d = apiDrivers.find((x) => x.id === id);
              if (d) setDraftDriver(d);
            }}
            onClearVehicle={() => setDraftVehicle(null)}
            onClearDriver={() => setDraftDriver(null)}
            onRemoveStop={(id) => setDraftStopIds((prev) => prev.filter((x) => x !== id))}
            onClear={clearDraft}
            onConfirm={confirmTrip}
          />
          </div>
          {/* ── BOTTOM: Resizable Trips | Map split ──────────── */}
          <div className="px-3 pb-1 flex-shrink-0" style={{ height: "28vh", minHeight: 180 }}>
          <ResizableSplit
            defaultLeftPct={35}
            minPct={20}
            maxPct={80}
            leftLabel={`${filteredTrips.length} trip${filteredTrips.length !== 1 ? "s" : ""}`}
            left={
              <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col h-full">
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-border/60 bg-muted/20 flex items-center gap-2 flex-wrap flex-shrink-0">
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={tripSearch} onChange={(e) => setTripSearch(e.target.value)}
                      placeholder="Search trips…" className="h-7 pl-7 text-xs w-36" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-7 w-[100px] text-xs">
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
                  <span className="text-xs text-muted-foreground ml-auto">({filteredTrips.length})</span>
                </div>
                {/* Table */}
                <div className="overflow-auto flex-1">
                  <table className="w-full text-xs min-w-[480px]">
                    <thead className="bg-muted/30 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-1.5 border-b border-border/40 w-6"></th>
                        {["Details","Route Code","Seq","Vehicle","Status","Lock","Driver","Depart","Arrival"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrips.length === 0 && (
                        <tr><td colSpan={10} className="px-3 py-12 text-center text-xs text-muted-foreground">
                          {trips.length === 0 ? "No trips yet — confirm a trip above" : "No trips match filters"}
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
                            <td className="px-2 py-1.5 font-mono text-xs text-primary font-semibold whitespace-nowrap">{t.id.slice(-12)}</td>
                            <td className="px-2 py-1.5 text-xs font-mono text-center">{t.seq}</td>
                            <td className="px-2 py-1.5 font-mono font-bold text-xs">{t.vehicle.code}</td>
                            <td className="px-2 py-1.5">
                              <span className={cn("text-[9px] px-2 py-0.5 rounded font-bold", statusColor(t.status))}>
                                {t.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2 py-1.5">
                              <button onClick={(e) => { e.stopPropagation(); lockTrip(t.id); }}
                                className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted">
                                {t.locked
                                  ? <Lock className="w-3.5 h-3.5 text-orange-500" />
                                  : <Unlock className="w-3.5 h-3.5 text-muted-foreground/50" />}
                              </button>
                            </td>
                            <td className="px-2 py-1.5 text-xs">{t.driver.name}</td>
                            <td className="px-2 py-1.5 text-xs font-mono text-muted-foreground">{t.departSite}</td>
                            <td className="px-2 py-1.5 text-xs font-mono text-muted-foreground">{t.arrivalSite}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            }
            right={
              <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center gap-2 flex-shrink-0">
                  <MapIcon className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">
                    {selectedTrip
                      ? <><span className="font-mono text-primary">{selectedTrip.id.slice(-12)}</span><span className="text-muted-foreground font-normal"> · {selectedTrip.stops.length} stops</span></>
                      : "Route Preview"}
                  </h3>
                  {selectedTrip && (
                    <button onClick={() => deleteTrip(selectedTrip.id)}
                      className="text-muted-foreground/50 hover:text-destructive p-1 rounded ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className={cn("flex items-center gap-0.5 border border-border rounded-md p-0.5 ml-auto")}>
                    <button onClick={() => setTripView("map")}
                      className={cn("h-6 px-2 text-xs rounded flex items-center gap-1 transition-colors",
                        tripView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                      <MapIcon className="w-3 h-3" /> Map
                    </button>
                    <button onClick={() => setTripView("list")}
                      className={cn("h-6 px-2 text-xs rounded flex items-center gap-1 transition-colors",
                        tripView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                      <List className="w-3 h-3" /> List View
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {tripView === "map" ? <RouteMapView trip={selectedTrip} /> : <TripStopListView trip={selectedTrip} />}
                </div>
              </div>
            }
          />
          </div>
        </div>
      )}
    </div>
  );
}
