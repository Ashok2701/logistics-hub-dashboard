// ═══════════════════════════════════════════════════════
// Planner — shared types, mappers (API → internal shape),
// and small color-lookup helpers used across the split-out
// Planner components. Extracted from Planner.tsx as-is —
// no behavior changes, just moved to its own file.
// ═══════════════════════════════════════════════════════
import type {
  RpVehicle, RpDriver, RpStop, RpStopProduct,
} from "@/lib/routePlannerApi";
import type { TripResponseDTO, OptiStatus } from "@/lib/tripApi";

export type Vehicle = {
  code: string; vehicleNo: string; departureSite: string; arrivalSite: string;
  driverName: string; category: string; capacity: number; vol: number;
  maxOrders: number; startTime: string; site: string;
};

export type Driver = { id: string; name: string; license: string; status: "Available" | "On Trip"; hoursToday: number; };

export type Stop = {
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
  // Product lines for this stop — used to compute real delivery/pickup
  // quantity totals (sum of qtyOrdered across all products on the doc)
  products?: RpStopProduct[] | null;
};

// ── Mappers: API types → Planner internal types ──────────────
export function mapVehicle(v: RpVehicle): Vehicle {
  return {
    code:         v.vehicleCode,
    vehicleNo:    v.vehicleNumber ?? v.vehicleCode,
    departureSite: v.departureSite ?? "",
    arrivalSite:  v.arrivalSite ?? "",
    driverName:   v.driverId ?? "",
    category:     v.categoryCode ?? "",
    capacity:     Number(v.capacityWeight ?? 0),
    vol:          Number(v.capacityVolume ?? 0),
    maxOrders:    20,
    startTime:    "07:00",
    site:         "",
  };
}

export function mapDriver(d: RpDriver): Driver {
  return {
    id:         d.driverId,
    name:       d.driverName,
    license:    d.licenseNumber ?? "",
    status:     d.driverStatus === 1 ? "Available" : "On Trip",
    hoursToday: 0,
  };
}

export function priorityFromNum(p: number | null): "NORMAL" | "URGENT" | "LOW" {
  if (p === null || p === undefined) return "NORMAL";
  if (p >= 80) return "URGENT";
  if (p <= 10) return "LOW";
  return "NORMAL";
}

export function mapStop(s: RpStop): Stop {
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
    products:    s.products ?? null,
  };
}

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
export type TripStatus = "Open" | "Optimized" | "Optimised" | "Locked" | "Confirmed" | "Validated";
export type Trip = {
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
export const priorityColor = (p: Stop["priority"]) =>
  p === "URGENT" ? "bg-rose-100 text-rose-800 border-rose-200"
  : p === "LOW"    ? "bg-slate-100 text-slate-600 border-slate-200"
  : "bg-green-100 text-green-800 border-green-200";

export const statusColor = (s: TripStatus) => ({
  Open:      "bg-gray-100 text-gray-700",
  Optimized: "bg-blue-100 text-blue-700",
  Optimised: "bg-blue-100 text-blue-700",
  Locked:    "bg-amber-100 text-amber-700",
  Validated: "bg-green-100 text-green-700",
  Confirmed: "bg-green-100 text-green-700",
}[s]);

// Map API optiStatus → internal status
export function statusFromApi(s: OptiStatus): TripStatus {
  return s === "Optimised" ? "Optimised" : s;
}

// Convert an API TripResponseDTO into local Trip shape (best-effort with snapshots)
export function tripFromApi(r: TripResponseDTO, fallback?: Partial<Trip>): Trip {
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

export const hoursColor = (h: number) =>
  h >= 10 ? "text-rose-600" : h >= 8 ? "text-amber-600" : "text-emerald-600";

export const dlvyColor = (s: Stop["dlvyStatus"]) =>
  s === "open" ? "text-emerald-700" : "text-amber-700";
