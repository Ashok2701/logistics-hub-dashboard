import React, { useMemo, useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Users, Calendar as CalIcon, Building2, Search,
  MapPin, Route as RouteIcon, ArrowDownToLine, ArrowUpFromLine,
  CheckCheck, X, Play, Map as MapIcon, List, GripVertical,
  Loader2, Trash2, Lock, Unlock, RefreshCw, ChevronDown,
  Package, AlertCircle, Info, Eye, Zap, Filter,
  Wand2, GitMerge, ShieldCheck, ChevronLeft, Warehouse, CheckCircle2,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fetchTmsSites, loadPlannerData, type RpSite, type RpVehicle, type RpDriver, type RpStop } from "@/lib/routePlannerApi";
import { callVroom, secToHHMM, hhmmToSec, type VroomStep } from "@/lib/vroomApi";
import { tripApi, type TripResponseDTO, type OptiStatus } from "@/lib/tripApi";
import { transportApi } from "@/lib/transportApi";
import { x3SoapApi } from "@/lib/x3SoapApi";

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
  routeStatus: string;             // "To Plan" | "Planned" | …
  routeTagColor?: string | null;   // hex for Type badge background
  // Optimisation output (populated once trip is optimised)
  seq?: number;
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  fromPrevDistance?: string;
  fromPrevTravelTime?: string;
  serviceTime?: string;
  waitingTime?: string;
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
    routeStatus: s.routeStatus && s.routeStatus.trim() ? s.routeStatus : "To Plan",
    routeTagColor: s.routeColor ?? null,
  };
}

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
type TripStatus = "Open" | "Optimized" | "Optimised" | "Locked" | "Confirmed" | "Validated";
type Trip = {
  id: string; routeCode: string; seq: number;
  vehicle: Vehicle; driver: Driver; stops: Stop[];
  distanceKm: number; travelTimeMin: number; totalWeight: number; totalVol: number;
  totalQty: number; pickups: number; deliveries: number;
  status: TripStatus; locked: boolean; tmsValidated: boolean;
  createdAt: string; departSite: string; arrivalSite: string;
  // API-backed fields (present once trip is persisted)
  tripId?: number;
  tripCode?: string;
  optiStatus?: OptiStatus;
  lockFlag?: number;
  createDate?: string;
  updateDate?: string;
  startTime?: string;
  endTime?: string;
};

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
const priorityColor = (p: Stop["priority"]) =>
  p === "URGENT" ? "bg-rose-100 text-rose-800 border-rose-200"
  : p === "LOW"    ? "bg-slate-100 text-slate-600 border-slate-200"
  : "bg-green-100 text-green-800 border-green-200";

const statusColor = (s: TripStatus) => ({
  Open:      "bg-gray-100 text-gray-700",
  Optimized: "bg-blue-100 text-blue-700",
  Optimised: "bg-blue-100 text-blue-700",
  Locked:    "bg-amber-100 text-amber-700",
  Validated: "bg-green-100 text-green-700",
  Confirmed: "bg-green-100 text-green-700",
}[s]);

// Map API optiStatus → internal status
function statusFromApi(s: OptiStatus): TripStatus {
  return s === "Optimised" ? "Optimised" : s;
}

// Convert an API TripResponseDTO into local Trip shape (best-effort with snapshots)
function tripFromApi(r: TripResponseDTO, fallback?: Partial<Trip>): Trip {
  const stops: Stop[] = Array.isArray(r.stopObjects) && r.stopObjects.length
    ? (r.stopObjects as unknown as Stop[])
    : (fallback?.stops ?? []);
  const vehicle: Vehicle = (r.vehicleObject as unknown as Vehicle) ?? fallback?.vehicle ?? {
    code: r.vehicleCode, vehicleNo: r.vehicleCode, departureSite: r.depSite ?? "",
    arrivalSite: r.arrSite ?? "", driverName: r.driverName, category: "",
    capacity: 0, vol: 0, maxOrders: 0, startTime: r.startTime, site: r.site,
  };
  const driver: Driver = fallback?.driver ?? {
    id: r.driverId ?? "", name: r.driverName, license: "", status: "On Trip", hoursToday: 0,
  };
  const base: Trip = {
    id: r.tripCode,
    routeCode: r.tripCode,
    seq: 0,
    vehicle, driver, stops,
    distanceKm: Number(r.totalDistance) || 0,
    travelTimeMin: 0,
    totalWeight: Number(r.totalWeight) || 0,
    totalVol: Number(r.totalVolume ?? 0) || 0,
    totalQty: 0,
    pickups: r.pickups, deliveries: r.drops,
    status: statusFromApi(r.optiStatus),
    locked: r.lockFlag === 1,
    tmsValidated: r.optiStatus === "Validated",
    createdAt: r.createDate, departSite: r.depSite ?? r.site, arrivalSite: r.arrSite ?? r.site,
    tripId: r.tripId, tripCode: r.tripCode, optiStatus: r.optiStatus,
    lockFlag: r.lockFlag, createDate: r.createDate, updateDate: r.updateDate,
    startTime: r.startTime, endTime: r.endTime,
  };
  // Fallback supplies snapshot defaults; API identifiers must win
  return { ...fallback, ...base };
}

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
          "h-9 w-9 rounded-xl border border-input/80 bg-white/90 backdrop-blur flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40",
          bg, color
        )}
      >
        <Icon className={cn("w-5 h-5", spin && "animate-spin")} />
      </button>
      <span className="absolute left-1/2 -translate-x-1/2 top-10 z-50 px-2 py-1 rounded bg-foreground text-background text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
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
  stop, selected, onToggle, onDragStart, dragging, used, index,
}: {
  stop: Stop; selected: boolean; onToggle: () => void;
  onDragStart: (e: DragEvent) => void; dragging: boolean;
  used?: boolean; index?: number;
}) {
  const tagColor = stop.routeTagColor || "#e2e8f0";
  const tagText  = stop.routeTagColor ? "#ffffff" : "#334155";
  return (
    <tr
      draggable={!used}
      onDragStart={(e) => { if (used) { e.preventDefault(); return; } onDragStart(e); }}
      onClick={() => { if (!used) onToggle(); }}
      className={cn(
        "border-b border-border/20 transition-colors select-none group",
        used
          ? "opacity-50 cursor-not-allowed bg-muted/40"
          : cn(
              "cursor-pointer",
              selected
                ? "bg-primary/5 border-l-2 border-l-primary"
                : (index ?? 0) % 2 === 1
                  ? "bg-muted/30 hover:bg-[#eff6ff]"
                  : "hover:bg-[#eff6ff]"
            ),
        dragging && "opacity-50"
      )}
    >
      <td className="px-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggle} disabled={used} />
      </td>
      <td className="px-2 py-1.5 font-mono text-xs text-primary font-semibold whitespace-nowrap">{stop.txn}</td>
      <td className="px-2 py-1.5 text-xs">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
          style={{ background: tagColor, color: tagText }}
        >
          {stop.prepList}
        </span>
      </td>
      <td className="px-2 py-1.5 text-xs">
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold", priorityColor(stop.priority))}>{stop.priority}</span>
      </td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground font-mono">{stop.bpcode}</td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground">{stop.routeCode}</td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground max-w-[100px] truncate">{stop.postalCity}</td>
      <td className="px-2 py-1.5 text-xs font-mono">{stop.qty}</td>
      <td className="px-2 py-1.5 text-xs font-mono">{stop.netweight}</td>
      <td className="px-2 py-1.5">
        {!used && <GripVertical className="w-3 h-3 text-muted-foreground/30" />}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════
// MAP VIEW
// ═══════════════════════════════════════════════════════
function SiteLeafletMap({ lat, lng, site }: { lat: number; lng: number; site?: RpSite | null }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // leaflet css imported at top of file
      if (cancelled || !containerRef.current) return;
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 13);
        return;
      }
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView([lat, lng], 13);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const label = site?.siteName ?? site?.siteCode ?? "Site";
      const icon = L.divIcon({
        className: "site-warehouse-marker",
        html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
            <div style="background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-radius:9999px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>
            </div>
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid hsl(var(--primary));margin-top:-1px"></div>
            <div style="margin-top:2px;background:white;border:1px solid hsl(var(--border));border-radius:6px;padding:1px 6px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15)">${label}</div>
          </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([lat, lng], { icon }).addTo(map);
    })();
    return () => { cancelled = true; };
  }, [lat, lng, site?.siteCode, site?.siteName]);

  React.useEffect(() => {
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  return (
    <div className="relative flex-1 min-h-[320px] bg-slate-50 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] shadow pointer-events-none">
        <span className="font-semibold text-primary">{site?.siteCode}</span>
        <span className="text-muted-foreground ml-1.5">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
    </div>
  );
}

function RouteMapView({ trip, site, sites = [] }: { trip: Trip | null; site?: RpSite | null; sites?: RpSite[] }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const layerRef = React.useRef<any>(null);

  // No trip → fall back to single-site preview
  const showTrip = !!trip;
  const fallbackLat = site && site.latitude != null ? Number(site.latitude) : null;
  const fallbackLng = site && site.longitude != null ? Number(site.longitude) : null;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);
      }
      const map = mapRef.current;

      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
      const group = L.layerGroup().addTo(map);
      layerRef.current = group;

      const pts: [number, number][] = [];

      const siteIcon = (label: string, color: string) => L.divIcon({
        className: "site-warehouse-marker",
        html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
            <div style="background:${color};color:#fff;border-radius:9999px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><rect width="12" height="12" x="6" y="10"/></svg>
            </div>
            <div style="margin-top:2px;background:white;border:1px solid #e5e7eb;border-radius:6px;padding:1px 6px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15)">${label}</div>
          </div>`,
        iconSize: [0, 0], iconAnchor: [0, 0],
      });

      const stopIcon = (n: number, type: "DROP" | "PICKUP") => {
        const color = type === "DROP" ? "#e11d48" : "#0284c7";
        return L.divIcon({
          className: "stop-marker",
          html: `<div style="background:${color};color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white">${n}</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13],
        });
      };

      if (showTrip && trip) {
        // Departure & arrival sites
        const depSite = sites.find(s => s.siteCode === trip.departSite);
        const arrSite = sites.find(s => s.siteCode === trip.arrivalSite);
        const addSite = (s: RpSite | undefined, label: string, color: string) => {
          if (!s || s.latitude == null || s.longitude == null) return;
          const lat = Number(s.latitude), lng = Number(s.longitude);
          if (!lat && !lng) return;
          L.marker([lat, lng], { icon: siteIcon(`${label}: ${s.siteCode}`, color) }).addTo(group);
          pts.push([lat, lng]);
        };
        addSite(depSite, "DEP", "#10b981");
        if (arrSite && arrSite.siteCode !== depSite?.siteCode) addSite(arrSite, "ARR", "#f59e0b");

        // Stops
        const stopPts: [number, number][] = [];
        trip.stops.forEach((s, i) => {
          const lat = Number(s.lat), lng = Number(s.lng);
          if (!lat || !lng) return;
          L.marker([lat, lng], { icon: stopIcon(i + 1, s.type) })
            .bindPopup(`<b>${i + 1}. ${s.type}</b><br/>${s.txn}<br/>${s.client}<br/>${s.address ?? ""}`)
            .addTo(group);
          stopPts.push([lat, lng]);
          pts.push([lat, lng]);
        });

        // Route polyline: dep → stops → arr
        const linePts: [number, number][] = [];
        if (depSite?.latitude != null && depSite?.longitude != null) linePts.push([Number(depSite.latitude), Number(depSite.longitude)]);
        linePts.push(...stopPts);
        if (arrSite?.latitude != null && arrSite?.longitude != null) linePts.push([Number(arrSite.latitude), Number(arrSite.longitude)]);
        if (linePts.length > 1) {
          L.polyline(linePts, { color: "#6366f1", weight: 3, opacity: 0.7, dashArray: "6 4" }).addTo(group);
        }

        if (pts.length > 0) {
          map.fitBounds(L.latLngBounds(pts as any), { padding: [30, 30], maxZoom: 14 });
        } else {
          map.setView([0, 0], 2);
        }
      } else if (fallbackLat != null && fallbackLng != null && !(fallbackLat === 0 && fallbackLng === 0)) {
        L.marker([fallbackLat, fallbackLng], { icon: siteIcon(site?.siteCode ?? "Site", "hsl(var(--primary))") }).addTo(group);
        map.setView([fallbackLat, fallbackLng], 13);
      } else {
        map.setView([0, 0], 2);
      }
    })();
    return () => { cancelled = true; };
  }, [trip?.id, trip?.stops, site?.siteCode, sites, fallbackLat, fallbackLng, showTrip]);

  React.useEffect(() => {
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  if (!showTrip && (fallbackLat == null || fallbackLng == null || (fallbackLat === 0 && fallbackLng === 0))) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50/50 min-h-[320px]">
        <div className="text-center">
          <MapIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a trip or site to preview on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-[320px] bg-slate-50 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      {showTrip && trip && (
        <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur rounded-lg border border-border/60 px-3 py-2 text-xs flex items-center gap-4 pointer-events-none">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#10b981" }} /> Dep</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#f59e0b" }} /> Arr</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Drop</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" /> Pickup</span>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// STOP LIST VIEW (for selected trip)
// ═══════════════════════════════════════════════════════
// function TripStopListView({ trip }: { trip: Trip | null }) {
//   if (!trip) {
//     return (
//       <div className="flex-1 flex items-center justify-center min-h-[320px]">
//         <p className="text-sm text-muted-foreground">Select a trip to see its stops</p>
//       </div>
//     );
//   }
//   const isOptimised = trip.stops.some((s) => s.arrivalTime || s.departureTime);
//   const headers = isOptimised
//     ? ["Seq","Type","Txn","Client","City","Arrival","Departure","Service","Waiting","Dist (km)","Qty","Weight"]
//     : ["Seq","Type","Txn","Client","Address","City","Route","Priority","Qty","Weight"];
//   return (
//     <div className="flex-1 overflow-auto min-h-[320px]">
//       <table className="w-full min-w-[600px]" style={{ fontSize: "11px" }}>
//         <thead className="bg-muted/40 sticky top-0 z-10">
//           <tr>
//             {headers.map((h) => (
//               <th key={h} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap border-b border-border/30">{h}</th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {trip.stops.map((s, i) => (
//             <tr key={s.id} className={cn("border-b border-border/30 hover:bg-muted/30", i % 2 === 0 ? "" : "bg-muted/10")}>
//               <td className="px-2.5 py-1.5 font-mono font-bold text-center">{s.seq ?? i + 1}</td>
//               <td className="px-2.5 py-1.5">
//                 <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold",
//                   s.type === "DROP" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700")}>{s.type}</span>
//               </td>
//               <td className="px-2.5 py-1.5 font-mono text-primary">{s.txn}</td>
//               <td className="px-2.5 py-1.5 font-medium">{s.client}</td>
//               {isOptimised ? (
//                 <>
//                   <td className="px-2.5 py-1.5">{s.city}</td>
//                   <td className="px-2.5 py-1.5 font-mono">{s.arrivalTime || "—"}</td>
//                   <td className="px-2.5 py-1.5 font-mono">{s.departureTime || "—"}</td>
//                   <td className="px-2.5 py-1.5 font-mono">{s.serviceTime || "—"}</td>
//                   <td className="px-2.5 py-1.5 font-mono">{s.waitingTime || "—"}</td>
//                   <td className="px-2.5 py-1.5 font-mono">{s.fromPrevDistance ?? "—"}</td>
//                 </>
//               ) : (
//                 <>
//                   <td className="px-2.5 py-1.5 text-muted-foreground max-w-[120px] truncate">{s.address}</td>
//                   <td className="px-2.5 py-1.5">{s.city}</td>
//                   <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{s.routeCode}</td>
//                   <td className="px-2.5 py-1.5">
//                     <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold", priorityColor(s.priority))}>{s.priority}</span>
//                   </td>
//                 </>
//               )}
//               <td className="px-2.5 py-1.5 font-mono">{s.qty}</td>
//               <td className="px-2.5 py-1.5 font-mono">{s.netweight} kg</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

function TripStopListView({
  trip,
  onReorder,
}: {
  trip: Trip | null;
  onReorder?: (newStops: Stop[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (!trip) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[320px]">
        <p className="text-sm text-muted-foreground">Select a trip to see its stops</p>
      </div>
    );
  }

  const isOptimised = trip.stops.some((s) => s.arrivalTime || s.departureTime);
  const headers = isOptimised
    ? ["", "Seq","Type","Txn","Client","City","Arrival","Departure","Service","Waiting","Dist (km)","Qty","Weight"]
    : ["", "Seq","Type","Txn","Client","Address","City","Route","Priority","Qty","Weight"];

  function handleDrop(i: number) {
    if (dragIndex === null || dragIndex === i || !onReorder) {
      setDragIndex(null); setOverIndex(null);
      return;
    }
    const reordered = [...trip!.stops];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(i, 0, moved);
    // Re-sequence so downstream consumers (map, active panel) stay in sync
    const withSeq = reordered.map((s, idx) => ({ ...s, seq: idx + 1 }));
    onReorder(withSeq);
    setDragIndex(null); setOverIndex(null);
  }

  return (
    <div className="flex-1 overflow-auto min-h-[320px]">
      <table className="w-full min-w-[600px]" style={{ fontSize: "11px" }}>
        <thead className="bg-muted/40 sticky top-0 z-10">
          <tr>
            {headers.map((h, i) => (
              <th key={h || `col-${i}`} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap border-b border-border/30">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trip.stops.map((s, i) => (
            <tr
              key={s.id}
              draggable={!!onReorder}
              onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              className={cn(
                "border-b border-border/30 hover:bg-muted/30",
                i % 2 === 0 ? "" : "bg-muted/10",
                dragIndex === i && "opacity-40",
                overIndex === i && dragIndex !== null && dragIndex !== i && "border-t-2 border-t-primary"
              )}
            >
              <td className="px-1 py-1.5 text-center">
                {onReorder && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 cursor-grab" />}
              </td>
              <td className="px-2.5 py-1.5 font-mono font-bold text-center">{s.seq ?? i + 1}</td>
              <td className="px-2.5 py-1.5">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold",
                  s.type === "DROP" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700")}>{s.type}</span>
              </td>
              <td className="px-2.5 py-1.5 font-mono text-primary">{s.txn}</td>
              <td className="px-2.5 py-1.5 font-medium">{s.client}</td>
              {isOptimised ? (
                <>
                  <td className="px-2.5 py-1.5">{s.city}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.arrivalTime || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.departureTime || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.serviceTime || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.waitingTime || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.fromPrevDistance ?? "—"}</td>
                </>
              ) : (
                <>
                  <td className="px-2.5 py-1.5 text-muted-foreground max-w-[120px] truncate">{s.address}</td>
                  <td className="px-2.5 py-1.5">{s.city}</td>
                  <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{s.routeCode}</td>
                  <td className="px-2.5 py-1.5">
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold", priorityColor(s.priority))}>{s.priority}</span>
                  </td>
                </>
              )}
              <td className="px-2.5 py-1.5 font-mono">{s.qty}</td>
              <td className="px-2.5 py-1.5 font-mono">{s.netweight} kg</td>
            </tr>
          ))}
        </tbody>
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
  selectedTripStatus?: string | null;
  tripLocked?: boolean;
  // Trip-level identity
  tripDepSite?: string | null;
  tripArrSite?: string | null;
  tripDistanceKm?: number | null;
  tripStartTime?: string | null;
  tripEndTime?: string | null;
  // Optimisation context
  siteLat?: number;
  siteLng?: number;
  activeTripId?: number | null;
  activeTripCode?: string | null;
  planDate?: string;
  onTripOptimised?: (tripId: number, stopResults: any[], totals: { distanceKm: number; travelTime: string; endTime: string }) => void;
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
  selectedTripStatus,
  tripLocked = false,
  tripDepSite = null, tripArrSite = null, tripDistanceKm = null, tripStartTime = null, tripEndTime = null,
  siteLat = 0, siteLng = 0, activeTripId = null, activeTripCode = null, planDate = "",
  onTripOptimised,
}: ActiveTourPanelProps) {
  const [selectedStop,  setSelectedStop]  = useState<number | null>(null);
  const [showOptModal,  setShowOptModal]  = useState(false);
  const [showOptConfirm, setShowOptConfirm] = useState(false);
  const [optOrder,      setOptOrder]      = useState<"fixed"|"auto">("fixed");
  const [optStartDate,  setOptStartDate]  = useState(() => new Date().toISOString().slice(0, 10));
  const [optStartTime,  setOptStartTime]  = useState("07:30");
  const [optRunning,    setOptRunning]    = useState(false);
  const [optResult,     setOptResult]     = useState<{
    endDate: string; endTime: string; duration: string; distance: string; cost: string; arrival: string;
  } | null>(null);
  const [optError, setOptError] = useState<{ title: string; detail: string } | null>(null);
  const fallbackTimes = useMemo(() => genTimes(stops.length), [stops.length]);
  const times = useMemo(
    () => stops.map((s, i) => s.arrivalTime || fallbackTimes[i]),
    [stops, fallbackTimes]
  );
  const hasOptTimes = stops.some((s) => !!s.arrivalTime);
  const startLabel = tripStartTime || (hasOptTimes ? "07:30" : "");
  const endLabel = tripEndTime || (hasOptTimes && stops.length ? (stops[stops.length - 1].departureTime || "") : "");

  const totalWeight = stops.reduce((n, s) => n + s.netweight, 0);
  const totalVol    = stops.reduce((n, s) => n + s.vol, 0);
  const totalQty    = stops.reduce((n, s) => n + s.qty, 0);
  const dropCount   = stops.filter((s) => s.type === "DROP").length;
  const pickCount   = stops.filter((s) => s.type === "PICKUP").length;
  const travelMins  = stops.length * 18;
  const isOptimized = selectedTripStatus === "Optimised" || selectedTripStatus === "Optimized";
  const travelStr   = (stops.length && isOptimized)
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
    <>
    <div
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={cn(
        "rounded-lg overflow-hidden transition-all",
        dropZoneActive ? "ring-2 ring-primary/40 bg-primary/2" : ""
      )}
      style={{ border: "1px solid hsl(var(--border) / 0.4)" }}
    >
      {/* ── HEADER ROW — full width single line ────────── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 flex-shrink-0" style={{ background: "linear-gradient(135deg, #5b6b8c, #3d4a63)" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center">
            <Play className="w-4 h-4 text-white flex-shrink-0" />
          </div>
          <span className="text-[11px] font-semibold text-white tracking-wide">Active Trip</span>
          {dropZoneActive && <span className="text-[9px] text-primary animate-pulse ml-1">Drop here…</span>}
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const isEmpty = !vehicle && !driver && stops.length === 0;
            const editable = !selectedTripStatus
              || selectedTripStatus === "Open"
              || selectedTripStatus === "Optimised"
              || selectedTripStatus === "Optimized";
            const showConfirm = !isEmpty && editable;
            const canConfirm = !!vehicle && !!driver && stops.length >= 1;
            const showOptimise = !!selectedTripStatus && editable;
            return (
              <>
                {showConfirm && (
                  <Button size="sm"
                    className="h-7 text-[9px] gap-1 bg-emerald-500 hover:bg-emerald-400 text-white border-0 px-2.5 rounded-lg shadow-sm disabled:opacity-50"
                    disabled={!canConfirm || tripLocked}
                    title={tripLocked ? "Trip is locked — unlock to confirm" : !canConfirm ? "Assign vehicle, driver and at least one stop" : "Confirm"}
                    onClick={onConfirm}>
                    <CheckCheck className="w-4 h-4" /> Confirm
                  </Button>
                )}
                {showOptimise && (
                  <Button size="sm"
                    className="h-7 text-[9px] gap-1 px-2.5 border-0 rounded-lg shadow-sm"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#0f172a" }}
                    disabled={tripLocked}
                    title={tripLocked ? "Trip is locked — unlock to optimise" : "Optimise"}
                    onClick={() => {
                      if (selectedTripStatus === "Open") setShowOptConfirm(true);
                      else setShowOptModal(true);
                    }}>
                    <Zap className="w-4 h-4" /> Optimise
                  </Button>
                )}
              </>
            );
          })()}
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
              {vehicle && <button onClick={onClearVehicle} className="w-4 h-4 flex items-center justify-center rounded-full text-emerald-700/50 hover:text-rose-600 hover:bg-rose-100 transition-colors"><X className="w-3.5 h-3.5" /></button>}
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
              {driver && <button onClick={onClearDriver} className="w-4 h-4 flex items-center justify-center rounded-full text-indigo-700/50 hover:text-rose-600 hover:bg-rose-100 transition-colors"><X className="w-3.5 h-3.5" /></button>}
            </div>
            <span className={cn("text-[11px] font-semibold leading-none mt-0.5 truncate", driver ? "text-indigo-700" : "text-muted-foreground/30 italic text-[9px]")}>
              {driver ? driver.name : "—"}
            </span>
          </div>

          {/* Separator */}
          <div className="w-px self-stretch bg-border/30 mx-0.5" />

          {/* Stat chips */}
          {([
            { label: "Dep Site",  value: tripDepSite || vehicle?.departureSite || "—" },
            { label: "Arv Site",  value: tripArrSite || vehicle?.arrivalSite   || "—" },
            { label: "Stops",     value: String(stops.length) },
            { label: "Drops",     value: String(dropCount) },
            { label: "Pickups",   value: String(pickCount) },
            { label: "Weight",    value: totalWeight ? `${totalWeight}kg` : "—" },
            { label: "Volume",    value: totalVol    ? `${totalVol}m³`    : "—" },
            { label: "Qty",       value: totalQty    ? String(totalQty)   : "—" },
            { label: "Travel",    value: travelStr },
            ...(selectedTripStatus && selectedTripStatus !== "Open" && tripDistanceKm != null
              ? [{ label: "Distance", value: `${Number(tripDistanceKm).toFixed(1)} km` }]
              : []),
          ] as { label: string; value: string }[]).map(({ label, value }) => (
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
                {/* Departure site node */}
                <div className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    {stops.length <= 8 && (
                      <span className="text-[7px] text-muted-foreground leading-none mb-0.5 font-mono">
                        {startLabel || "—"}
                      </span>
                    )}
                    <div
                      title={`Depart ${tripDepSite ?? ""}`}
                      className="w-7 h-7 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0"
                    >
                      <Warehouse className="w-3.5 h-3.5" />
                    </div>
                    {stops.length <= 6 && (
                      <span className="text-[7px] text-muted-foreground leading-none mt-0.5 max-w-[40px] truncate text-center">
                        {tripDepSite ?? "Site"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center flex-shrink-0 mx-0.5" style={{ width: stops.length <= 4 ? 32 : stops.length <= 8 ? 20 : 12 }}>
                    <div className="w-full flex items-center gap-px">
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-border to-border/60" />
                      <div className="w-1 h-1 rounded-full bg-border/60 flex-shrink-0" />
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-border/60 to-border" />
                    </div>
                  </div>
                </div>
                {stops.map((s, i) => {
                  const isSelected = selectedStop === i;
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
                            {times[i] || "—"}
                          </span>
                        )}
                        {/* Circle */}
                        <button
                          onClick={() => setSelectedStop(isSelected ? null : i)}
                          title={`${s.txn} · ${s.client}${s.arrivalTime ? ` · arr ${s.arrivalTime}` : ""}`}
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
                      {/* Road connector to next node (stop or arrival site) */}
                      <div className="flex items-center flex-shrink-0 mx-0.5"
                        style={{ width: stops.length <= 4 ? 32 : stops.length <= 8 ? 20 : 12 }}>
                        <div className="w-full flex items-center gap-px">
                          <div className="flex-1 h-0.5 bg-gradient-to-r from-border to-border/60" />
                          <div className="w-1 h-1 rounded-full bg-border/60 flex-shrink-0" />
                          <div className="flex-1 h-0.5 bg-gradient-to-r from-border/60 to-border" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Arrival site node */}
                <div className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    {stops.length <= 8 && (
                      <span className="text-[7px] text-muted-foreground leading-none mb-0.5 font-mono">
                        {endLabel || "—"}
                      </span>
                    )}
                    <div
                      title={`Arrive ${tripArrSite ?? ""}`}
                      className="w-7 h-7 rounded-full border-2 border-indigo-500 bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0"
                    >
                      <Warehouse className="w-3.5 h-3.5" />
                    </div>
                    {stops.length <= 6 && (
                      <span className="text-[7px] text-muted-foreground leading-none mt-0.5 max-w-[40px] truncate text-center">
                        {tripArrSite ?? "Site"}
                      </span>
                    )}
                  </div>
                </div>
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* empty state */}
      {!hasAssignment && (
        <div className="flex items-center justify-center gap-4 py-3 text-muted-foreground/40 text-[11px] bg-card">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-200"><Truck className="w-5 h-5" /> Vehicle</span>
          <span>+</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-200"><Users className="w-5 h-5" /> Driver</span>
          <span>+</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-200"><Package className="w-5 h-5" /> Stops</span>
          <span>→</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/50 border border-dashed border-emerald-200 text-emerald-600"><CheckCheck className="w-5 h-5" /> Confirm</span>
        </div>
      )}
    </div>

    {/* ── OPTIMISE MODAL ────────────────────────────────── */}
    <AnimatePresence>
      {showOptModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-start pl-8"
          style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(2px)" }}
          onClick={() => !optRunning && setShowOptModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: 340, fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"
              style={{ background: "linear-gradient(135deg,#1e40af,#1d4ed8)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 3px 10px rgba(245,158,11,.4)" }}>
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white leading-tight">Optimise Trip</p>
                  {vehicle && <p className="text-[10px] text-blue-200 mt-0.5">{vehicle.code} · {driver?.name ?? "No driver"} · {stops.length} stop{stops.length !== 1 ? "s" : ""}</p>}
                </div>
              </div>
              {!optRunning && (
                <button onClick={() => setShowOptModal(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">

              {/* Trip info block — always visible */}
              <div>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Trip Info</p>
                <div className="rounded-xl border border-gray-100 overflow-hidden" style={{ background: "#f8fafc" }}>
                  <div className="grid grid-cols-3 divide-x divide-gray-100">
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Trip No</p>
                      <p className="text-[12px] font-bold text-gray-800 font-mono mt-0.5 truncate">{activeTripCode ?? (vehicle ? `DRAFT-${vehicle.code}` : "DRAFT")}</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Vehicle</p>
                      <p className="text-[12px] font-bold text-emerald-700 font-mono mt-0.5 truncate">{vehicle?.code ?? "—"}</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Driver</p>
                      <p className="text-[12px] font-bold text-indigo-700 mt-0.5 truncate">{driver?.name ?? "—"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Start Date</p>
                      <p className="text-[12px] font-bold text-gray-800 font-mono mt-0.5">{optStartDate}</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">No of Stops</p>
                      <p className="text-[12px] font-bold text-gray-800 mt-0.5">{stops.length}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Departure</p>
                      <p className="text-[12px] font-bold text-gray-800 font-mono mt-0.5">{optStartTime}</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Arrival</p>
                      <p className="text-[12px] font-bold text-gray-800 font-mono mt-0.5">{optResult?.arrival ?? "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optimisation result — visible after optimisation */}
              {optResult && (
                <div>
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Optimisation Result
                  </p>
                  <div className="rounded-xl border border-emerald-100 overflow-hidden" style={{ background: "#f0fdf4" }}>
                    <div className="grid grid-cols-2 divide-x divide-emerald-100">
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">End Date</p>
                        <p className="text-[12px] font-bold text-emerald-900 font-mono mt-0.5">{optResult.endDate}</p>
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">End Time</p>
                        <p className="text-[12px] font-bold text-emerald-900 font-mono mt-0.5">{optResult.endTime}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-emerald-100 border-t border-emerald-100">
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">Duration</p>
                        <p className="text-[12px] font-bold text-emerald-900 mt-0.5">{optResult.duration}</p>
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">Distance</p>
                        <p className="text-[12px] font-bold text-emerald-900 mt-0.5">{optResult.distance}</p>
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">Cost</p>
                        <p className="text-[12px] font-bold text-emerald-900 mt-0.5">{optResult.cost}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}



              {/* Order toggle */}
              <div>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Stop Order</p>
                <div className="flex border-2 rounded-xl overflow-hidden" style={{ borderColor: "#dbeafe" }}>
                  {(["fixed","auto"] as const).map((mode) => (
                    <button key={mode} onClick={() => setOptOrder(mode)}
                      className="flex-1 py-2.5 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={{
                        background: optOrder === mode ? "#1e40af" : "#fff",
                        color: optOrder === mode ? "#fff" : "#94a3b8",
                      }}>
                      {mode === "fixed" ? <><span>📌</span> Fixed Order</> : <><span>🔀</span> Auto Route</>}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {optOrder === "fixed" ? "Stops stay in their current sequence" : "System finds the fastest possible route"}
                </p>
              </div>

              {/* Start date + time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Start Date</p>
                  <input type="date" value={optStartDate}
                    onChange={(e) => setOptStartDate(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-100 px-3 py-2.5 text-[12px] font-bold text-gray-800 focus:outline-none focus:border-blue-400"
                    style={{ fontFamily: "Inter, monospace" }}
                  />
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Start Time</p>
                  <input type="time" value={optStartTime}
                    onChange={(e) => setOptStartTime(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-100 px-3 py-2.5 text-[12px] font-bold text-gray-800 focus:outline-none focus:border-blue-400"
                    style={{ fontFamily: "Inter, monospace" }}
                  />
                </div>
              </div>



              {/* Run button */}
              <button
                disabled={optRunning}
                onClick={async () => {
                  if (!stops.length) return;
                  const depLat = siteLat;
                  const depLng = siteLng;
                  if (!depLat || !depLng) {
                    setOptError({ title: "Missing Site Coordinates", detail: "This site has no latitude/longitude. Go to Configuration → Customers → select the site address and set lat/lng." });
                    return;
                  }
                  const missing = stops.filter(s => !s.lat || !s.lng);
                  if (missing.length) {
                    setOptError({ title: "Missing Stop Coordinates", detail: `${missing.length} stop(s) are missing lat/lng coordinates:\n${missing.map(s => `• ${s.txn} — ${s.client}`).join("\n")}\n\nGo to Configuration → Customers → update each address with coordinates.` });
                    return;
                  }
                  setOptRunning(true);
                  try {
                    const startSec = hhmmToSec(optStartTime);
                    const capGrams = Math.round((vehicle?.capacity ?? 60000) * 1000);

                    const vroomVehicle = {
                      id: 1,
                      description: vehicle?.code ?? "VEH",
                      start: [depLng, depLat] as [number,number],
                      end:   [depLng, depLat] as [number,number],
                      capacity: [capGrams] as [number],
                      time_window: [startSec, hhmmToSec("23:59")] as [number,number],
                      max_tasks: 999,
                    };

                    const vroomJobs = stops.map((s, i) => ({
                      id: i + 1,
                      description: s.txn,
                      location: [s.lng, s.lat] as [number,number],
                      service: 1800,  // 30 min default
                      ...(s.type === "DROP"
                        ? { delivery: [Math.round((s.netweight || 1) * 1000)] as [number] }
                        : { pickup:   [Math.round((s.netweight || 1) * 1000)] as [number] }),
                      priority: s.priority === "URGENT" ? 10 : s.priority === "LOW" ? 1 : 5,
                    }));

                    const result = await callVroom([vroomVehicle], vroomJobs);
                    if (!result.routes?.length) throw new Error("VROOM returned no routes");

                    const route   = result.routes[0];
                    const jobSteps = route.steps.filter((st: VroomStep) => st.type === "job");
                    const endStep  = route.steps.find((st: VroomStep)  => st.type === "end");
                    const endTime  = secToHHMM(endStep ? endStep.arrival : startSec + route.duration);
                    const totalDistKm = (route.distance / 1000).toFixed(1);
                    const travelHHMM  = secToHHMM(route.duration);

                    const stopResults = jobSteps.map((st: VroomStep, i: number) => ({
                      seq: i + 1,
                      docNum: st.description ?? "",
                      arrivalDate:   planDate,
                      arrivalTime:   secToHHMM(st.arrival),
                      departureDate: planDate,
                      departureTime: secToHHMM(st.arrival + st.service),
                      fromPrevDistance:    ((st.distance ?? 0) / 1000).toFixed(1),
                      fromPrevTravelTime:  secToHHMM(st.duration),
                      serviceTime: secToHHMM(st.service),
                      waitingTime: secToHHMM(st.waiting_time ?? 0),
                    }));

                    setOptResult({
                      endDate: planDate, endTime,
                      arrival: endTime,
                      duration: travelHHMM,
                      distance: `${totalDistKm} km`,
                      cost: "",
                    });

                    // Persist to backend if tripCode available
                    if (activeTripCode) {
                      const { optimiseTrip } = await import("@/lib/tripApi");
                      await optimiseTrip(activeTripCode, {
                        orderMode: optOrder, startTime: optStartTime, endTime,
                        travelTime: travelHHMM, totalTime: travelHHMM,
                        totalDistance: totalDistKm, uomDistance: "km",
                        totalCost: "", distanceCost: "", fixedCost: "", serviceCost: "",
                        stopResults,
                      });
                      if (activeTripId != null) onTripOptimised?.(activeTripId, stopResults, { distanceKm: Number(totalDistKm), travelTime: travelHHMM, endTime });
                    }

                    toast({ title: "Optimisation complete ✓",
                      description: `${jobSteps.length} stops · ${totalDistKm} km · end ${endTime}` });
                    setShowOptModal(false);
                  } catch(err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    setOptError({ title: "Optimisation Failed", detail: msg });
                  } finally { setOptRunning(false); }
                }}
                className="w-full py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: optRunning ? "#f1f5f9" : "linear-gradient(135deg,#1e40af,#1d4ed8)",
                  color: optRunning ? "#94a3b8" : "#fff",
                  boxShadow: optRunning ? "none" : "0 4px 16px rgba(30,64,175,.3)",
                  cursor: optRunning ? "not-allowed" : "pointer",
                }}
              >
                {optRunning
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Running Optimisation…</>
                  : <><Zap className="w-4 h-4" style={{ color: "#f59e0b" }} /> Run Optimisation</>
                }
              </button>

            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── Error popup (VROOM / validation errors) ──────── */}
      {optError && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setOptError(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: 380, fontFamily: "Inter, system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4"
              style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-[13px] font-bold text-white flex-1">{optError.title}</p>
              <button onClick={() => setOptError(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12px] text-gray-700 whitespace-pre-line leading-relaxed">
                {optError.detail}
              </p>
            </div>
            <div className="px-5 pb-4 flex justify-end">
              <button onClick={() => setOptError(null)}
                className="px-5 py-2 rounded-lg text-[12px] font-bold bg-red-600 hover:bg-red-700 text-white transition-colors">
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <AlertDialog open={showOptConfirm} onOpenChange={setShowOptConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Optimise Trip?</AlertDialogTitle>
          <AlertDialogDescription>
            The trip is currently in <b>Open</b> status. Do you want to optimise it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowOptConfirm(false); setShowOptModal(true); }}>
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// ROUTE MANAGEMENT DETAIL — full screen page
// Shown when (i) is clicked on a trip row
// Back button returns to planner without reloading data
// ═══════════════════════════════════════════════════════
function RouteManagementDetail({ trip, onBack, vrHeader, vrDetails, vrLoadStock, vrLoading, onLvsCreate, onLvsConfirm }: { trip: Trip; onBack: () => void; vrHeader?: any; vrDetails?: any[]; vrLoadStock?: any[]; vrLoading?: boolean; onLvsCreate?: () => void | Promise<void>; onLvsConfirm?: (lvsNum: string) => void | Promise<void> }) {
  // ── All display data is sourced from vrHeader / vrDetails / vrLoadStock ──
  const H  = (vrHeader ?? {}) as any;
  const rows = Array.isArray(vrDetails) ? vrDetails : [];
  const stock = Array.isArray(vrLoadStock) ? vrLoadStock : [];
  const stock0: any = stock[0] ?? null;
  const hasStock = stock.length > 0;

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = H[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };
  const dash = (v: any) => (v === undefined || v === null || v === "" ? "—" : String(v));
  const fmtDT = (d?: any, t?: any) => {
    const dd = d ? String(d).slice(0, 10) : "";
    const tt = t ? String(t).slice(0, 5) : "";
    const s = `${dd} ${tt}`.trim();
    return s || "—";
  };

  // Route Information
  // Date formatter → MM-DD-YYYY
  const fmtDateMDY = (v: any) => {
    if (v === undefined || v === null || v === "") return "—";
    const s = String(v);
    // Try ISO / yyyy-mm-dd prefix
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[2]}-${iso[3]}-${iso[1]}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yy = d.getFullYear();
      return `${mm}-${dd}-${yy}`;
    }
    return s;
  };

  const routeNum   = dash(hasStock ? (stock0.vcrnum ?? stock0.VCRNUM_0 ?? stock0.vrcode ?? pick("xnumpc","vcrnum")) : pick("xnumpc","vcrnum"));
  // Vehicle Load Stock → VCRNUM_0 from loadstk when it exists
  const vlsCodeRaw = hasStock ? (stock0?.vcrnum ?? stock0?.VCRNUM_0 ?? stock0?.xnum ?? stock0?.lvsnum) : undefined;
  const vlsCode    = dash(vlsCodeRaw);
  // Status → "Validated" when loadstk data exists, otherwise "Locked"
  const statusVal  = hasStock ? "Validated" : "Locked";
  const depSite    = dash(pick("fcy","depfcy","fcy_0"));
  const arrSite    = dash(pick("arrfcy","fcy","fcy_0"));
  const carrier    = dash(pick("bptnum","carrier"));
  const vehClass   = dash(pick("vehclass","category","xcategory"));
  const vehicle    = dash(pick("codeyve","vehicle"));
  const driverId   = dash(pick("driverid","driverId","cod_driver"));
  const driverName = dash(pick("drivername","driverName","driver"));
  const createDate = fmtDateMDY(pick("datexec","datcre","creationdate"));
  const createTime = dash(pick("creationtime","timcre","heucre"));
  const tripNum    = dash(pick("xnumpc","trip","seq"));

  // Schedule
  const depDate = String(pick("datexec","datcre","creationdate") ?? "").slice(0, 10) || "—";
  const depTime = String(pick("heudep","depTime") ?? "").slice(0, 5) || "—";
  const retDate = String(pick("datret","datexec","creationdate") ?? "").slice(0, 10) || "—";
  const retTime = String(pick("heuarr","retTime") ?? "").slice(0, 5) || "—";

  // Totals derived from vrDetails
  const totalKm  = rows.reduce((sum: number, r: any) => sum + (Number(r.fromprevdist ?? r.fromPrevDist ?? 0) || 0), 0);
  const totalMin = rows.reduce((sum: number, r: any) => {
    const t = String(r.fromprevtra ?? r.fromprevtravel ?? r.fromPrevTravel ?? "0:0");
    const [h, m] = t.split(":").map((x: string) => Number(x) || 0);
    return sum + (h * 60 + m);
  }, 0);
  const totalH   = Math.floor(totalMin / 60);
  const totalM   = totalMin % 60;
  const travelCost = Math.round(totalKm * 0.045);
  const distCost   = Math.round(totalKm * 1.5);
  const totalCost  = travelCost + distCost;

  return (
    <div className="flex flex-col bg-background min-h-screen" style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: "11px" }}>
      <div className="flex-1 overflow-y-auto">

        {/* ── Minimal header: Back (left) + Workflow steps (right) ── */}
        <div
          className="relative px-5 py-3 sticky top-0 z-10 shadow-md border-b border-slate-900/10"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Back button */}
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary-foreground/90 hover:text-primary-foreground bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-md transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Planner
            </button>

            {/* Workflow steps (right) */}
            {(() => {
              // Stage index derived from trip status:
              //   Locked     → 0 (LVS Create is active)
              //   Validated  → 1 (LVS Confirm is active; LVS Create is done)
              //   Loaded     → 2 (Load Truck done; Unload active)
              //   Unloaded   → 3 (all done)
              const status = String((trip as any).optiStatus ?? trip.status ?? "").toLowerCase();
              const stage =
                status === "unloaded" ? 3 :
                status === "loaded"   ? 2 :
                status === "validated"? 1 :
                status === "locked"   ? 0 : -1;

              const steps = [
                { key: "lvs-create",  label: "LVS Create",  icon: RouteIcon, onClick: () => onLvsCreate?.() },
                { key: "lvs-confirm", label: "LVS Confirm", icon: CheckCheck,onClick: () => {
                  if (!vlsCodeRaw) {
                    toast({ title: "LVS Confirm unavailable", description: "No LVS number found for this trip yet.", variant: "destructive" });
                    return;
                  }
                  onLvsConfirm?.(String(vlsCodeRaw));
                } },
                { key: "load",        label: "Load Truck",  icon: Truck,     onClick: () => toast({ title: "Load Truck",  description: `Trip ${trip.tripCode ?? trip.id}` }) },
                { key: "unload",      label: "Unload Truck",icon: Package,   onClick: () => toast({ title: "Unload Truck",description: `Trip ${trip.tripCode ?? trip.id}` }) },
              ];

              return (
                <div className="flex items-center gap-1.5">
                  {steps.map((s, i) => {
                    const Icon = s.icon;
                    const isDone   = stage >= 0 && i < stage;
                    const isActive = stage >= 0 && i === stage;
                    const isFuture = !isDone && !isActive;
                    const disabled = isDone || isFuture;
                    return (
                      <React.Fragment key={s.key}>
                        <button
                          disabled={disabled}
                          onClick={disabled ? undefined : s.onClick}
                          title={
                            isDone   ? `${s.label} — completed` :
                            isActive ? s.label :
                                       `${s.label} — not yet available`
                          }
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap border",
                            isDone   && "bg-emerald-500 text-white border-emerald-400 cursor-not-allowed shadow-sm",
                            isActive && "bg-white text-primary border-white ring-2 ring-white/60 shadow-sm hover:bg-white/90 cursor-pointer",
                            isFuture && "bg-white/10 text-primary-foreground/50 border-white/10 cursor-not-allowed opacity-70",
                          )}
                        >
                          {isDone
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : <Icon className="w-3.5 h-3.5" />}
                          {s.label}
                        </button>
                        {i < steps.length - 1 && (
                          <div className={cn(
                            "w-6 h-[2px] rounded-full",
                            i < stage ? "bg-emerald-400" : "bg-white/25"
                          )} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="p-5 space-y-4 bg-muted/40 min-h-full">

          {/* ── Route info card ── */}
          <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
              <span className="w-1 h-4 rounded-full bg-primary" />
              <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Route Information</h3>
            </div>
            <div className="p-4 grid grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 text-[11px]">
              {[
                { label: "Route Num",            value: routeNum,   highlight: true },
                { label: "Vehicle Load Stock",   value: vlsCode },
                { label: "Status",               value: statusVal,  highlight: true },
                { label: "Departure Site",       value: depSite },
                { label: "Arrival Site",         value: arrSite },
                { label: "Carrier",              value: carrier },
                { label: "Vehicle Category",        value: vehClass },
                { label: "Vehicle",              value: vehicle,    highlight: true },
                { label: "Route Type",           value: "Scheduled" },
                { label: "Driver ID",            value: driverId },
                { label: "Driver",               value: driverName, highlight: true },
                { label: "Creation Date",        value: createDate },
                { label: "Creation Time",        value: createTime },
                { label: "Trip",                 value: tripNum },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wider font-semibold">{label}</p>
                  <p className={cn("font-bold", highlight ? "text-primary" : "text-foreground")}>{value}</p>
                </div>
              ))}
            </div>
          </section>






          {/* ── Planning / Actual + Photos ── */}
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
                <span className="w-1 h-4 rounded-full bg-primary" />
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Schedule</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Planning
                  </p>
                  <div className="grid grid-cols-4 gap-4 text-[11px]">
                    {[
                      { label: "Departure Date", value: depDate },
                      { label: "Departure Time", value: depTime },
                      { label: "Return Date",    value: retDate },
                      { label: "Return Time",    value: retTime },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                        <p className="font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <p className="text-[10px] font-bold text-[hsl(var(--success))] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" />
                    Actual
                  </p>
                  <div className="grid grid-cols-4 gap-4 text-[11px]">
                    {["Departure Date","Departure Time","Return Date","Return Time"].map((label) => (
                      <div key={label}>
                        <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-muted-foreground/60">—</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Vehicle + Driver photos */}
            <div className="flex gap-3 flex-shrink-0">
              <div className="rounded-xl bg-card border border-border shadow-sm p-3 text-center flex flex-col items-center justify-center min-w-[7.5rem]">
                <div className="w-16 h-14 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-1.5">
                  <Truck className="w-8 h-8 text-primary" />
                </div>
                <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider">Vehicle</p>
                <p className="text-[11px] font-bold text-foreground">{vehicle}</p>
              </div>
              <div className="rounded-xl bg-card border border-border shadow-sm p-3 text-center flex flex-col items-center justify-center min-w-[7.5rem]">
                <div className="w-16 h-14 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-1.5">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider">Driver</p>
                <p className="text-[11px] font-bold text-foreground">{driverId}</p>
              </div>
            </div>

          </div>

          {/* ── Transactions card ── */}
          <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2 bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-primary" />
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Transactions</h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{rows.length} record{rows.length === 1 ? "" : "s"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: "11px" }}>
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Seq","Document Number","Delivery Number","Site","Status","Arrival Date/Time","Departure Date/Time","Service Time","Address","Client Code","Client","City","From Previous Distance","From Previous Travel","Waiting Time"].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider whitespace-nowrap text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any, i: number) => {
                    const seq  = r.sequence ?? r.seq ?? i + 1;
                    const doc  = r.sdhnum ?? r.docnum ?? r.documentnumber ?? "—";
                    const del  = r.deliverynumber ?? r.delnum ?? "—";
                    const site = r.xdocsite ?? r.fcy ?? "—";
                    const arr  = fmtDT(r.arrivedate ?? r.arrivalDate, r.arrivetime ?? r.arrivalTime);
                    const dep  = fmtDT(r.departdate ?? r.departureDate, r.departtime ?? r.departureTime);
                    const svc  = r.servicetime ?? r.serviceTime ?? "—";
                    const addr = r.address ?? r.bpaadd1 ?? "—";
                    const bp   = r.bpcode ?? r.bpnum ?? r.bpcnum ?? "—";
                    const cli  = r.client ?? r.bpcnam ?? r.clientname ?? "—";
                    const city = r.city ?? r.bpacity ?? "—";
                    const fpd  = r.fromprevdist ?? r.fromPrevDistance ?? "—";
                    const fpt  = r.fromprevtra ?? r.fromprevtravel ?? r.fromPrevTravel ?? "—";
                    const wait = r.waittime ?? r.waitingTime ?? "—";
                    return (
                    <tr key={r.id ?? doc ?? i} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-2 py-2 font-mono font-bold text-center text-foreground">{seq}</td>
                      <td className="px-2 py-2 font-mono text-primary font-semibold">{doc}</td>
                      <td className="px-2 py-2 text-muted-foreground">{del}</td>
                      <td className="px-2 py-2 font-mono text-foreground">{site}</td>
                      <td className="px-2 py-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]">Scheduled</span>
                      </td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{arr}</td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{dep}</td>
                      <td className="px-2 py-2 font-mono text-foreground">{svc}</td>
                      <td className="px-2 py-2 text-muted-foreground truncate max-w-[100px]">{addr}</td>
                      <td className="px-2 py-2 font-mono text-foreground">{bp}</td>
                      <td className="px-2 py-2 font-medium text-foreground truncate max-w-[100px]">{cli}</td>
                      <td className="px-2 py-2 text-muted-foreground">{city}</td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{fpd}</td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{fpt}</td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{wait}</td>
                    </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={15} className="px-3 py-6 text-center text-xs text-muted-foreground">No transactions on this trip</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Totals ── */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
              {/* Total Drops */}
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Total Drops</h4>
                </div>
                <div className="p-4 space-y-1.5">
                  {(() => {
                    const dropWeight = stock.reduce((s: number, x: any) => s + (Number(x.weight ?? x.netweight ?? 0) || 0), 0);
                    const dropVolume = stock.reduce((s: number, x: any) => s + (Number(x.volume ?? x.vol ?? 0) || 0), 0);
                    const vehMass = Number(pick("vehmass","vehiclemass") ?? 60000) || 60000;
                    const vehVol  = Number(pick("vehvol","vehiclevolume") ?? 50000) || 50000;
                    return (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span className="font-mono font-semibold text-foreground">{dropWeight.toFixed(2)} LB</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Mass</span><span className="font-mono text-foreground">{vehMass.toFixed(2)} LB</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Loading Mass(%)</span><span className="font-mono text-foreground">{dropWeight ? ((dropWeight / vehMass) * 100).toFixed(2) : "0.00"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Drops Volume</span><span className="font-mono text-foreground">{dropVolume.toFixed(2)} GAL</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Volume</span><span className="font-mono text-foreground">{vehVol} GAL</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Loading Vol(%)</span><span className="font-mono text-foreground">{dropVolume ? ((dropVolume / vehVol) * 100).toFixed(2) : "0.00"}</span></div>
                      </>
                    );
                  })()}
                </div>
              </div>
              {/* Total Pickups */}
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Total Pickups</h4>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pickup Weight</span><span className="font-mono font-semibold text-foreground">0 LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Avail Weight</span><span className="font-mono text-foreground">60000 LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pickup Volume</span><span className="font-mono text-foreground">0.00 GAL</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Avail Volume</span><span className="font-mono text-foreground">50000 GAL</span></div>
                </div>
              </div>
              {/* Summary Totals — themed */}
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-primary/10">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Summary Totals</h4>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Distance</span><span className="font-mono font-semibold text-foreground">{totalKm ? `${totalKm} Miles` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Travel Time</span><span className="font-mono text-foreground">{totalMin ? `${String(totalH).padStart(2,"0")}:${String(totalM).padStart(2,"0")} HH:MM` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Order Count</span><span className="font-mono text-foreground">{rows.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Time</span><span className="font-mono text-foreground">{totalMin ? `${String(totalH + 1).padStart(2,"0")}:${String((totalM + 15) % 60).padStart(2,"0")} HH:MM` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Travel Time Cost</span><span className="font-mono text-foreground">{travelCost ? `${travelCost} USD` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Distance Cost</span><span className="font-mono text-foreground">{distCost ? `${distCost} USD` : "—"}</span></div>
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1.5"><span className="font-bold text-foreground">Total Cost</span><span className="font-mono font-black text-base text-primary">{totalCost ? `${totalCost} USD` : "—"}</span></div>
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
  const [loadStats, setLoadStats] = useState<{vehicles:number;drivers:number;drops:number;pickups:number}|null>(null);
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
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set());
  const [groupBusy, setGroupBusy] = useState<null | { kind: "optimise" | "lock" | "unlock" | "validate" | "delete"; done: number; total: number }>(null);
  // 'planner' = main view | 'detail' = trip detail full screen
  const [view, setView]               = useState<"planner" | "detail">("planner");
  const [detailTripId, setDetailTripId] = useState<string | null>(null);
  const [vrHeader,    setVrHeader]    = useState<any | null>(null);
  const [vrDetails,   setVrDetails]   = useState<any[]>([]);
  const [vrLoadStock, setVrLoadStock] = useState<any[]>([]);
  const [vrLoading,   setVrLoading]   = useState(false);

  // Optimisation slide panel

  const [tripView, setTripView]             = useState<"map" | "list">("map");

  // Confirmation dialog (vehicle/driver reassign etc.)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    confirmLabel?: string; onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Track the loaded trip baseline so stop add/remove on a selected persisted trip
  // can be auto-synced to the backend.
  const loadedTripRef = useRef<{ tripId: number; stopIds: string[] } | null>(null);
  const stopSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Filters ───────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stopTypeTab, setStopTypeTab]   = useState<"drops" | "pickups">("drops");
  const [fleetTab, setFleetTab]         = useState<"vehicles" | "drivers">("vehicles");
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(new Set()); // multi-select in tables
  const [toPlanOnly, setToPlanOnly] = useState<boolean>(false);

  // ── Auto Trip Generation modal ────────────────────────
  const [showAutoGen, setShowAutoGen]   = useState(false);
  const [agTab, setAgTab]               = useState<"vehicles" | "drivers">("vehicles");
  const [agDocTab, setAgDocTab]         = useState<"deliveries" | "pickups">("deliveries");
  const [agVehSel, setAgVehSel]         = useState<Set<string>>(new Set());
  const [agDrvSel, setAgDrvSel]         = useState<Set<string>>(new Set());
  const [agDropSel, setAgDropSel]       = useState<Set<string>>(new Set());
  const [agPickSel, setAgPickSel]       = useState<Set<string>>(new Set());
  const [agVehClass, setAgVehClass]     = useState<string>("");
  const [agRouteCode, setAgRouteCode]   = useState<string>("");
  const [agStartDate, setAgStartDate]   = useState<string>(date);
  const [agEndDate, setAgEndDate]       = useState<string>(date);
  const [agVehSearch, setAgVehSearch]   = useState("");
  const [agDocSearch, setAgDocSearch]   = useState("");
  const [agSubmitting, setAgSubmitting] = useState(false);
  const [vroomError, setVroomError] = useState<{ title: string; detail: string } | null>(null);

  const openAutoGen = useCallback(() => {
    setAgVehSel(new Set()); setAgDrvSel(new Set());
    setAgDropSel(new Set()); setAgPickSel(new Set());
    setAgVehClass(""); setAgRouteCode("");
    setAgStartDate(date); setAgEndDate(date);
    setAgVehSearch(""); setAgDocSearch("");
    setAgTab("vehicles"); setAgDocTab("deliveries");
    setShowAutoGen(true);
  }, [date]);

  const agVehicleClasses = useMemo(
    () => Array.from(new Set(apiVehicles.map(v => v.category).filter(Boolean))).sort(),
    [apiVehicles]
  );
  const agFilteredVehicles = useMemo(() =>
    apiVehicles.filter(v =>
      (!agVehClass || v.category === agVehClass) &&
      (!agVehSearch || `${v.code} ${v.vehicleNo} ${v.category} ${v.driverName}`.toLowerCase().includes(agVehSearch.toLowerCase()))
    ), [apiVehicles, agVehClass, agVehSearch]);
  const agFilteredDrivers = useMemo(() =>
    apiDrivers.filter(d =>
      !agVehSearch || `${d.id} ${d.name} ${d.license}`.toLowerCase().includes(agVehSearch.toLowerCase())
    ), [apiDrivers, agVehSearch]);
  const agUsedStopIds = useMemo(() => new Set(trips.flatMap((t) => t.stops.map((s) => s.id))), [trips]);
  const agFilteredDocs = useMemo(() => {
    const type = agDocTab === "deliveries" ? "DROP" : "PICKUP";
    return allStops.filter(s =>
      s.type === type &&
      // Only show documents NOT already assigned to a trip (To Plan only)
      (s.routeStatus === "To Plan" || !s.routeStatus || s.routeStatus.trim() === "") &&
      // Exclude stops already in a confirmed trip (usedStopIds)
      !agUsedStopIds.has(s.id) &&
      // Exclude stops already in the current draft
      !draftStopIds.includes(s.id) &&
      (!agRouteCode || s.routeCode === agRouteCode) &&
      (!agDocSearch || `${s.txn} ${s.client} ${s.bpcode} ${s.routeCode}`.toLowerCase().includes(agDocSearch.toLowerCase()))
    );
  }, [allStops, agDocTab, agRouteCode, agDocSearch, agUsedStopIds, draftStopIds]);

  const agCanSubmit =
    agVehSel.size >= 1 && agDrvSel.size >= 1 && (agDropSel.size + agPickSel.size) >= 1;

  function agToggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  }
  function agToggleAll(ids: string[], set: Set<string>, setter: (s: Set<string>) => void) {
    const allOn = ids.length > 0 && ids.every(id => set.has(id));
    const next = new Set(set);
    ids.forEach(id => allOn ? next.delete(id) : next.add(id));
    setter(next);
  }
  function agClear() {
    setAgVehSel(new Set()); setAgDrvSel(new Set());
    setAgDropSel(new Set()); setAgPickSel(new Set());
  }
  async function agSubmit() {
    if (!agCanSubmit) return;
    const depLat = currentSiteObj?.latitude  ? Number(currentSiteObj.latitude)  : 0;
    const depLng = currentSiteObj?.longitude ? Number(currentSiteObj.longitude) : 0;
    if (!depLat || !depLng) {
      setVroomError({ title: "Missing Site Coordinates", detail: "This site has no latitude/longitude.\nGo to Configuration → Customers → select the site address and set lat/lng." });
      return;
    }

    setAgSubmitting(true);
    try {
      // ── Build selected vehicles ──────────────────────────────
      const selVehicles = apiVehicles.filter(v => agVehSel.has(v.code));
      const vroomVehicles = selVehicles.map((v, i) => {
        const startSec = hhmmToSec((v as any).earliestStartTime ?? "07:00");
        return {
          id: i + 1,
          description: v.code,
          start: [depLng, depLat] as [number,number],
          end:   [depLng, depLat] as [number,number],
          capacity: [Math.round(Number(v.capacity ?? 60000) * 1000)] as [number],
          time_window: [startSec, hhmmToSec("23:59")] as [number,number],
          max_tasks: 999,
        };
      });

      // ── Build selected jobs ──────────────────────────────────
      const selDocs = allStops.filter(s =>
        (s.type === "DROP"   && agDropSel.has(s.id)) ||
        (s.type === "PICKUP" && agPickSel.has(s.id))
      );

      const missingCoords = selDocs.filter(s => !s.lat || !s.lng);
      if (missingCoords.length) {
        setVroomError({ title: "Missing Stop Coordinates", detail: `${missingCoords.length} stop(s) missing lat/lng:\n${missingCoords.map(s => `• ${s.txn} — ${s.client}`).join("\n")}` });
        setAgSubmitting(false); return;
      }

      const vroomJobs = selDocs.map((s, i) => ({
        id: i + 1,
        description: s.txn,
        location: [s.lng, s.lat] as [number,number],
        service: 1800,
        ...(s.type === "DROP"
          ? { delivery: [Math.round((s.netweight || 1) * 1000)] as [number] }
          : { pickup:   [Math.round((s.netweight || 1) * 1000)] as [number] }),
        priority: s.priority === "URGENT" ? 10 : s.priority === "LOW" ? 1 : 5,
      }));

      // ── Call VROOM ────────────────────────────────────────────
      const result = await callVroom(vroomVehicles, vroomJobs);

      if (!result.routes?.length) {
        setVroomError({ title: "No Routes Generated", detail: "VROOM could not assign any stops to vehicles.\n\nPossible reasons:\n• Vehicle capacity too small for the selected stops\n• Stops too far from site location\n• Invalid coordinates" });
        return;
      }

      // ── Build trips from VROOM routes ─────────────────────────
      const { createTrip } = await import("@/lib/tripApi");
      let createdCount = 0;

      for (const route of result.routes) {
        const vehCode  = route.description;
        const vehObj   = selVehicles.find(v => v.code === vehCode);
        const driverId = [...agDrvSel][0] ?? "";
        const driverObj = apiDrivers.find(d => d.id === driverId);

        const jobSteps = route.steps.filter((st: VroomStep) => st.type === "job");
        if (!jobSteps.length) continue;

        const endStep  = route.steps.find((st: VroomStep) => st.type === "end");
        const endTime  = secToHHMM(endStep ? endStep.arrival : 0);
        const startTime = secToHHMM(route.steps[0]?.arrival ?? hhmmToSec("07:00"));
        const totalDistKm = (route.distance / 1000).toFixed(1);
        const travelHHMM  = secToHHMM(route.duration);

        const routeStops = jobSteps.map((st: VroomStep) =>
          selDocs.find(s => s.txn === st.description)
        ).filter(Boolean) as typeof selDocs;

        const drops   = routeStops.filter(s => s.type === "DROP").length;
        const pickups = routeStops.filter(s => s.type === "PICKUP").length;
        const totalWt = routeStops.reduce((n, s) => n + (s.netweight || 0), 0);
        const totalVl = routeStops.reduce((n, s) => n + (s.vol || 0), 0);

        const stopResults = jobSteps.map((st: VroomStep, i: number) => ({
          seq: i + 1,
          docNum: st.description ?? "",
          arrivalDate: date, arrivalTime: secToHHMM(st.arrival),
          departureDate: date, departureTime: secToHHMM(st.arrival + st.service),
          fromPrevDistance: ((st.distance ?? 0) / 1000).toFixed(1),
          fromPrevTravelTime: secToHHMM(st.duration),
          serviceTime: secToHHMM(st.service),
          waitingTime: secToHHMM(st.waiting_time ?? 0),
        }));

        try {
          const tripResp = await createTrip({
            site: vehObj?.site ?? site, docDate: date,
            driverId, driverName: driverObj?.name ?? driverId,
            vehicleCode: vehCode,
            depSite: vehObj?.departureSite ?? vehObj?.site ?? site,
            arrSite: vehObj?.arrivalSite    ?? vehObj?.site ?? site,
            drops, pickups,
            noOfPackages: routeStops.reduce((n, s) => n + (s.qty || 0), 0),
            startTime, endTime,
            travelTime: travelHHMM, totalTime: travelHHMM,
            totalWeight: String(totalWt.toFixed(2)),
            totalVolume: String(totalVl.toFixed(2)),
            capacity:    String(vehObj?.capacity ?? 60000),
            uomCapacity: "KG", uomVolume: "M3", uomDistance: "km",
            weightPct: vehObj?.capacity ? totalWt / Number(vehObj.capacity) * 100 : 0,
            volumePct: 0,
            totalDistance: totalDistKm,
            totalCost: "", distanceCost: "", fixedCost: "", serviceCost: "",
            notes: "Auto generated by VROOM",
            generatedBy: "AUTO",
            userCode: "SYSTEM",
            stopObjects: routeStops as any,
            vehicleObject: (vehObj ?? null) as any,
            totalObject: { stopResults },
          });

          // Persist optimisation results — response includes Optimised status,
          // per-stop arrivalTime/departureTime/serviceTime/waitingTime, totals.
          const { optimiseTrip } = await import("@/lib/tripApi");
          const optResp = await optimiseTrip(tripResp.tripCode, {
            orderMode: "auto", startTime, endTime,
            travelTime: travelHHMM, totalTime: travelHHMM,
            totalDistance: totalDistKm, uomDistance: "km",
            totalCost: "", distanceCost: "", fixedCost: "", serviceCost: "",
            stopResults,
          });

          // Merge stopResults into the persisted stops so the local trip carries
          // arrivalTime, departureTime, seq etc. even if the API response omits them.
          const byDoc = new Map(stopResults.map((r) => [r.docNum, r]));
          const created = tripFromApi(optResp);
          created.stops = created.stops.map((s) => {
            const r = byDoc.get((s as any).docNum ?? s.txn);
            return r ? {
              ...s,
              seq: r.seq,
              arrivalDate: r.arrivalDate, arrivalTime: r.arrivalTime,
              departureDate: r.departureDate, departureTime: r.departureTime,
              fromPrevDistance: r.fromPrevDistance,
              fromPrevTravelTime: r.fromPrevTravelTime,
              serviceTime: r.serviceTime, waitingTime: r.waitingTime,
            } : s;
          }).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
          created.status = "Optimised";
          created.optiStatus = "Optimised";
          created.distanceKm = Number(totalDistKm) || created.distanceKm;
          created.startTime = startTime;
          created.endTime = endTime;

          setTrips(prev => [...prev, created]);
          createdCount++;
        } catch(e) {
          console.error("Failed to create trip for vehicle", vehCode, e);
        }
      }

      toast({
        title: `${createdCount} trip(s) generated ✓`,
        description: `${result.unassigned?.length ?? 0} unassigned stops`,
      });
    } catch(err) {
      const msg = err instanceof Error ? err.message : "VROOM error. Check that all stops and site have valid coordinates.";
      setVroomError({ title: "Auto Generation Failed", detail: msg });
    } finally {
      setShowAutoGen(false);
      setAgSubmitting(false);
    }
  }

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
    setLoadStats(null);
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
        setLoadStats({
          vehicles: data.vehicleCount ?? 0,
          drivers:  data.driverCount ?? 0,
          drops:    data.dropCount ?? 0,
          pickups:  data.pickupCount ?? 0,
        });
      })
      .catch((e: any) => {
        toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));

    // Load existing trips for the selected site + date from backend.
    // Replace persisted trips with API response; preserve any local-only (unsaved) trips.
    tripApi.loadTrips(site, date)
      .then((apiTrips) => {
        const mapped = (apiTrips ?? []).map((r) => tripFromApi(r));
        setTrips((prev) => {
          const apiCodes = new Set(mapped.map((t) => t.tripCode).filter(Boolean));
          // Keep local-only (no tripId) trips, and drop any prev persisted trips
          // that are also in the API response to avoid duplicates.
          const localOnly = prev.filter((t) => t.tripId == null && !(t.tripCode && apiCodes.has(t.tripCode)));
          const merged = [...mapped, ...localOnly];
          // Final dedupe by tripCode as a safety net.
          const seen = new Set<string>();
          const deduped = merged.filter((t) => {
            const key = t.tripCode ?? t.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return deduped.map((t, i) => ({ ...t, seq: i + 1 }));
        });
      })
      .catch(() => {
        // Endpoint may be empty / offline — drop persisted trips from previous site/date.
        setTrips((prev) => prev.filter((t) => t.tripId == null).map((t, i) => ({ ...t, seq: i + 1 })));
      });
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
    allStops.filter((s) =>
      s.type === "DROP" &&
      (!toPlanOnly || (!usedStopIds.has(s.id) && !draftStopIds.includes(s.id) && (s.routeStatus === "To Plan" || !s.routeStatus))) &&
      (!dropSearch || `${s.txn} ${s.prepList} ${s.pairedDoc} ${s.doctype} ${s.client} ${s.bpcode} ${s.address} ${s.city} ${s.postalCity} ${s.routeCode} ${s.priority} ${s.qty} ${s.netweight} ${s.vol} ${s.dlvyStatus}`.toLowerCase().includes(dropSearch.toLowerCase()))
    ), [allStops, dropSearch, toPlanOnly, usedStopIds, draftStopIds]);

  const pickups = useMemo(() =>
    allStops.filter((s) =>
      s.type === "PICKUP" &&
      (!toPlanOnly || (!usedStopIds.has(s.id) && !draftStopIds.includes(s.id) && (s.routeStatus === "To Plan" || !s.routeStatus))) &&
      (!pickSearch || `${s.txn} ${s.prepList} ${s.pairedDoc} ${s.doctype} ${s.client} ${s.bpcode} ${s.address} ${s.city} ${s.postalCity} ${s.routeCode} ${s.priority} ${s.qty} ${s.netweight} ${s.vol} ${s.dlvyStatus}`.toLowerCase().includes(pickSearch.toLowerCase()))
    ), [allStops, pickSearch, toPlanOnly, usedStopIds, draftStopIds]);

  const draftStops = useMemo(() => {
    const selTrip = trips.find((t) => t.id === selectedTripId);
    const tripStopMap = new Map(selTrip?.stops.map((s) => [s.id, s]) ?? []);
    const base = allStops.filter((s) => draftStopIds.includes(s.id));
    // Overlay optimisation output (arrivalTime, departureTime, seq, …) from the selected trip.
    const merged = base.map((s) => {
      const t = tripStopMap.get(s.id);
      return t ? { ...s, ...t } : s;
    });
    // If the selected trip is optimised, honour its seq ordering.
    if (selTrip && merged.some((s) => s.seq != null)) {
      merged.sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999));
    }
    return merged;
  }, [allStops, draftStopIds, trips, selectedTripId]);

  const routeCodes = useMemo(() => {
    const codes = allStops.map(s => s.routeCode).filter(Boolean);
    return Array.from(new Set(codes)).sort();
  }, [allStops]);

  const filteredTrips = useMemo(() => {
    const norm = (s: any) => (s === "Optimized" ? "Optimised" : s);
    const q = tripSearch.toLowerCase();
    return trips.filter((t) =>
      (statusFilter === "all" || norm(t.status) === norm(statusFilter) || norm((t as any).optiStatus) === norm(statusFilter)) &&
      (!q || `${t.id} ${t.routeCode ?? ""} ${t.vehicle?.code ?? ""} ${t.driver?.name ?? ""} ${(t as any).tripCode ?? ""}`.toLowerCase().includes(q))
    );
  }, [trips, statusFilter, tripSearch]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;
  const detailTrip   = trips.find((t) => t.id === detailTripId)   ?? null;

  // site object for depot lat/lng
  const currentSiteObj = sites.find(s => s.siteCode === site) ?? null;

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
    setAllStops((prev) => prev.map((s) => ids.includes(s.id) ? { ...s, routeStatus: "Planned" } : s));
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
    loadedTripRef.current = null;
  }

  function addSelectedStopsToDraft() {
    addStopsToDraft(Array.from(selectedStopIds));
    setSelectedStopIds(new Set());
    toast({ title: `${selectedStopIds.size} stop(s) added to active trip` });
  }

  // Build the FULL trip payload — used for both create and update.
  // For updates, pass `tripCode` so the backend distinguishes the update path.
  function buildTripPayload(
    vehicle: Vehicle,
    driver: Driver,
    stops: Stop[],
    extra?: { tripCode?: string }
  ) {
    const totalWeight = stops.reduce((n, s) => n + s.netweight, 0);
    const totalVol    = stops.reduce((n, s) => n + s.vol, 0);
    const totalQty    = stops.reduce((n, s) => n + s.qty, 0);
    const deliveries  = stops.filter((s) => s.type === "DROP").length;
    const pickupCount = stops.filter((s) => s.type === "PICKUP").length;
    const capacity    = Number(vehicle.capacity) || 0;
    const capVol      = Number(vehicle.vol) || 0;

    return {
      ...(extra?.tripCode ? { tripCode: extra.tripCode } : {}),
      site,
      docDate: date,
      driverId: driver.id,
      driverName: driver.name,
      vehicleCode: vehicle.code,
      depSite: (vehicle as any).departureSite || site,
      arrSite: (vehicle as any).arrivalSite || site,
      drops: deliveries,
      pickups: pickupCount,
      noOfPackages: totalQty,
      startTime: vehicle.startTime || "07:30",
      endTime: "",
      totalWeight: String(totalWeight),
      totalVolume: String(totalVol),
      capacity: String(capacity),
      uomCapacity: (vehicle as any).weightUnit || "KG",
      uomVolume: (vehicle as any).volumeUnit || "M3",
      uomDistance: "mi",
      weightPct: capacity > 0 ? Number(((totalWeight / capacity) * 100).toFixed(4)) : 0,
      volumePct: capVol > 0 ? Number(((totalVol / capVol) * 100).toFixed(4)) : 0,
      travelTime: "",
      totalTime: "",
      totalDistance: "",
      totalCost: "",
      distanceCost: "",
      fixedCost: "",
      serviceCost: "",
      notes: "",
      generatedBy: "PLANNER",
      userCode: "SYSTEM",
      stopObjects: stops as any,
      vehicleObject: vehicle as any,
      totalObject: null as any,
    };
  }

  async function confirmTrip() {
    if (!draftVehicle) return toast({ title: "Select a vehicle", description: "Click a vehicle row to assign." });
    if (!draftDriver)  return toast({ title: "Assign a driver",  description: "Drag a driver or click a driver row." });
    if (!draftStopIds.length) return toast({ title: "Add stops", description: "Select drops/pickups and add to trip." });

    // BUG FIX: "Confirm" was always calling createTrip(), even when the
    // draft was actually an existing, already-persisted trip loaded via
    // selectTrip() for editing (e.g. adding a stop to a trip you already
    // confirmed earlier). loadedTripRef is set by selectTrip() whenever
    // that happens — if it's populated, this is an update, not a new trip.
    const loaded = loadedTripRef.current;
    const existingTrip = loaded ? trips.find((t) => t.tripId === loaded.tripId) : undefined;

    if (existingTrip && existingTrip.tripCode) {
      await pushTripUpdate(existingTrip, draftVehicle, draftDriver, draftStops, "Trip updated");
      clearDraft();
      setRefreshKey((k) => k + 1);
      return;
    }

    const totalWeight = draftStops.reduce((n, s) => n + s.netweight, 0);
    const deliveries  = draftStops.filter((s) => s.type === "DROP").length;
    const pickupCount = draftStops.filter((s) => s.type === "PICKUP").length;
    const totalVol    = draftStops.reduce((n, s) => n + s.vol, 0);
    const totalQty    = draftStops.reduce((n, s) => n + s.qty, 0);
    const distanceKm  = Math.round(40 + draftStops.length * 12 + Math.random() * 30);
    const travelMin   = Math.round(60 + draftStops.length * 18);
    const fallbackId  = `XVR-${date.replace(/-/g, "")}-${site}-${String(trips.length + 1).padStart(3, "0")}`;

    const payload = buildTripPayload(draftVehicle, draftDriver, draftStops);

    const fallback: Trip = {
      id: fallbackId,
      routeCode: `Route code ${trips.length + 1}`,
      seq: trips.length + 1,
      vehicle: draftVehicle, driver: draftDriver, stops: draftStops,
      distanceKm, travelTimeMin: travelMin,
      totalWeight, totalVol, totalQty, deliveries, pickups: pickupCount,
      status: "Open", locked: false, tmsValidated: false,
      createdAt: new Date().toLocaleTimeString(),
      departSite: site, arrivalSite: site,
    };

    try {
      const resp = await tripApi.createTrip(payload);
      const trip = tripFromApi(resp, fallback);
      trip.seq = trips.length + 1;
      setTrips((prev) => [...prev, trip]);
      setSelectedTripId(trip.id);
      clearDraft();
      toast({ title: "Trip confirmed", description: `${resp.tripCode} · ${draftStops.length} stops · ${totalWeight} kg` });
      // Refetch trips for the current site + date so the list reflects backend state.
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast({ title: "Failed to confirm trip", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  // Push the full trip payload to backend for an existing trip.
  async function pushTripUpdate(
    trip: Trip,
    vehicle: Vehicle,
    driver: Driver,
    stops: Stop[],
    successMsg?: string,
  ) {
    if (trip.tripId == null || !trip.tripCode) return;
    try {
      const payload = buildTripPayload(vehicle, driver, stops, { tripCode: trip.tripCode });
      const resp = await tripApi.updateTrip(trip.tripCode, payload);
      setTrips((prev) => prev.map((x) => x.id === trip.id ? tripFromApi(resp, x) : x));
      if (successMsg) toast({ title: successMsg, description: trip.tripCode });
      // refresh baseline for stop-sync detection
      loadedTripRef.current = { tripId: trip.tripId, stopIds: stops.map((s) => s.id) };
    } catch (e: any) {
      toast({ title: "Trip update failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  // ── Trip row actions ───────────────────────────────────
  function selectTrip(t: Trip) {
    setSelectedTripId(t.id);
    // load trip stops back into active panel for viewing
    setDraftVehicle(t.vehicle);
    setDraftDriver(t.driver);
    setDraftStopIds(t.stops.map((s) => s.id));
    loadedTripRef.current = t.tripId != null
      ? { tripId: t.tripId, stopIds: t.stops.map((s) => s.id) }
      : null;
  }

//   function reorderTripStops(trip: Trip, newStops: Stop[]) {
//   // Update state immediately — draftStops will re-sort by the new seq automatically
//   setTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, stops: newStops } : t)));

//   // Persist to backend if this trip already exists server-side
//   if (trip.tripId != null && trip.tripCode) {
//     pushTripUpdate(trip, trip.vehicle, trip.driver, newStops, "Stop order updated");
//   }
// }
function reorderTripStops(trip: Trip, newStops: Stop[]) {
  const wasOptimised = trip.optiStatus === "Optimised";
  setTrips((prev) => prev.map((t) => (t.id === trip.id
    ? { ...t, stops: newStops, ...(wasOptimised ? { optiStatus: "Open" as any, status: "Open" as any } : {}) }
    : t)));
  if (trip.tripId != null && trip.tripCode) {
    pushTripUpdate(trip, trip.vehicle, trip.driver, newStops, "Stop order updated");
  }
}

  // Reassign vehicle/driver on a persisted trip — with confirmation + backend sync.
  async function reassignVehicle(v: Vehicle | null) {
    const trip = trips.find((x) => x.id === selectedTripId);
    if (!trip || trip.tripId == null) { setDraftVehicle(v); return; }
    if (!v) {
      setDraftVehicle(null);
      setTrips((prev) => prev.map((x) => x.id === trip.id ? { ...x, vehicle: v ?? x.vehicle } : x));
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Change vehicle?",
      description: `Reassign vehicle of trip ${trip.tripCode ?? trip.id} to ${v.code} (${v.vehicleNo}). The active tour will be updated and saved.`,
      confirmLabel: "Yes, change",
      onConfirm: async () => {
        setDraftVehicle(v);
        setTrips((prev) => prev.map((x) => x.id === trip.id ? { ...x, vehicle: v } : x));
        await pushTripUpdate(trip, v, trip.driver, trip.stops, "Vehicle updated");
      },
    });
  }

  async function reassignDriver(d: Driver | null) {
    const trip = trips.find((x) => x.id === selectedTripId);
    if (!trip || trip.tripId == null) { setDraftDriver(d); return; }
    if (!d) {
      setDraftDriver(null);
      setTrips((prev) => prev.map((x) => x.id === trip.id ? { ...x, driver: d ?? x.driver } : x));
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Change driver?",
      description: `Reassign driver of trip ${trip.tripCode ?? trip.id} to ${d.name}. The active tour will be updated and saved.`,
      confirmLabel: "Yes, change",
      onConfirm: async () => {
        setDraftDriver(d);
        setTrips((prev) => prev.map((x) => x.id === trip.id ? { ...x, driver: d } : x));
        await pushTripUpdate(trip, trip.vehicle, d, trip.stops, "Driver updated");
      },
    });
  }

  // Auto-sync stop add/remove on a selected persisted trip (debounced).
  useEffect(() => {
    const baseline = loadedTripRef.current;
    if (!baseline) return;
    const trip = trips.find((x) => x.tripId === baseline.tripId);
    if (!trip || !draftVehicle || !draftDriver) return;

    const a = baseline.stopIds.slice().sort().join("|");
    const b = draftStopIds.slice().sort().join("|");
    if (a === b) return;

    if (stopSyncTimerRef.current) clearTimeout(stopSyncTimerRef.current);
    stopSyncTimerRef.current = setTimeout(() => {
      pushTripUpdate(trip, draftVehicle, draftDriver, draftStops, "Trip stops updated");
    }, 700);
    return () => {
      if (stopSyncTimerRef.current) clearTimeout(stopSyncTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStopIds]);





  async function setTripStatus(trip: Trip, optiStatus: OptiStatus, lockFlag: number) {
    if (trip.tripId == null || !trip.tripCode) {
      // Local-only trip (not yet persisted) — update UI optimistically
      setTrips((prev) => prev.map((t) => t.id === trip.id
        ? { ...t, status: optiStatus === "Optimised" ? "Optimised" : optiStatus, locked: lockFlag === 1, optiStatus, lockFlag }
        : t));
      return;
    }
    try {
      let resp;
      if (optiStatus === "Locked")         resp = await tripApi.lockTrip(trip.tripCode);
      else if (optiStatus === "Validated") resp = await tripApi.validateTrip(trip.tripCode);
      else if (optiStatus === "Open" && lockFlag === 0) resp = await tripApi.unlockTrip(trip.tripCode);
      else resp = await tripApi.updateTripStatus(trip.tripCode, { optiStatus, lockFlag, notes: "", userCode: "SYSTEM" });
      setTrips((prev) => prev.map((t) => t.id === trip.id ? tripFromApi(resp, t) : t));
      setSelectedTripIds((prev) => { if (!prev.has(trip.id)) return prev; const n = new Set(prev); n.delete(trip.id); return n; });
      toast({ title: `Trip ${optiStatus.toLowerCase()}`, description: trip.tripCode ?? trip.id });
    } catch (e: any) {
      toast({ title: "Status update failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  function lockTrip(id: string) {
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    const willLock = !t.locked;
    if (willLock) {
      const isOptimised = t.optiStatus === "Optimised" || t.status === "Optimised" || t.status === "Optimized";
      if (!isOptimised) {
        toast({
          title: "Cannot Lock",
          description: "Trip is in Open status, can't lock. Optimise the trip first before locking.",
          variant: "destructive",
        });
        return;
      }
    }
    setTripStatus(t, willLock ? "Locked" : "Open", willLock ? 1 : 0);
  }

  function validateTrip(id: string) {
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    if (!t.locked) {
      const statusLabel = t.optiStatus === "Optimised" || t.status === "Optimised" ? "Optimised" : "Open";
      toast({
        title: "Cannot Validate",
        description: `Trip is in ${statusLabel} status, can't validate. Lock the trip first to create LVS / validate.`,
        variant: "destructive",
      });
      return;
    }
    setTripStatus(t, "Validated", 1);
  }

  async function performDeleteTrip(id: string) {
    const t = trips.find((x) => x.id === id);
    if (t?.tripCode) {
      try {
        await tripApi.deleteTrip(t.tripCode);
      } catch (e: any) {
        toast({ title: "Delete failed", description: e?.message ?? "Unknown error", variant: "destructive" });
        return;
      }
    }
    setTrips((prev) => prev.filter((x) => x.id !== id));
    if (selectedTripId === id) { setSelectedTripId(null); clearDraft(); }
    toast({ title: "Trip removed" });
  }

  function deleteTrip(id: string) {
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    setConfirmDialog({
      open: true,
      title: "Delete Trip",
      description: `Do you want to delete trip ${t.tripCode ?? t.id}?`,
      confirmLabel: "Yes",
      onConfirm: () => performDeleteTrip(id),
    });
  }

  // ── Group selection & actions ──────────────────────────
  useEffect(() => { setSelectedTripIds(new Set()); }, [site, date]);

  function toggleTripSel(id: string) {
    setSelectedTripIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAllTrips(list: Trip[]) {
    const allIds = list.map(t => t.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedTripIds.has(id));
    setSelectedTripIds(allSelected ? new Set() : new Set(allIds));
  }

  async function runGroupStatus(
    kind: "lock" | "unlock" | "validate",
    eligible: Trip[],
    optiStatus: OptiStatus,
    lockFlag: number,
    successLabel: string,
  ) {
    setGroupBusy({ kind, done: 0, total: eligible.length });
    const persisted = eligible.filter(t => !!t.tripCode);
    const localOnly = eligible.filter(t => !t.tripCode);

    // Optimistically flip local-only trips
    if (localOnly.length) {
      setTrips((prev) => prev.map((x) => localOnly.some(t => t.id === x.id)
        ? { ...x, optiStatus, lockFlag, locked: lockFlag === 1, status: optiStatus as any }
        : x));
    }

    let ok = localOnly.length;
    try {
      if (persisted.length) {
        const codes = persisted.map(t => t.tripCode!);
        const action = kind === "lock" ? tripApi.lockTripsGroup
                     : kind === "unlock" ? tripApi.unlockTripsGroup
                     : tripApi.validateTripsGroup;
        await action(codes);
        // Refresh each persisted trip
        for (let i = 0; i < persisted.length; i++) {
          const t = persisted[i];
          try {
            const resp = await tripApi.getTripByCode(t.tripCode!);
            setTrips((prev) => prev.map((x) => x.id === t.id ? tripFromApi(resp, x) : x));
          } catch {
            setTrips((prev) => prev.map((x) => x.id === t.id
              ? { ...x, optiStatus, lockFlag, locked: lockFlag === 1, status: optiStatus as any }
              : x));
          }
          ok++;
          setGroupBusy({ kind, done: ok, total: eligible.length });
        }
      }
    } catch (e: any) {
      setVroomError({ title: `${successLabel} failed`, detail: e?.message ?? "Unknown error" });
    }
    setGroupBusy(null);
    if (ok > 0) toast({ title: `${ok} trip(s) ${successLabel}` });
  }

  async function groupLock() {
    const selected = trips.filter(t => selectedTripIds.has(t.id));
    if (!selected.length) { setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." }); return; }
    const eligible = selected.filter(t => !t.locked);
    if (!eligible.length) { setVroomError({ title: "No Trips to Lock", detail: "All selected trips are already locked." }); return; }
    setConfirmDialog({
      open: true,
      title: "Lock trips",
      description: `Lock ${eligible.length} trip(s)? This will send them to X3.`,
      confirmLabel: "Yes, lock",
      onConfirm: () => runGroupStatus("lock", eligible, "Locked", 1, "locked"),
    });
  }

  async function groupUnlock() {
    const selected = trips.filter(t => selectedTripIds.has(t.id));
    if (!selected.length) { setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." }); return; }
    const eligible = selected.filter(t => t.locked);
    if (!eligible.length) { setVroomError({ title: "No Trips to Unlock", detail: "No selected trips are currently locked." }); return; }
    await runGroupStatus("unlock", eligible, "Open", 0, "unlocked");
  }

  async function groupValidate() {
    const selected = trips.filter(t => selectedTripIds.has(t.id));
    if (!selected.length) { setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." }); return; }
    const eligible = selected.filter(t => t.locked === true && t.optiStatus !== "Validated");
    if (!eligible.length) { setVroomError({ title: "No Trips to Validate", detail: "Group Validate requires selected trips that are Locked and not yet Validated." }); return; }
    setConfirmDialog({
      open: true,
      title: "Validate trips",
      description: `Validate ${eligible.length} trip(s)? This cannot be undone.`,
      confirmLabel: "Yes, validate",
      onConfirm: () => runGroupStatus("validate", eligible, "Validated", 1, "validated"),
    });
  }

  async function groupDelete() {
    const selected = trips.filter(t => selectedTripIds.has(t.id));
    if (!selected.length) { setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." }); return; }
    const eligible = selected.filter(t => !t.locked);
    const lockedCount = selected.length - eligible.length;
    if (!eligible.length) {
      setVroomError({ title: "Cannot Delete", detail: `All ${lockedCount} selected trip(s) are locked and cannot be deleted.\nUnlock them first.` });
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Delete trips",
      description: `Delete ${eligible.length} trip(s)?${lockedCount > 0 ? `\n(Note: ${lockedCount} locked trip(s) will be skipped)` : ""}`,
      confirmLabel: "Yes, delete",
      onConfirm: async () => {
        setGroupBusy({ kind: "delete", done: 0, total: eligible.length });
        let ok = 0;
        for (let i = 0; i < eligible.length; i++) {
          const t = eligible[i];
          try {
            if (t.tripCode) await tripApi.deleteTrip(t.tripCode);
            setTrips((prev) => prev.filter((x) => x.id !== t.id));
            setSelectedTripIds((prev) => { const n = new Set(prev); n.delete(t.id); return n; });
            if (selectedTripId === t.id) { setSelectedTripId(null); clearDraft(); }
            ok++;
          } catch (e: any) {
            setVroomError({ title: "Delete failed", detail: `Trip ${t.tripCode ?? t.id}: ${e?.message ?? "Unknown error"}` });
            break;
          }
          setGroupBusy({ kind: "delete", done: i + 1, total: eligible.length });
        }
        setGroupBusy(null);
        if (ok > 0) toast({ title: `${ok} trip(s) deleted` });
      },
    });
  }

  async function groupOptimise() {
    const selected = trips.filter(t => selectedTripIds.has(t.id));
    if (!selected.length) { setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." }); return; }
    const eligible = selected.filter(t => t.optiStatus === "Open" && !!t.driver?.name);
    if (!eligible.length) {
      setVroomError({ title: "No Eligible Trips", detail: "Group Optimise requires selected trips with status 'Open' and a driver assigned." });
      return;
    }
    const depLat = currentSiteObj?.latitude ? Number(currentSiteObj.latitude) : 0;
    const depLng = currentSiteObj?.longitude ? Number(currentSiteObj.longitude) : 0;
    if (!depLat || !depLng) {
      setVroomError({ title: "Missing Site Coordinates", detail: "This site has no latitude/longitude.\nGo to Configuration → Customers → select the site address and set lat/lng." });
      return;
    }

    setGroupBusy({ kind: "optimise", done: 0, total: eligible.length });
    let ok = 0;
    for (let i = 0; i < eligible.length; i++) {
      const t = eligible[i];
      try {
        const missing = t.stops.filter(s => !s.lat || !s.lng);
        if (missing.length) throw new Error(`${missing.length} stop(s) missing coordinates`);
        const startSec = hhmmToSec("07:30");
        const capGrams = Math.round((t.vehicle.capacity ?? 60000) * 1000);
        const vroomVehicle = {
          id: 1, description: t.vehicle.code,
          start: [depLng, depLat] as [number, number],
          end:   [depLng, depLat] as [number, number],
          capacity: [capGrams] as [number],
          time_window: [startSec, hhmmToSec("23:59")] as [number, number],
          max_tasks: 999,
        };
        const vroomJobs = t.stops.map((s, idx) => ({
          id: idx + 1, description: s.txn,
          location: [s.lng, s.lat] as [number, number],
          service: 1800,
          ...(s.type === "DROP"
            ? { delivery: [Math.round((s.netweight || 1) * 1000)] as [number] }
            : { pickup:   [Math.round((s.netweight || 1) * 1000)] as [number] }),
          priority: s.priority === "URGENT" ? 10 : s.priority === "LOW" ? 1 : 5,
        }));
        const result = await callVroom([vroomVehicle], vroomJobs);
        if (!result.routes?.length) throw new Error("VROOM returned no routes");
        const route = result.routes[0];
        const jobSteps = route.steps.filter((st: VroomStep) => st.type === "job");
        const endStep = route.steps.find((st: VroomStep) => st.type === "end");
        const endTime = secToHHMM(endStep ? endStep.arrival : startSec + route.duration);
        const totalDistKm = (route.distance / 1000).toFixed(1);
        const travelHHMM = secToHHMM(route.duration);
        const stopResults = jobSteps.map((st: VroomStep, idx: number) => ({
          seq: idx + 1, docNum: st.description ?? "",
          arrivalDate: date, arrivalTime: secToHHMM(st.arrival),
          departureDate: date, departureTime: secToHHMM(st.arrival + st.service),
          fromPrevDistance: ((st.distance ?? 0) / 1000).toFixed(1),
          fromPrevTravelTime: secToHHMM(st.duration),
          serviceTime: secToHHMM(st.service),
          waitingTime: secToHHMM(st.waiting_time ?? 0),
        }));
        if (t.tripCode) {
          const resp = await tripApi.optimiseTrip(t.tripCode, {
            orderMode: "auto", startTime: "07:30", endTime,
            travelTime: travelHHMM, totalTime: travelHHMM,
            totalDistance: totalDistKm, uomDistance: "km",
            totalCost: "", distanceCost: "", fixedCost: "", serviceCost: "",
            stopResults,
          });
          setTrips((prev) => prev.map((x) => x.id === t.id ? tripFromApi(resp, x) : x));
        } else {
          setTrips((prev) => prev.map((x) => x.id === t.id ? { ...x, status: "Optimised", optiStatus: "Optimised" as any } : x));
        }
        setSelectedTripIds((prev) => { if (!prev.has(t.id)) return prev; const n = new Set(prev); n.delete(t.id); return n; });
        ok++;
      } catch (e: any) {
        setVroomError({ title: "Optimisation failed", detail: `Trip ${t.tripCode ?? t.id}: ${e?.message ?? "VROOM error"}` });
        break;
      }
      setGroupBusy({ kind: "optimise", done: i + 1, total: eligible.length });
    }
    setGroupBusy(null);
    if (ok > 0) toast({ title: `${ok} trip(s) optimised` });
  }

  // ── Render ─────────────────────────────────────────────
  const currentStops = stopTypeTab === "drops" ? drops : pickups;
  const currentSearch = stopTypeTab === "drops" ? dropSearch : pickSearch;
  const setCurrentSearch = stopTypeTab === "drops" ? setDropSearch : setPickSearch;
  const allCurrentSelected = currentStops.length > 0 && currentStops.every((s) => selectedStopIds.has(s.id));

  // ── Loader / refresher for VR detail data (vrcode, vrdetails, loadstk) ──
  async function loadVrData(tripCode: string) {
    setVrLoading(true);
    try {
      const [header, details, loadStock] = await Promise.all([
        transportApi.getVrHeader(tripCode).catch(() => null),
        transportApi.getVrDetails(tripCode).catch(() => []),
        transportApi.getVrLoadStock(tripCode).catch(() => []),
      ]);
      setVrHeader(header);
      setVrDetails(details ?? []);
      setVrLoadStock(loadStock ?? []);
    } catch (err: any) {
      toast({ title: "Failed to load route detail", description: err?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setVrLoading(false);
    }
  }

  // Called from the detail screen when user clicks "LVS Create":
  // POST /trips/{code}/validate  →  refresh vrHeader / vrDetails / vrLoadStock
  async function handleLvsCreateFromDetail(trip: Trip) {
    if (!trip.tripCode) return;
    if (!trip.locked) {
      const statusLabel = trip.optiStatus === "Optimised" || trip.status === "Optimised" ? "Optimised" : "Open";
      toast({
        title: "Cannot Create LVS",
        description: `Trip is in ${statusLabel} status, can't validate. Lock the trip first to create LVS / validate.`,
        variant: "destructive",
      });
      return;
    }
    try {
      const resp = await tripApi.validateTrip(trip.tripCode);
      setTrips((prev) => prev.map((t) => t.id === trip.id ? tripFromApi(resp, t) : t));
      toast({ title: "LVS Created", description: trip.tripCode });
      await loadVrData(trip.tripCode);
    } catch (e: any) {
      toast({ title: "LVS Create failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  // Called from the detail screen when user clicks "LVS Confirm":
  // POST /api/v1/x3/confirm-lvs (X10CCONBUT via X3SoapService) → refresh vrLoadStock
  async function handleLvsConfirmFromDetail(trip: Trip, lvsNum: string) {
    try {
      const resp = await x3SoapApi.confirmLvs(lvsNum);
      if (resp && (resp as any).error) {
        throw new Error((resp as any).error);
      }
      toast({ title: "LVS Confirmed", description: lvsNum });
      if (trip.tripCode) await loadVrData(trip.tripCode);
    } catch (e: any) {
      toast({ title: "LVS Confirm failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  // ── If detail view, render full-screen detail page ─────────
  if (view === "detail" && detailTrip) {
    return (
      <RouteManagementDetail
        trip={detailTrip}
        vrHeader={vrHeader}
        vrDetails={vrDetails}
        vrLoadStock={vrLoadStock}
        vrLoading={vrLoading}
        onLvsCreate={() => handleLvsCreateFromDetail(detailTrip)}
        onLvsConfirm={(lvsNum) => handleLvsConfirmFromDetail(detailTrip, lvsNum)}
        onBack={() => { setView("planner"); setDetailTripId(null); setVrHeader(null); setVrDetails([]); setVrLoadStock([]); }}
      />
    );
  }


  return (
    <>
    <div className="flex flex-col bg-background" style={{ height: "calc(100vh - 56px)", fontFamily: "Inter, system-ui, sans-serif", fontSize: "12px" }}>

      {/* ── TOOLBAR ─ compact single row ─────────────── */}
      <div className="flex items-center gap-4 px-3 py-4 bg-gradient-to-r from-slate-50 via-blue-50/60 to-indigo-50/60 border-b border-border/60 flex-shrink-0 shadow-sm font-black text-xl">
        {/* Site */}
        {sitesLoading
          ? <div className="h-9 flex items-center gap-2 px-3 text-xs text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border"><Loader2 className="w-4 h-4 animate-spin" /> Loading sites…</div>
          : <SiteSelect sites={sites} value={site} onChange={setSite} />
        }
        {/* Date */}
        <div className="relative cursor-pointer h-9 flex items-center rounded-lg border border-input bg-background pl-8 pr-2 hover:border-primary/40 transition-colors" onClick={(e) => {
          const inp = (e.currentTarget.querySelector("input[type=date]") as HTMLInputElement | null);
          inp?.showPicker?.(); inp?.focus();
        }}>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <CalIcon className="w-3.5 h-3.5 text-primary pointer-events-none" />
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            onClick={(e) => { (e.currentTarget as HTMLInputElement).showPicker?.(); }}
            className="h-7 bg-transparent text-xs focus:outline-none w-[120px] cursor-pointer"
          />
        </div>
        {/* Route Codes */}
        <Select value={routeCode} onValueChange={setRouteCode}>
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue placeholder="Route Codes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Route Codes</SelectItem>
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

        <ToolbarBtn icon={Wand2}       label="Auto Generate Route" color="text-blue-600"    bg="hover:bg-blue-50"    onClick={openAutoGen} />
        <ToolbarBtn icon={GitMerge}    label={groupBusy?.kind === "optimise" ? `Optimising ${groupBusy.done}/${groupBusy.total}…` : "Group Optimisation"} color="text-slate-600"   bg="hover:bg-slate-50"   disabled={!!groupBusy} spin={groupBusy?.kind === "optimise"} onClick={groupOptimise} />
        <ToolbarBtn icon={Lock}        label={groupBusy?.kind === "lock"     ? `Locking ${groupBusy.done}/${groupBusy.total}…`    : "Group Lock"}         color="text-emerald-600" bg="hover:bg-emerald-50" disabled={!!groupBusy} spin={groupBusy?.kind === "lock"}     onClick={groupLock} />
        <ToolbarBtn icon={Unlock}      label={groupBusy?.kind === "unlock"   ? `Unlocking ${groupBusy.done}/${groupBusy.total}…`  : "Group Unlock"}       color="text-violet-600"  bg="hover:bg-violet-50"  disabled={!!groupBusy} spin={groupBusy?.kind === "unlock"}   onClick={groupUnlock} />
        <ToolbarBtn icon={ShieldCheck} label={groupBusy?.kind === "validate" ? `Validating ${groupBusy.done}/${groupBusy.total}…` : "Group Validate"}     color="text-amber-600"   bg="hover:bg-amber-50"   disabled={!!groupBusy} spin={groupBusy?.kind === "validate"} onClick={groupValidate} />
        <ToolbarBtn icon={Trash2}      label={groupBusy?.kind === "delete"   ? `Deleting ${groupBusy.done}/${groupBusy.total}…`   : "Group Delete Trips"} color="text-rose-600"    bg="hover:bg-rose-50"    disabled={!!groupBusy} spin={groupBusy?.kind === "delete"}   onClick={groupDelete} />

        {/* Status pill */}
        <div className="ml-auto flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
              <div className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
              Loading…
            </div>
          )}
          {!loading && loaded && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <span>{site}</span><span className="opacity-60">·</span><span>{date}</span>
              {loadStats && (
                <span className="opacity-80 font-normal ml-1">
                  · {loadStats.vehicles}V · {loadStats.drivers}D · {loadStats.drops}↓ · {loadStats.pickups}↑
                </span>
              )}
            </div>
          )}
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
                      {vehicles.map((v, i) => {
                        const sel = draftVehicle?.code === v.code;
                        return (
                          <tr key={v.code}
                            draggable onDragStart={(e) => onVehicleDragStart(e, v)}
                            onClick={() => reassignVehicle(sel ? null : v)}
                            className={cn(
                              "border-b border-border/20 cursor-pointer transition-colors select-none text-[11px]",
                              sel
                                ? "bg-emerald-50 dark:bg-emerald-950/30"
                                : cn(i % 2 === 1 && "bg-muted/30", "hover:bg-muted/50")
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
                      {drivers.map((d, i) => {
                        const busy = d.status !== "Available";
                        const sel  = draftDriver?.id === d.id;
                        return (
                          <tr key={d.id}
                            draggable={!busy}
                            onDragStart={(e) => onDriverDragStart(e, d)}
                            onClick={() => { if (!busy) reassignDriver(sel ? null : d); }}
                            className={cn(
                              "border-b border-border/20 cursor-pointer transition-colors select-none text-[11px]",
                              sel
                                ? "bg-indigo-50 dark:bg-indigo-950/30"
                                : busy
                                  ? cn(i % 2 === 1 && "bg-muted/30", "opacity-50 hover:bg-muted/30")
                                  : cn(i % 2 === 1 && "bg-muted/30", "hover:bg-indigo-50/40")
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
                <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap pl-1">
                  <Checkbox
                    checked={toPlanOnly}
                    onCheckedChange={(c) => setToPlanOnly(Boolean(c))}
                    className="h-3 w-3"
                  />
                  To Plan
                </label>
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
                      {["Transaction No","Type","Priority","Client Code","Route Code","Postal City","Qty","Weight",""].map((h) => (
                        <th key={h} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap border-b" style={{ background:"#eff6ff", color:"#1e40af", borderColor:"#bfdbfe" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentStops.map((s, i) => (
                      <StopRow
                        key={s.id} stop={s} index={i}
                        used={usedStopIds.has(s.id) || draftStopIds.includes(s.id)}
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
                        <td colSpan={10} className="px-3 py-10 text-center text-xs text-muted-foreground">
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
            siteLat={currentSiteObj?.latitude ? Number(currentSiteObj.latitude) : 0}
            siteLng={currentSiteObj?.longitude ? Number(currentSiteObj.longitude) : 0}
            activeTripId={trips.find(t => t.vehicle.code === draftVehicle?.code)?.tripId ?? null}
            activeTripCode={trips.find(t => t.vehicle.code === draftVehicle?.code)?.tripCode ?? null}
            planDate={date}
            dropZoneActive={dropZoneActive}
            onDragOver={(e) => { e.preventDefault(); setDropZoneActive(true); }}
            onDragLeave={() => setDropZoneActive(false)}
            onDrop={onActivePanelDrop}
            onDriverDrop={(e) => {
              e.stopPropagation();
              const id = e.dataTransfer.getData("text/driver-id");
              const d = apiDrivers.find((x) => x.id === id);
              if (d) reassignDriver(d);
            }}
            onClearVehicle={() => reassignVehicle(null)}
            onClearDriver={() => reassignDriver(null)}
            onRemoveStop={(id) => setDraftStopIds((prev) => prev.filter((x) => x !== id))}
            onClear={clearDraft}
            onConfirm={() => setConfirmDialog({
              open: true,
              title: "Generate trip?",
              description: "Are you sure you want to generate this trip?",
              confirmLabel: "Yes",
              onConfirm: async () => { await confirmTrip(); },
            })}
            selectedTripStatus={selectedTrip?.optiStatus ?? (selectedTrip?.status as string | undefined) ?? null}
            tripLocked={selectedTrip?.locked ?? false}
            tripDepSite={selectedTrip?.departSite ?? null}
            tripArrSite={selectedTrip?.arrivalSite ?? null}
            tripDistanceKm={selectedTrip?.distanceKm ?? null}
            tripStartTime={selectedTrip?.startTime ?? null}
            tripEndTime={selectedTrip?.endTime ?? null}
            onTripOptimised={(tripId, stopResults, totals) => {
              let optimisedId: string | null = null;
              setTrips(prev => prev.map(t => {
              if (t.tripId !== tripId) return t;
              optimisedId = t.id;
              const byDoc = new Map<string, any>((stopResults ?? []).map((r: any) => [r.docNum, r]));
              const mergedStops = t.stops.map((s) => {
                const r = byDoc.get(s.txn);
                return r ? { ...s, seq: r.seq, arrivalDate: r.arrivalDate, arrivalTime: r.arrivalTime,
                  departureDate: r.departureDate, departureTime: r.departureTime,
                  fromPrevDistance: r.fromPrevDistance, fromPrevTravelTime: r.fromPrevTravelTime,
                  serviceTime: r.serviceTime, waitingTime: r.waitingTime } : s;
              }).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
              return { ...t, stops: mergedStops, optiStatus: "Optimised" as any,
                status: "Optimised", distanceKm: totals.distanceKm, endTime: totals.endTime };
              }));
              if (optimisedId) setSelectedTripIds((prev) => { if (!prev.has(optimisedId!)) return prev; const n = new Set(prev); n.delete(optimisedId!); return n; });
            }}
          />
          </div>

          {/* ── TRIPS & MAP ── */}
          <div style={{ minHeight: "40vh" }}>
          {/* ── BOTTOM: Resizable Trips | Map split ──────────── */}
          <ResizableSplit
            defaultLeftPct={60}
            minPct={20}
            maxPct={80}
            leftLabel={`${filteredTrips.length} trip${filteredTrips.length !== 1 ? "s" : ""}${selectedTripIds.size ? ` (${selectedTripIds.size} selected)` : ""}`}
            left={
              <div className="flex h-full overflow-hidden rounded-xl border border-border/60 shadow-sm">

                {/* Option 3: inline expand handled per-row below */}

                {/* ── TRIPS TABLE ── */}
                <div className="bg-card flex flex-col h-full flex-1 overflow-hidden relative">


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
                      <SelectItem value="Optimised">Optimised</SelectItem>
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
                        <th className="px-2 py-1.5 border-b border-border/40 w-8 text-center">
                          <Checkbox
                            checked={filteredTrips.length > 0 && filteredTrips.every(t => selectedTripIds.has(t.id))}
                            onCheckedChange={() => toggleAllTrips(filteredTrips)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </th>
                        <th className="px-2 py-1.5 border-b border-border/40 w-7"></th>
                        <th className="px-2 py-1.5 border-b border-border/40 w-6"></th>
                        {["Trip Code","Details","Status","Vehicle","Driver","Stops","Actions"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrips.length === 0 && (
                        <tr><td colSpan={11} className="px-3 py-12 text-center text-xs text-muted-foreground">
                          {trips.length === 0 ? "No trips yet — confirm a trip above" : "No trips match filters"}
                        </td></tr>
                      )}
                      {filteredTrips.map((t) => {
                        const sel = t.id === selectedTripId;
                        const groupSel = selectedTripIds.has(t.id);
                        const apiStatus = t.optiStatus ?? (t.status as OptiStatus);
                        return (
                          <tr key={t.id}
                            onClick={() => selectTrip(t)}
                            className={cn(
                              "border-b border-border/30 cursor-pointer transition-colors group",
                              sel ? "bg-primary/5 border-l-2 border-l-primary" : groupSel ? "bg-blue-50" : "hover:bg-muted/40",
                              t.locked ? "bg-amber-50/40" : ""
                            )}
                          >
                            <td className="px-2 py-1.5 w-8 text-center">
                              <Checkbox
                                checked={groupSel}
                                onCheckedChange={() => toggleTripSel(t.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-1 py-1.5 w-7">
                              {(apiStatus === "Open" || apiStatus === "Optimised") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteTrip(t.id); }}
                                  title="Delete trip"
                                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-input bg-white text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all duration-200 shadow-sm"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                role="radio"
                                aria-checked={sel}
                                onClick={(e) => { e.stopPropagation(); if (sel) { setSelectedTripId(null); clearDraft(); } else { selectTrip(t); } }}
                                title={sel ? "Selected — showing on map" : "Preview on map"}
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                                  sel
                                    ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                                    : "border-slate-300 bg-white hover:border-primary hover:bg-primary/5"
                                )}
                              >
                                {sel && <span className="w-2 h-2 rounded-full bg-primary" />}
                              </button>
                            </td>
                            <td className="px-2 py-1.5 font-mono text-xs text-primary font-semibold whitespace-nowrap">
                              {t.tripCode ?? t.id.slice(-12)}
                            </td>
                            <td className="px-2 py-1.5">
                              {(() => {
                                const s = String(apiStatus ?? t.status).toLowerCase();
                                const enabled = s === "locked" || s === "validated";
                                return (
                                  <button
                                    disabled={!enabled}
                                    className={cn(
                                      "flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-200 shadow-sm",
                                      enabled
                                        ? "border-input bg-white text-sky-600 hover:bg-sky-50 hover:border-sky-200 cursor-pointer"
                                        : "border-input bg-gray-50 text-gray-300 cursor-not-allowed opacity-60"
                                    )}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!enabled) return;
                                      setDetailTripId(t.id);
                                      setView("detail");
                                      setVrHeader(null);
                                      setVrDetails([]);
                                      setVrLoadStock([]);
                                      if (t.tripCode) {
                                        setVrLoading(true);
                                        try {
                                          const [header, details, loadStock] = await Promise.all([
                                            transportApi.getVrHeader(t.tripCode).catch(() => null),
                                            transportApi.getVrDetails(t.tripCode).catch(() => []),
                                            transportApi.getVrLoadStock(t.tripCode).catch(() => []),
                                          ]);
                                          setVrHeader(header);
                                          setVrDetails(details ?? []);
                                          setVrLoadStock(loadStock ?? []);
                                        } catch (err: any) {
                                          toast({ title: "Failed to load route detail", description: err?.message ?? "Unknown error", variant: "destructive" });
                                        } finally {
                                          setVrLoading(false);
                                        }
                                      }
                                    }}
                                    title={enabled ? "Route Management Detail" : "Available after lock"}
                                  >
                                    <Info className="w-5 h-5" />
                                  </button>
                                );
                              })()}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className={cn("text-[9px] px-2 py-0.5 rounded font-bold", statusColor(t.status))}>
                                {String(apiStatus ?? t.status).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 font-mono font-bold text-xs">{t.vehicle.code}</td>
                            <td className="px-2 py-1.5 text-xs">{t.driver.name}</td>
                            <td className="px-2 py-1.5 text-xs font-mono text-center">{t.stops.length}</td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <button onClick={(e) => { e.stopPropagation(); lockTrip(t.id); }}
                                  title={t.locked ? "Unlock" : "Lock"}
                                  className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border shadow-sm bg-white",
                                    t.locked
                                      ? "border-amber-200 text-amber-600 hover:bg-amber-50 hover:shadow-amber-500/15"
                                      : "border-input text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                                  )}>
                                  {t.locked
                                    ? <Lock className="w-5 h-5 text-amber-600" />
                                    : <Unlock className="w-5 h-5 text-slate-500" />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); validateTrip(t.id); }}
                                  title="Validate"
                                  className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border shadow-sm bg-white",
                                    t.optiStatus === "Validated"
                                      ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:shadow-emerald-500/15"
                                      : "border-input text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                                  )}>
                                  <ShieldCheck className={cn("w-5 h-5", t.optiStatus === "Validated" ? "text-emerald-600" : "text-slate-500")} />
                                </button>
                              </div>
                            </td>


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
                  <h3 className="text-sm font-semibold">Route Preview</h3>
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
                  {tripView === "map" ? <RouteMapView trip={selectedTrip} site={sites.find(s => s.siteCode === site) ?? null} sites={sites} /> : <TripStopListView trip={selectedTrip} onReorder={selectedTrip ? (newStops) => reorderTripStops(selectedTrip, newStops) : undefined} />}
                </div>
              </div>
            }
          />
          </div>
          </div>
        </div>
      )}
    </div>

    {/* ── AUTO TRIP GENERATION MODAL ───────────────────── */}
    <AnimatePresence>
      {showAutoGen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={() => !agSubmitting && setShowAutoGen(false)}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-[1400px] max-h-[92vh] flex flex-col overflow-hidden"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-600 text-white">
              <h2 className="text-base font-semibold tracking-tight">
                Auto Trip Generation : Please select Vehicles, Drivers and Documents
              </h2>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-5 bg-slate-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* ─── LEFT: Vehicles / Drivers ─── */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-800">Vehicles</h3>
                    <select
                      value={agVehClass}
                      onChange={(e) => setAgVehClass(e.target.value)}
                      className="h-8 px-2 text-xs rounded border border-slate-300 bg-white min-w-[180px]"
                    >
                      <option value="">Vehicle Category</option>
                      {agVehicleClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="px-4 pt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                      <button
                        onClick={() => setAgTab("vehicles")}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors",
                          agTab === "vehicles" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                      >Vehicles</button>
                      <button
                        onClick={() => setAgTab("drivers")}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors",
                          agTab === "drivers" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                      >Drivers</button>
                    </div>
                    <input
                      placeholder="Search..."
                      value={agVehSearch}
                      onChange={(e) => setAgVehSearch(e.target.value)}
                      className="h-8 px-3 text-xs rounded border border-slate-300 bg-white w-[200px]"
                    />
                  </div>

                  <div className="px-4 py-3 max-h-[42vh] overflow-auto">
                    {agTab === "vehicles" ? (
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-2 py-2 text-left w-8">
                              <input
                                type="checkbox"
                                checked={agFilteredVehicles.length > 0 && agFilteredVehicles.every(v => agVehSel.has(v.code))}
                                onChange={() => agToggleAll(agFilteredVehicles.map(v => v.code), agVehSel, setAgVehSel)}
                              />
                            </th>
                            <th className="px-2 py-2 text-left">Vehicle Code</th>
                            <th className="px-2 py-2 text-left">Vehicle Name</th>
                            <th className="px-2 py-2 text-left">Vehicle Category</th>
                            <th className="px-2 py-2 text-left">Driver</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agFilteredVehicles.map(v => (
                            <tr key={v.code} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-2 py-1.5">
                                <input type="checkbox" checked={agVehSel.has(v.code)} onChange={() => agToggle(agVehSel, setAgVehSel, v.code)} />
                              </td>
                              <td className="px-2 py-1.5 font-mono">{v.code}</td>
                              <td className="px-2 py-1.5">{v.vehicleNo}</td>
                              <td className="px-2 py-1.5">{v.category}</td>
                              <td className="px-2 py-1.5">{v.driverName || "—"}</td>
                            </tr>
                          ))}
                          {agFilteredVehicles.length === 0 && (
                            <tr><td colSpan={5} className="px-2 py-6 text-center text-slate-400">No vehicles</td></tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-2 py-2 text-left w-8">
                              <input
                                type="checkbox"
                                checked={agFilteredDrivers.length > 0 && agFilteredDrivers.every(d => agDrvSel.has(d.id))}
                                onChange={() => agToggleAll(agFilteredDrivers.map(d => d.id), agDrvSel, setAgDrvSel)}
                              />
                            </th>
                            <th className="px-2 py-2 text-left">Driver Code</th>
                            <th className="px-2 py-2 text-left">Driver Name</th>
                            <th className="px-2 py-2 text-left">License</th>
                            <th className="px-2 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agFilteredDrivers.map(d => (
                            <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-2 py-1.5">
                                <input type="checkbox" checked={agDrvSel.has(d.id)} onChange={() => agToggle(agDrvSel, setAgDrvSel, d.id)} />
                              </td>
                              <td className="px-2 py-1.5 font-mono">{d.id}</td>
                              <td className="px-2 py-1.5">{d.name}</td>
                              <td className="px-2 py-1.5">{d.license || "—"}</td>
                              <td className="px-2 py-1.5">{d.status}</td>
                            </tr>
                          ))}
                          {agFilteredDrivers.length === 0 && (
                            <tr><td colSpan={5} className="px-2 py-6 text-center text-slate-400">No drivers</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex justify-between">
                    <span>Selected Vehicles: <b className="text-slate-900">{agVehSel.size}</b></span>
                    <span>Selected Drivers: <b className="text-slate-900">{agDrvSel.size}</b></span>
                  </div>
                </div>

                {/* ─── RIGHT: Documents ─── */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-800">Documents</h3>
                    <div className="flex items-end gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Start Date</label>
                        <input type="date" value={agStartDate} onChange={(e) => setAgStartDate(e.target.value)}
                          className="h-8 px-2 text-xs rounded border border-slate-300 bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">End Date</label>
                        <input type="date" value={agEndDate} onChange={(e) => setAgEndDate(e.target.value)}
                          className="h-8 px-2 text-xs rounded border border-slate-300 bg-white" />
                      </div>
                      <select value={agRouteCode} onChange={(e) => setAgRouteCode(e.target.value)}
                        className="h-8 px-2 text-xs rounded border border-slate-300 bg-white min-w-[140px]">
                        <option value="">Route Code</option>
                        {routeCodes.map(rc => <option key={rc} value={rc}>{rc}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="px-4 pt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                      <button
                        onClick={() => setAgDocTab("deliveries")}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors",
                          agDocTab === "deliveries" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                      >Deliveries</button>
                      <button
                        onClick={() => setAgDocTab("pickups")}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors",
                          agDocTab === "pickups" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                      >Pickups</button>
                    </div>
                    <input
                      placeholder="Search..."
                      value={agDocSearch}
                      onChange={(e) => setAgDocSearch(e.target.value)}
                      className="h-8 px-3 text-xs rounded border border-slate-300 bg-white w-[200px]"
                    />
                  </div>

                  <div className="px-4 py-3 max-h-[42vh] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="px-2 py-2 text-left w-8">
                            <input
                              type="checkbox"
                              checked={
                                agFilteredDocs.length > 0 &&
                                agFilteredDocs.every(s => (agDocTab === "deliveries" ? agDropSel : agPickSel).has(s.id))
                              }
                              onChange={() => agToggleAll(
                                agFilteredDocs.map(s => s.id),
                                agDocTab === "deliveries" ? agDropSel : agPickSel,
                                agDocTab === "deliveries" ? setAgDropSel : setAgPickSel,
                              )}
                            />
                          </th>
                          <th className="px-2 py-2 text-left">Document Number</th>
                          <th className="px-2 py-2 text-left">Client Code</th>
                          <th className="px-2 py-2 text-left">Client Name</th>
                          <th className="px-2 py-2 text-left">Route Code</th>
                          <th className="px-2 py-2 text-left">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agFilteredDocs.map(s => {
                          const sel = agDocTab === "deliveries" ? agDropSel : agPickSel;
                          const setSel = agDocTab === "deliveries" ? setAgDropSel : setAgPickSel;
                          return (
                            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-2 py-1.5">
                                <input type="checkbox" checked={sel.has(s.id)} onChange={() => agToggle(sel, setSel, s.id)} />
                              </td>
                              <td className="px-2 py-1.5 font-mono">{s.txn}</td>
                              <td className="px-2 py-1.5">{s.bpcode}</td>
                              <td className="px-2 py-1.5">{s.client}</td>
                              <td className="px-2 py-1.5">{s.routeCode || "—"}</td>
                              <td className="px-2 py-1.5">{s.doctype}</td>
                            </tr>
                          );
                        })}
                        {agFilteredDocs.length === 0 && (
                          <tr><td colSpan={6} className="px-2 py-6 text-center text-slate-400">No documents</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex justify-between">
                    <span>Selected Drops: <b className="text-slate-900">{agDropSel.size}</b></span>
                    <span>Selected Pickups: <b className="text-slate-900">{agPickSel.size}</b></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
              {agCanSubmit && (
                <button
                  onClick={agClear}
                  disabled={agSubmitting}
                  className="px-5 h-9 rounded-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                >Clear</button>
              )}
              <button
                onClick={agSubmit}
                disabled={!agCanSubmit || agSubmitting}
                className={cn(
                  "px-5 h-9 rounded-full text-xs font-semibold text-white transition-colors",
                  agCanSubmit && !agSubmitting
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow"
                    : "bg-slate-300 cursor-not-allowed"
                )}
              >{agSubmitting ? "Submitting..." : "Submit"}</button>
              <button
                onClick={() => !agSubmitting && setShowAutoGen(false)}
                disabled={agSubmitting}
                className="px-5 h-9 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Confirmation dialog (vehicle/driver reassign etc.) */}
    <AlertDialog
      open={!!confirmDialog?.open}
      onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDialog?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const fn = confirmDialog?.onConfirm;
              setConfirmDialog(null);
              if (fn) await fn();
            }}
          >
            {confirmDialog?.confirmLabel ?? "Yes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* ── VROOM Error Popup (inline Zap + Auto Generate) ── */}
    {vroomError && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center"
        style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
        onClick={() => setVroomError(null)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: 400, fontFamily: "Inter, system-ui, sans-serif" }}
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <p className="text-[13px] font-bold text-white flex-1">{vroomError.title}</p>
            <button onClick={() => setVroomError(null)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            <p className="text-[12px] text-gray-700 whitespace-pre-line leading-relaxed">
              {vroomError.detail}
            </p>
          </div>
          <div className="px-5 pb-4 flex justify-end">
            <button onClick={() => setVroomError(null)}
              className="px-5 py-2 rounded-lg text-[12px] font-bold bg-red-600 hover:bg-red-700 text-white transition-colors">
              OK
            </button>
          </div>
        </motion.div>
      </div>
    )}

  </>
  );
}

