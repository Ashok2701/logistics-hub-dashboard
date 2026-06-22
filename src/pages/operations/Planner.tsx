import { useMemo, useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Users, Calendar as CalIcon, Building2, Search,
  MapPin, Route as RouteIcon, ArrowDownToLine, ArrowUpFromLine,
  CheckCheck, X, Play, Map as MapIcon, List, GripVertical,
  Loader2, Trash2, Lock, Unlock, RefreshCw, ChevronDown,
  Package, AlertCircle, Info, Eye, Zap, Filter,
  Wand2, GitMerge, ShieldCheck, ChevronLeft,
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
// TOOLBAR BUTTON
// ═══════════════════════════════════════════════════════
function ToolbarBtn({
  icon: Icon, label, onClick, disabled = false,
  color = "text-muted-foreground", bg = "hover:bg-muted", spin = false,
}: {
  icon: React.ElementType; label: string; onClick?: () => void;
  disabled?: boolean; color?: string; bg?: string; spin?: boolean;
}) {
  return (
    <div className="relative group">
      <button
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "h-7 w-7 rounded-md border border-input bg-background flex items-center justify-center transition-colors disabled:opacity-40",
          bg, color
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", spin && "animate-spin")} />
      </button>
      <span className="absolute left-1/2 -translate-x-1/2 top-8 z-50 px-2 py-1 rounded bg-foreground text-background text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
        {label}
      </span>
    </div>

  );
}

// ═══════════════════════════════════════════════════════
// SITE SELECT — driven by real API sites
// ═══════════════════════════════════════════════════════
function SiteSelect({ sites, value, onChange }: { sites: RpSite[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-[200px] text-xs">
        <SelectValue placeholder="Select site…" />
      </SelectTrigger>
      <SelectContent>
        {sites.map((s) => (
          <SelectItem key={s.siteCode} value={s.siteCode}>
            <span className="font-mono text-xs text-primary mr-1.5">{s.siteCode}</span>
            <span className="text-muted-foreground text-[11px]">{s.siteName}</span>
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
    <div className={cn("rounded-md px-2.5 py-1.5 text-white flex items-center justify-between", color)}>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/65 leading-none">{label}</p>
        <p className="text-lg font-bold leading-none mt-0.5">{value}</p>
      </div>
      <Icon className="w-4 h-4 text-white/30" />
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
        "border-b border-border/20 cursor-pointer transition-colors select-none group",
        selected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-[#eff6ff]",
        dragging && "opacity-50"
      )}
    >
      <td className="px-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
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
        <GripVertical className="w-3 h-3 text-muted-foreground/30" />
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
      <table className="w-full min-w-[600px]" style={{ fontSize: "11px" }}>
        <thead className="bg-muted/40 sticky top-0 z-10">
          <tr>
            {["Seq","Type","Txn","Client","Address","City","Route","Priority","Qty","Weight"].map((h) => (
              <th key={h} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap border-b border-border/30">{h}</th>
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
// ACTIVE TOUR PANEL — new design per wireframe:
//   Left 70%: header row (vehicle | driver | dep | arv | stops | weight | vol | qty | travel)
//   Right 30%: timeline — stop bubbles 1,2,3,4,5...
//   Click timeline bubble → show stop detail inline (no separate zone 3)
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

function ActiveTourPanel({
  vehicle, driver, stops,
  dropZoneActive, onDragOver, onDragLeave, onDrop, onDriverDrop,
  onClearVehicle, onClearDriver, onRemoveStop, onClear, onConfirm,
}: ActiveTourPanelProps) {
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
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

  const capPct = vehicle ? Math.min(100, Math.round((totalWeight / vehicle.capacity) * 100)) : 0;
  const capColor = capPct > 90 ? "bg-rose-500" : capPct > 70 ? "bg-amber-500" : "bg-emerald-500";
  const hasAssignment = !!(vehicle || driver || stops.length);

  const selectedStopData = selectedStop !== null ? stops[selectedStop] : null;

  // Chip component — small inline field
  function Chip({ label, value, onClick, filled }: { label: string; value: string; onClick?: () => void; filled?: boolean }) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "flex flex-col min-w-[60px] px-2 py-1 rounded border text-center flex-shrink-0",
          filled ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 cursor-pointer" :
          onClick ? "border-dashed border-border/50 bg-muted/10 cursor-pointer hover:border-primary/40" :
          "border-border/30 bg-muted/20"
        )}
      >
        <span className="text-[8px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">{label}</span>
        <span className={cn("text-[11px] font-semibold leading-none truncate", filled ? "text-emerald-700" : "text-foreground")}>
          {value || <span className="text-muted-foreground/40 italic text-[9px]">—</span>}
        </span>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={cn(
        "rounded-lg overflow-hidden transition-all",
        dropZoneActive ? "ring-2 ring-primary/40 bg-primary/2" : ""
      )}
      style={{ border: "1px solid hsl(var(--border) / 0.4)" }}
    >
      {/* ── HEADER ROW — full width single line ────────── */}
      <div className="flex items-center justify-between px-2 py-1 bg-gradient-to-r from-[#0f172a] to-[#1e3a5f] flex-shrink-0">
        <div className="flex items-center gap-1">
          <Play className="w-3 h-3 text-primary/80 flex-shrink-0" />
          <span className="text-[10px] font-semibold text-white tracking-wide">Active Trip</span>
          {dropZoneActive && <span className="text-[9px] text-primary animate-pulse ml-1">Drop here…</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost"
            className="h-5 text-[9px] gap-0.5 text-white/60 hover:text-white hover:bg-white/10 px-1.5"
            onClick={onClear} disabled={!hasAssignment}>
            <Trash2 className="w-2.5 h-2.5" /> Clear
          </Button>
          <Button size="sm"
            className="h-5 text-[9px] gap-0.5 bg-blue-600 hover:bg-blue-500 text-white border-0 px-2"
            onClick={onConfirm}>
            <CheckCheck className="w-2.5 h-2.5" /> Confirm
          </Button>
        </div>
      </div>

      {/* ── MAIN ROW: 70% chips | 30% timeline ─────────── */}
      <div className="flex items-stretch bg-card" style={{ minHeight: 64 }}>

        {/* LEFT 70% — chips in one row */}
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap" style={{ width: "70%" }}>

          {/* Vehicle chip */}
          <div
            onClick={() => !vehicle && undefined}
            className={cn(
              "flex flex-col min-w-[72px] px-2 py-1 rounded border flex-shrink-0",
              vehicle
                ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"
                : "border-dashed border-border/50 bg-muted/10"
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] uppercase tracking-wide text-muted-foreground leading-none">Vehicle</span>
              {vehicle && <button onClick={onClearVehicle} className="text-muted-foreground/40 hover:text-destructive"><X className="w-2.5 h-2.5" /></button>}
            </div>
            <span className={cn("text-[11px] font-mono font-bold leading-none mt-0.5 truncate", vehicle ? "text-emerald-700" : "text-muted-foreground/30 italic text-[9px]")}>
              {vehicle ? vehicle.code : "—"}
            </span>
          </div>

          {/* Driver chip */}
          <div
            onDragOver={(e) => e.preventDefault()} onDrop={onDriverDrop}
            className={cn(
              "flex flex-col min-w-[80px] px-2 py-1 rounded border flex-shrink-0",
              driver
                ? "border-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/20"
                : "border-dashed border-border/50 bg-muted/10"
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] uppercase tracking-wide text-muted-foreground leading-none">Driver</span>
              {driver && <button onClick={onClearDriver} className="text-muted-foreground/40 hover:text-destructive"><X className="w-2.5 h-2.5" /></button>}
            </div>
            <span className={cn("text-[11px] font-semibold leading-none mt-0.5 truncate", driver ? "text-indigo-700" : "text-muted-foreground/30 italic text-[9px]")}>
              {driver ? driver.name : "—"}
            </span>
          </div>

          {/* Separator */}
          <div className="w-px self-stretch bg-border/30 mx-0.5" />

          {/* Stat chips */}
          {[
            { label: "Dep Site",  value: vehicle?.departureSite || "—" },
            { label: "Arv Site",  value: vehicle?.arrivalSite   || "—" },
            { label: "Stops",     value: String(stops.length) },
            { label: "Drops",     value: String(dropCount) },
            { label: "Pickups",   value: String(pickCount) },
            { label: "Weight",    value: totalWeight ? `${totalWeight}kg` : "—" },
            { label: "Volume",    value: totalVol    ? `${totalVol}m³`    : "—" },
            { label: "Qty",       value: totalQty    ? String(totalQty)   : "—" },
            { label: "Travel",    value: travelStr },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col min-w-[44px] px-1.5 py-1 rounded border border-border/30 bg-muted/20 flex-shrink-0 text-center">
              <span className="text-[8px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">{label}</span>
              <span className="text-[11px] font-semibold leading-none text-foreground">{value}</span>
            </div>
          ))}

          {/* Capacity bar */}
          {vehicle && stops.length > 0 && (
            <div className="flex items-center gap-1 min-w-[60px] flex-shrink-0">
              <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full", capColor)} style={{ width: `${capPct}%` }} />
              </div>
              <span className={cn("text-[9px] font-bold", capPct > 90 ? "text-rose-600" : "text-emerald-600")}>{capPct}%</span>
            </div>
          )}
        </div>

        {/* RIGHT 30% — road timeline ──────────────────────── */}
        <div
          className="flex items-center border-l border-border/30 bg-muted/10 px-3 overflow-hidden"
          style={{ width: "30%" }}
        >
          {stops.length === 0 ? (
            <div className="flex items-center w-full gap-1 opacity-30">
              <div className="w-2 h-2 rounded-full border-2 border-border bg-card flex-shrink-0" />
              <div className="flex-1 h-px border-t-2 border-dashed border-border/50" />
              <div className="w-2 h-2 rounded-full border-2 border-border bg-card flex-shrink-0" />
            </div>
          ) : (
            <div className="flex items-center w-full overflow-x-auto py-1" style={{ scrollbarWidth: "none" }}>
              <div className="flex items-center min-w-full">
                {stops.map((s, i) => {
                  const isSelected = selectedStop === i;
                  const isLast = i === stops.length - 1;
                  const dotSize = stops.length <= 5 ? "w-7 h-7 text-[9px]"
                                : stops.length <= 10 ? "w-6 h-6 text-[8px]"
                                : "w-5 h-5 text-[7px]";
                  return (
                    <div key={s.id} className="flex items-center flex-shrink-0">
                      {/* Stop node */}
                      <div className="flex flex-col items-center">
                        {/* Time above */}
                        {stops.length <= 8 && (
                          <span className="text-[7px] text-muted-foreground leading-none mb-0.5 font-mono">
                            {times[i]}
                          </span>
                        )}
                        {/* Circle */}
                        <button
                          onClick={() => setSelectedStop(isSelected ? null : i)}
                          title={`${s.txn} · ${s.client}`}
                          className={cn(
                            "rounded-full border-2 flex items-center justify-center font-bold transition-all flex-shrink-0",
                            dotSize,
                            isSelected
                              ? s.type === "DROP"
                                ? "bg-rose-600 border-rose-600 text-white scale-110 shadow-md"
                                : "bg-sky-600 border-sky-600 text-white scale-110 shadow-md"
                              : s.type === "DROP"
                                ? "bg-white border-rose-400 text-rose-600 hover:bg-rose-50 hover:scale-105"
                                : "bg-white border-sky-400 text-sky-600 hover:bg-sky-50 hover:scale-105"
                          )}
                        >
                          {i + 1}
                        </button>
                        {/* Stop label below */}
                        {stops.length <= 6 && (
                          <span className="text-[7px] text-muted-foreground leading-none mt-0.5 max-w-[40px] truncate text-center">
                            {s.client.split(" ")[0]}
                          </span>
                        )}
                      </div>
                      {/* Road connector to next stop */}
                      {!isLast && (
                        <div className="flex items-center flex-shrink-0 mx-0.5"
                          style={{ width: stops.length <= 4 ? 32 : stops.length <= 8 ? 20 : 12 }}>
                          <div className="w-full flex items-center gap-px">
                            <div className="flex-1 h-0.5 bg-gradient-to-r from-border to-border/60" />
                            <div className="w-1 h-1 rounded-full bg-border/60 flex-shrink-0" />
                            <div className="flex-1 h-0.5 bg-gradient-to-r from-border/60 to-border" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SELECTED STOP DETAIL — inline, no border ──── */}
      <AnimatePresence>
        {selectedStopData && (
          <motion.div
            key={selectedStop}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-border/20 bg-muted/10"
          >
            <div className="flex items-start gap-4 px-3 py-1.5">
              {/* Stop type badge */}
              <span className={cn(
                "text-[9px] px-2 py-0.5 rounded font-bold flex-shrink-0 mt-0.5",
                selectedStopData.type === "DROP" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"
              )}>
                #{(selectedStop ?? 0) + 1} {selectedStopData.type}
              </span>
              <div className="grid grid-cols-6 gap-x-4 gap-y-0.5 flex-1 text-[10px]">
                <div><span className="text-muted-foreground">Doc:</span> <span className="font-mono text-primary font-semibold">{selectedStopData.txn}</span></div>
                <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{selectedStopData.client}</span></div>
                <div><span className="text-muted-foreground">Code:</span> <span className="font-mono">{selectedStopData.bpcode}</span></div>
                <div><span className="text-muted-foreground">City:</span> <span>{selectedStopData.city}</span></div>
                <div><span className="text-muted-foreground">Time:</span> <span className="font-mono">{times[selectedStop ?? 0]}</span></div>
                <div><span className="text-muted-foreground">Priority:</span>
                  <span className={cn("ml-1 text-[9px] px-1 rounded font-bold",
                    selectedStopData.priority === "URGENT" ? "bg-rose-100 text-rose-700" :
                    selectedStopData.priority === "LOW" ? "bg-slate-100 text-slate-600" : "bg-green-100 text-green-700"
                  )}>{selectedStopData.priority}</span>
                </div>
                <div><span className="text-muted-foreground">Address:</span> <span>{selectedStopData.address}</span></div>
                <div><span className="text-muted-foreground">Postal:</span> <span>{selectedStopData.postalCity}</span></div>
                <div><span className="text-muted-foreground">Qty:</span> <span className="font-mono">{selectedStopData.qty}</span></div>
                <div><span className="text-muted-foreground">Weight:</span> <span className="font-mono">{selectedStopData.netweight}kg</span></div>
                <div><span className="text-muted-foreground">Vol:</span> <span className="font-mono">{selectedStopData.vol}m³</span></div>
                <div>
                  <button onClick={() => { onRemoveStop(selectedStopData.id); setSelectedStop(null); }}
                    className="text-[9px] text-rose-500 hover:text-rose-700 font-semibold">Remove</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* empty state */}
      {!hasAssignment && (
        <div className="flex items-center justify-center gap-4 py-2 text-muted-foreground/30 text-[10px] bg-card">
          <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Vehicle</span>
          <span>+</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Driver</span>
          <span>+</span>
          <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Stops</span>
          <span>→</span>
          <span className="flex items-center gap-1"><CheckCheck className="w-3 h-3" /> Confirm</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ROUTE MANAGEMENT DETAIL — full screen page
// Shown when (i) is clicked on a trip row
// Back button returns to planner without reloading data
// ═══════════════════════════════════════════════════════
function RouteManagementDetail({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const depDate  = trip.createdAt.split("T")[0] ?? trip.createdAt;
  const depTime  = "07:30";
  const retTime  = "18:30";
  const totalKm  = trip.distanceKm;
  const totalMin = trip.travelTimeMin;
  const totalH   = Math.floor(totalMin / 60);
  const totalM   = totalMin % 60;
  const travelCost = Math.round(totalKm * 0.045);
  const distCost   = Math.round(totalKm * 1.5);
  const totalCost  = travelCost + distCost;

  return (
    <div className="flex flex-col bg-background min-h-screen" style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: "11px" }}>
      <div className="flex-1 overflow-y-auto">

        {/* ── Full-page header ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 sticky top-0 bg-background z-10 shadow-sm">
          {/* Back button */}
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to Planner
          </button>

          {/* Centred title */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <h2 className="text-sm font-semibold">Route Management</h2>
            <p className="text-[10px] text-muted-foreground font-mono">{trip.id}</p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold", statusColor(trip.status))}>
              {trip.status.toUpperCase()}
            </span>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1">
              <RouteIcon className="w-3 h-3" /> Optimise
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1">
              <Lock className="w-3 h-3" /> Lock
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1">
              <ShieldCheck className="w-3 h-3" /> Validate
            </Button>
            <Button size="sm" className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
              <Truck className="w-3 h-3" /> Load to Truck
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-rose-600 hover:bg-rose-50">
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* ── Route info grid ── */}
          <section>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 text-[11px]">
              {[
                { label: "Route Num",            value: trip.id },
                { label: "Vehicle Load Stock",   value: `KCC${trip.seq.toString().padStart(6,"0")}XCHG0000001` },
                { label: "Status",               value: trip.status },
                { label: "Departure Site",        value: trip.departSite },
                { label: "Arrival Site",          value: trip.arrivalSite },
                { label: "Carrier",              value: trip.vehicle.category || "N/A" },
                { label: "Vehicle Class",         value: trip.vehicle.category },
                { label: "Vehicle",              value: trip.vehicle.code },
                { label: "Route Type",           value: "Scheduled" },
                { label: "Driver ID",            value: trip.driver.id },
                { label: "Driver",               value: trip.driver.name },
                { label: "Creation Date",        value: depDate },
                { label: "Creation Time",        value: depTime },
                { label: "Trip",                 value: String(trip.seq) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</p>
                  <p className="font-semibold text-primary">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-border/40" />

          {/* ── Planning / Actual + Photos ── */}
          <div className="grid grid-cols-[1fr_auto] gap-6">
            <div className="space-y-4">
              {/* Planning */}
              <div>
                <h3 className="text-[11px] font-semibold text-primary mb-2 pb-1 border-b border-border/40">Planning</h3>
                <div className="grid grid-cols-4 gap-4 text-[11px]">
                  {[
                    { label: "Departure Date", value: depDate },
                    { label: "Departure Time", value: depTime },
                    { label: "Return Date",    value: depDate },
                    { label: "Return Time",    value: retTime },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                      <p className="font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Actual */}
              <div>
                <h3 className="text-[11px] font-semibold text-muted-foreground mb-2 pb-1 border-b border-border/40">Actual</h3>
                <div className="grid grid-cols-4 gap-4 text-[11px]">
                  {["Departure Date","Departure Time","Return Date","Return Time"].map((label) => (
                    <div key={label}>
                      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-muted-foreground/40">—</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Vehicle + Driver photos */}
            <div className="flex gap-3 flex-shrink-0">
              <div className="text-center">
                <div className="w-28 h-20 rounded-lg bg-muted border border-border/60 flex items-center justify-center overflow-hidden">
                  <Truck className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Vehicle : {trip.vehicle.code}</p>
              </div>
              <div className="text-center">
                <div className="w-28 h-20 rounded-lg bg-muted border border-border/60 flex items-center justify-center overflow-hidden">
                  <Users className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Driver : {trip.driver.id}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/40" />

          {/* ── Transactions table ── */}
          <section>
            <h3 className="text-[11px] font-semibold text-primary mb-2">Transactions</h3>
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <table className="w-full" style={{ fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#eff6ff" }}>
                    {["Seq","Document Number","Delivery Number","Site","Status","Arrival Date/Time","Departure Date/Time","Service Time","Address","Client Code","Client","City","From Previous Distance","From Previous Travel","Waiting Time"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap border-b"
                        style={{ color: "#1e40af", borderColor: "#bfdbfe" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trip.stops.map((s, i) => (
                    <tr key={s.id} className={cn("border-b border-border/20 hover:bg-muted/30", i % 2 === 1 && "bg-muted/10")}>
                      <td className="px-2 py-1.5 font-mono font-bold text-center">{i + 1}</td>
                      <td className="px-2 py-1.5 font-mono text-primary font-semibold">{s.txn}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">—</td>
                      <td className="px-2 py-1.5 font-mono">{trip.departSite}</td>
                      <td className="px-2 py-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">Scheduled</span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{depDate} 12:41</td>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{depDate} 13:26</td>
                      <td className="px-2 py-1.5 font-mono">00:30</td>
                      <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[100px]">{s.address}</td>
                      <td className="px-2 py-1.5 font-mono">{s.bpcode}</td>
                      <td className="px-2 py-1.5 font-medium truncate max-w-[100px]">{s.client}</td>
                      <td className="px-2 py-1.5">{s.city}</td>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{Math.round(totalKm / Math.max(trip.stops.length, 1))} mi</td>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{String(Math.floor(totalMin / Math.max(trip.stops.length, 1) / 60)).padStart(2,"0")}:{String(totalMin / Math.max(trip.stops.length, 1) % 60 | 0).padStart(2,"0")}</td>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">00:15</td>
                    </tr>
                  ))}
                  {trip.stops.length === 0 && (
                    <tr><td colSpan={15} className="px-3 py-6 text-center text-xs text-muted-foreground">No stops on this trip</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="border-t border-border/40" />

          {/* ── Totals ── */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
              {/* Total Drops */}
              <div className="rounded-lg border border-border/60 p-3">
                <h4 className="text-[10px] font-semibold text-primary mb-2 pb-1 border-b border-border/40">Total Drops</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span className="font-mono font-semibold">{trip.totalWeight.toFixed(2)} LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Mass</span><span className="font-mono">60000.00 LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Loading Mass(%)</span><span className="font-mono">{trip.totalWeight ? ((trip.totalWeight / 60000) * 100).toFixed(2) : "0.00"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Drops Volume</span><span className="font-mono">{trip.totalVol.toFixed(2)} GAL</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Volume</span><span className="font-mono">50000 GAL</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Loading Vol(%)</span><span className="font-mono">{trip.totalVol ? ((trip.totalVol / 50000) * 100).toFixed(2) : "0.00"}</span></div>
                </div>
              </div>
              {/* Total Pickups */}
              <div className="rounded-lg border border-border/60 p-3">
                <h4 className="text-[10px] font-semibold text-primary mb-2 pb-1 border-b border-border/40">Total Pickups</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pickup Weight</span><span className="font-mono font-semibold">0 LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Avail Weight</span><span className="font-mono">60000 LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pickup Volume</span><span className="font-mono">0.00 GAL</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Avail Volume</span><span className="font-mono">50000 GAL</span></div>
                </div>
              </div>
              {/* Totals */}
              <div className="rounded-lg border border-border/60 p-3">
                <h4 className="text-[10px] font-semibold text-primary mb-2 pb-1 border-b border-border/40">Totals</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Distance</span><span className="font-mono font-semibold">{totalKm} Miles</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Travel Time</span><span className="font-mono">{String(totalH).padStart(2,"0")}:{String(totalM).padStart(2,"0")} HH:MM</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Order Count</span><span className="font-mono">{trip.stops.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Time</span><span className="font-mono">{String(totalH + 1).padStart(2,"0")}:{String(totalM + 15).padStart(2,"0")} HH:MM</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Travel Time Cost</span><span className="font-mono">{travelCost} USD</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Distance Cost</span><span className="font-mono">{distCost} USD</span></div>
                  <div className="flex justify-between border-t border-border/40 pt-1 mt-1"><span className="font-semibold">Total Cost</span><span className="font-mono font-bold text-primary">{totalCost} USD</span></div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
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


  return (
    <div>
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
  const [routeCode, setRouteCode]   = useState("");

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
  // 'planner' = main view | 'detail' = trip detail full screen
  const [view, setView]               = useState<"planner" | "detail">("planner");
  const [detailTripId, setDetailTripId] = useState<string | null>(null);

  // Optimisation slide panel
  const [optTripId,   setOptTripId]   = useState<string | null>(null);
  const [optOrder,    setOptOrder]    = useState<"fixed" | "auto">("fixed");
  const [optTime,     setOptTime]     = useState("07:30");
  const [optRunning,  setOptRunning]  = useState(false);
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

  const routeCodes = useMemo(() => {
    const codes = allStops.map(s => s.routeCode).filter(Boolean);
    return Array.from(new Set(codes)).sort();
  }, [allStops]);

  const filteredTrips = useMemo(() =>
    trips.filter((t) =>
      (statusFilter === "all" || t.status === statusFilter) &&
      (!tripSearch || `${t.id} ${t.routeCode} ${t.vehicle.code} ${t.driver.name}`.toLowerCase().includes(tripSearch.toLowerCase()))
    ), [trips, statusFilter, tripSearch]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;
  const detailTrip   = trips.find((t) => t.id === detailTripId)   ?? null;
  const optTrip      = trips.find((t) => t.id === optTripId)      ?? null;

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

  // ── If detail view, render full-screen detail page ─────────
  if (view === "detail" && detailTrip) {
    return (
      <RouteManagementDetail
        trip={detailTrip}
        onBack={() => { setView("planner"); setDetailTripId(null); }}
      />
    );
  }

  return (
    <>
    <div className="flex flex-col bg-background" style={{ height: "calc(100vh - 56px)", fontFamily: "Inter, system-ui, sans-serif", fontSize: "12px" }}>

      {/* ── TOOLBAR ─ compact single row ─────────────── */}
      <div className="flex items-center gap-2 px-3 py-1 bg-card border-b border-border/60 flex-shrink-0">
        {/* Site */}
        {sitesLoading
          ? <div className="h-8 flex items-center gap-1.5 px-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading sites…</div>
          : <SiteSelect sites={sites} value={site} onChange={setSite} />
        }
        {/* Date */}
        <div className="relative">
          <CalIcon className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="h-7 pl-6 pr-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/30 w-[130px]"
          />
        </div>
        {/* Route Codes */}
        <Select value={routeCode} onValueChange={setRouteCode}>
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue placeholder="Route Codes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Routes</SelectItem>
            {routeCodes.map(rc => (
              <SelectItem key={rc} value={rc}>{rc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Refresh */}
        <ToolbarBtn icon={RefreshCw} label="Refresh" spin={loading}
          disabled={loading || !site} color="text-muted-foreground"
          onClick={() => setRefreshKey((k) => k + 1)} />

        <div className="h-5 w-px bg-border/50 mx-0.5" />

        <ToolbarBtn icon={Wand2}       label="Auto Generate Route" color="text-blue-600"    bg="hover:bg-blue-50"    onClick={() => toast({ title: "Auto Generate Route",  description: "Not yet implemented" })} />
        <ToolbarBtn icon={GitMerge}    label="Group Optimisation"  color="text-slate-600"   bg="hover:bg-slate-50"   onClick={() => toast({ title: "Group Optimisation",   description: "Not yet implemented" })} />
        <ToolbarBtn icon={Lock}        label="Group Lock"          color="text-emerald-600" bg="hover:bg-emerald-50" onClick={() => toast({ title: "Group Lock",            description: "Not yet implemented" })} />
        <ToolbarBtn icon={Unlock}      label="Group Unlock"        color="text-violet-600"  bg="hover:bg-violet-50"  onClick={() => toast({ title: "Group Unlock",          description: "Not yet implemented" })} />
        <ToolbarBtn icon={ShieldCheck} label="Group Validate"      color="text-amber-600"   bg="hover:bg-amber-50"   onClick={() => toast({ title: "Group Validate",        description: "Not yet implemented" })} />
        <ToolbarBtn icon={Trash2}      label="Group Delete Trips"  color="text-rose-600"    bg="hover:bg-rose-50"    onClick={() => toast({ title: "Group Delete Trips",    description: "Not yet implemented" })} />
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
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-0 px-2 pt-2 pb-1.5" style={{ minHeight: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>

          {/* ── KPI STRIP ──────────────────────────────── */}
          <div className="grid grid-cols-6 gap-1.5 flex-shrink-0 mb-2.5">
            <KpiCard label="Vehicles"          value={kpis.vehicles}         icon={Truck}           color="bg-gradient-to-br from-slate-500 to-slate-700" />
            <KpiCard label="Trips"             value={kpis.trips}            icon={RouteIcon}       color="bg-gradient-to-br from-indigo-500 to-indigo-700" />
            <KpiCard label="Assigned Docs"     value={kpis.assignedDocs}     icon={CheckCheck}      color="bg-gradient-to-br from-emerald-500 to-emerald-700" />
            <KpiCard label="Non-Assigned Docs" value={kpis.unassignedDocs}   icon={AlertCircle}     color="bg-gradient-to-br from-amber-500 to-amber-600" />
            <KpiCard label="Delivery Qty"      value={kpis.totalDeliveryQty} icon={ArrowDownToLine} color="bg-gradient-to-br from-rose-500 to-rose-600" />
            <KpiCard label="Pickup Qty"        value={kpis.totalPickupQty}   icon={ArrowUpFromLine} color="bg-gradient-to-br from-sky-500 to-sky-600" />
          </div>

          {/* ── FLEET | DOCUMENTS ── */}
          <div className="grid grid-cols-2 gap-2 mb-2.5" style={{ height: "40vh", minHeight: 250 }}>

            {/* ════════════════════════════════════════
                LEFT 50% — FLEET (Vehicles + Drivers tabbed)
                ════════════════════════════════════════ */}
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">

                {/* Solid header bar — Fleet */}
              <div className="bg-[#1e40af] px-2 py-1 flex items-center gap-1.5 flex-shrink-0">
                {([
                  { key: "vehicles", label: "Vehicles", icon: Truck,  count: vehicles.length },
                  { key: "drivers",  label: "Drivers",  icon: Users,  count: drivers.length  },
                ] as const).map(({ key, label, icon: Icon, count }) => (
                  <button key={key} onClick={() => setFleetTab(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                      fleetTab === key
                        ? "bg-white text-[#1e40af]"
                        : "text-white/50 hover:text-white/80"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                    <span className={cn(
                      "text-[9px] font-bold rounded-full px-1.5 py-0.5",
                      fleetTab === key
                        ? "bg-[#dbeafe] text-[#1e3a8a]"
                        : "bg-white/10 text-white/50"
                    )}>{count}</span>
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="px-2 py-1 border-b border-border/40">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={fleetTab === "vehicles" ? vehSearch : drvSearch}
                    onChange={(e) => fleetTab === "vehicles" ? setVehSearch(e.target.value) : setDrvSearch(e.target.value)}
                    placeholder={`Search ${fleetTab}…`}
                    className="h-6 pl-6 text-[10px]"
                  />
                </div>
              </div>

              {/* VEHICLES content */}
              {fleetTab === "vehicles" && (
                <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
                  <table className="w-full" style={{ fontSize: "11px" }}>
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr>
                        {["Vehicle Code","Vehicle No","Category","Depart Site","Start"].map((h) => (
                          <th key={h} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap border-b" style={{ background:"#eff6ff", color:"#1e40af", borderColor:"#bfdbfe" }}>{h}</th>
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
                              "border-b border-border/20 cursor-pointer transition-colors select-none text-[11px]",
                              sel
                                ? "bg-emerald-50 dark:bg-emerald-950/30"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <td className={cn("px-2 py-1 font-mono font-bold text-[11px]", sel ? "text-emerald-700" : "text-primary")}>
                              {v.code}
                              {sel && <span className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded font-semibold">Selected</span>}
                            </td>
                            <td className="px-2 py-1 font-mono text-muted-foreground">{v.vehicleNo}</td>
                            <td className="px-2 py-1">{v.category}</td>
                            <td className="px-2 py-1 font-mono text-muted-foreground">{v.departureSite}</td>
                            <td className="px-2 py-1 text-muted-foreground">{v.startTime}</td>
                          </tr>
                        );
                      })}
                      {vehicles.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">No vehicles for this site</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* DRIVERS content — table format matching vehicles */}
              {fleetTab === "drivers" && (
                <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
                  <table className="w-full" style={{ fontSize: "11px" }}>
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr>
                        {["Driver Code","Driver Name","License","Status"].map((h) => (
                          <th key={h} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap border-b" style={{ background:"#eff6ff", color:"#1e40af", borderColor:"#bfdbfe" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((d) => {
                        const busy = d.status !== "Available";
                        const sel  = draftDriver?.id === d.id;
                        return (
                          <tr key={d.id}
                            draggable={!busy}
                            onDragStart={(e) => onDriverDragStart(e, d)}
                            onClick={() => { if (!busy) setDraftDriver(sel ? null : d); }}
                            className={cn(
                              "border-b border-border/20 cursor-pointer transition-colors select-none text-[11px]",
                              sel
                                ? "bg-indigo-50 dark:bg-indigo-950/30"
                                : busy ? "opacity-50 hover:bg-muted/30" : "hover:bg-indigo-50/40"
                            )}
                          >
                            <td className={cn("px-2 py-1 font-mono font-bold text-[11px]", sel ? "text-indigo-700" : "text-primary")}>
                              {d.id}
                              {sel && <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded font-semibold">Selected</span>}
                            </td>
                            <td className="px-2 py-1 font-medium">{d.name}</td>
                            <td className="px-2 py-1 font-mono text-muted-foreground">{d.license}</td>
                            <td className="px-2 py-1">
                              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                busy ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              )}>{busy ? "On Trip" : "Available"}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {drivers.length === 0 && (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-muted-foreground">No drivers found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════
                RIGHT 50% — DOCUMENTS (Drops + Pickups tabbed)
                ════════════════════════════════════════ */}
            <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden flex flex-col">

              {/* Solid header bar — Documents */}
              <div className="bg-[#1e40af] px-2 py-1 flex items-center gap-1.5 flex-shrink-0">
                {([
                  { key: "drops",   label: "Deliveries", icon: ArrowDownToLine, count: drops.length   },
                  { key: "pickups", label: "Pickups",    icon: ArrowUpFromLine, count: pickups.length },
                ] as const).map(({ key, label, icon: Icon, count }) => (
                  <button key={key} onClick={() => setStopTypeTab(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                      stopTypeTab === key
                        ? "bg-white text-[#1e40af]"
                        : "text-white/50 hover:text-white/80"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                    <span className={cn(
                      "text-[9px] font-bold rounded-full px-1.5 py-0.5",
                      stopTypeTab === key
                        ? "bg-[#dbeafe] text-[#1e3a8a]"
                        : "bg-white/10 text-white/50"
                    )}>{count}</span>
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-white/40 hidden sm:block">drag or select + Add</span>
              </div>

              {/* Search + action bar */}
              <div className="px-2 py-1 border-b border-border/40 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={currentSearch}
                    onChange={(e) => setCurrentSearch(e.target.value)}
                    placeholder={`Search ${stopTypeTab === "drops" ? "deliveries" : "pickups"}…`}
                    className="h-6 pl-6 text-[10px]"
                  />
                </div>
                {selectedStopIds.size > 0 && (
                  <Button size="sm" className="h-6 text-[11px] gap-1 flex-shrink-0" onClick={addSelectedStopsToDraft}>
                    <CheckCheck className="w-3 h-3" />
                    Add {selectedStopIds.size} to Trip
                  </Button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
                <table className="w-full min-w-[600px]" style={{ fontSize: "11px" }}>
                  <thead className="bg-muted/40 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1 border-b w-7" style={{ background:"#eff6ff", borderColor:"#bfdbfe" }}>
                        <Checkbox
                          checked={allCurrentSelected}
                          onCheckedChange={() => toggleAllStops(currentStops)}
                        />
                      </th>
                      {["Transaction No","Prep List","Priority","Client Code","Client","Route Code","Postal City","Qty","Weight",""].map((h) => (
                        <th key={h} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap border-b" style={{ background:"#eff6ff", color:"#1e40af", borderColor:"#bfdbfe" }}>{h}</th>
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
          {/* ── ACTIVE TOUR ── */}
          <div>
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

          {/* ── TRIPS & MAP ── */}
          <div style={{ minHeight: "40vh" }}>
          {/* ── BOTTOM: Resizable Trips | Map split ──────────── */}
          <ResizableSplit
            defaultLeftPct={35}
            minPct={20}
            maxPct={80}
            leftLabel={`${filteredTrips.length} trip${filteredTrips.length !== 1 ? "s" : ""}`}
            left={
              <div className="flex h-full overflow-hidden rounded-xl border border-border/60 shadow-sm">

                {/* ── OPTIMISE SLIDE PANEL ── */}
                <AnimatePresence initial={false}>
                  {optTrip && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 200, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="flex-shrink-0 overflow-hidden bg-[#0f172a] flex flex-col"
                      style={{ width: 200 }}
                    >
                      <div className="flex-1 p-3 flex flex-col gap-2 overflow-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">⚡ Optimise</span>
                          <button onClick={() => setOptTripId(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
                        </div>

                        {/* Trip info */}
                        <div className="space-y-1.5 text-[10px]">
                          {[
                            ["Route",   optTrip.id.slice(-12)],
                            ["Driver",  optTrip.driver.name],
                            ["Vehicle", optTrip.vehicle.code],
                            ["Stops",   String(optTrip.stops.length)],
                            ["Distance",`${optTrip.distanceKm} mi`],
                          ].map(([label, val]) => (
                            <div key={label} className="flex justify-between items-center">
                              <span className="text-slate-500">{label}</span>
                              <span className="text-slate-100 font-semibold font-mono text-[10px]">{val}</span>
                            </div>
                          ))}
                        </div>

                        <div className="h-px bg-slate-800" />

                        {/* Order mode */}
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1.5">Stop Order</p>
                          <div className="flex gap-1.5">
                            {(["fixed","auto"] as const).map((mode) => (
                              <button key={mode} onClick={() => setOptOrder(mode)}
                                className={cn(
                                  "flex-1 py-1 rounded text-[10px] font-semibold transition-all",
                                  optOrder === mode
                                    ? "bg-[#1d4ed8] text-white"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                )}>
                                {mode === "fixed" ? "Keep Order" : "Auto Route"}
                              </button>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-600 mt-1">
                            {optOrder === "fixed" ? "Stops stay in current sequence" : "System finds fastest route"}
                          </p>
                        </div>

                        <div className="h-px bg-slate-800" />

                        {/* Start time */}
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1.5">Start Time</p>
                          <input
                            type="time" value={optTime}
                            onChange={(e) => setOptTime(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Timeline preview */}
                        {optTrip.stops.length > 0 && (
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1.5">Stops</p>
                            <div className="flex items-center gap-1">
                              {optTrip.stops.map((s, i) => (
                                <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
                                  <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white",
                                    s.type === "DROP" ? "bg-rose-500" : "bg-sky-500"
                                  )}>{i + 1}</div>
                                  {i < optTrip.stops.length - 1 && (
                                    <div className="w-3 h-px bg-slate-700" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Run button */}
                      <button
                        disabled={optRunning}
                        onClick={() => {
                          setOptRunning(true);
                          setTimeout(() => {
                            setOptRunning(false);
                            setOptTripId(null);
                            toast({ title: "Optimisation complete", description: `Trip ${optTrip.id.slice(-12)} has been optimised` });
                          }, 1800);
                        }}
                        className={cn(
                          "m-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-2",
                          optRunning
                            ? "bg-slate-700 text-slate-400"
                            : "bg-amber-500 hover:bg-amber-400 text-slate-900"
                        )}
                      >
                        {optRunning
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</>
                          : <>▶ OPTIMISE</>
                        }
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── TRIPS TABLE ── */}
                <div className="bg-card flex flex-col h-full flex-1 overflow-hidden">
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
                  <table className="w-full min-w-[480px]" style={{ fontSize: "11px" }}>
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
                              <button
                                className="text-sky-600 hover:text-sky-700 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setDetailTripId(t.id); setView("detail"); }}
                                title="Route Management Detail"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            <td className="px-1.5 py-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOptTripId(optTripId === t.id ? null : t.id); }}
                                title="Optimise this trip"
                                className={cn(
                                  "w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] transition-all",
                                  optTripId === t.id
                                    ? "bg-amber-500 text-white shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-amber-100 hover:text-amber-600"
                                )}
                              >
                                ‹
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
        </div>
      )}
    </div>

  </>
  );
}
