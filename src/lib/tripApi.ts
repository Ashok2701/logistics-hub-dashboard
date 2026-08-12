// Trip management API client
const BASE = "https://tmssolutions.tema-systems.com:8040/api/v1";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("vanguard-token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export type OptiStatus = "Open" | "Optimised" | "Locked" | "Validated";

export interface TripStop {
  id: string;
  txn: string;
  docNum: string;
  type: "DROP" | "PICKUP";
  prepList: string;
  client: string;
  bpcode: string;
  address: string;
  city: string;
  postalCity: string;
  routeCode: string;
  priority: string;
  qty: number;
  netWeight: number;
  volume: number;
  lat: number;
  lng: number;
  // Added by optimisation (initially empty):
  seq?: number;
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  fromPrevDistance?: string;
  fromPrevTravelTime?: string;
  serviceTime?: string;
  waitingTime?: string;
}

export interface TripVehicle {
  code: string;
  vehicleNo: string;
  category: string;
  departureSite: string;
  arrivalSite: string;
  capacityWeight: number;
  capacityVolume: number;
  weightUnit: string;
  volumeUnit: string;
  startTime: string;
  site: string;
}

export interface TripDriver {
  id: string;
  name: string;
  license: string;
  status: string;
}

export interface TripRecord {
  tripId: number;
  tripCode: string;
  site: string;
  docDate: string;
  driverId: string;
  driverName: string;
  vehicleCode: string;
  stops: number;
  drops: number;
  pickups: number;
  noOfPackages: number;
  depSite: string;
  arrSite: string;
  startTime: string;
  endTime: string;
  travelTime: string;
  totalTime: string;
  totalWeight: string;
  totalVolume: string;
  capacity: string;
  uomCapacity: string;
  uomVolume: string;
  weightPct: number;
  volumePct: number;
  totalDistance: string;
  totalCost: string;
  distanceCost: string;
  fixedCost: string;
  optiStatus: OptiStatus;
  lockFlag: number;
  notes: string;
  generatedBy: string;
  stopObjects: TripStop[];
  vehicleObject: TripVehicle;
  totalObject: any;
  userCode: string;
  createDate: string;
  updateDate: string;
}

// Backward-compatible alias used elsewhere in the app
export type TripResponseDTO = TripRecord;

export interface CreateTripPayload {
  tripCode?: string;
  site: string;
  docDate: string;
  driverId: string;
  driverName: string;
  vehicleCode: string;
  depSite: string;
  arrSite: string;
  drops: number;
  pickups: number;
  noOfPackages: number;
  startTime: string;
  endTime: string;
  totalWeight: string;
  totalVolume: string;
  capacity: string;
  uomCapacity: string;
  uomVolume: string;
  uomDistance: string;
  weightPct: number;
  volumePct: number;
  travelTime: string;
  totalTime: string;
  totalDistance: string;
  totalCost: string;
  distanceCost: string;
  fixedCost: string;
  serviceCost: string;
  notes: string;
  generatedBy: string;
  userCode: string;
  stopObjects: TripStop[];
  vehicleObject: TripVehicle;
  totalObject: any;
}

export interface TripStatusPayload {
  optiStatus: OptiStatus | string;
  lockFlag: number;
  notes?: string;
  userCode?: string;
}

export interface StopOptimisationResult {
  seq: number;
  docNum: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  fromPrevDistance: string;
  fromPrevTravelTime: string;
  serviceTime: string;
  waitingTime: string;
}

export interface OptimisePayload {
  orderMode: string;
  startTime: string;
  endTime: string;
  travelTime: string;
  totalTime: string;
  totalDistance: string;
  uomDistance: string;
  totalCost: string;
  distanceCost: string;
  fixedCost: string;
  serviceCost: string;
  stopResults: StopOptimisationResult[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const txt = await res.text();
      if (txt) {
        try {
          const j = JSON.parse(txt);
          msg = j.message || j.error || txt;
        } catch {
          msg = txt;
        }
      }
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
}

export async function createTrip(payload: CreateTripPayload): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle<TripRecord>(res);
}

export async function loadTrips(site: string, date: string): Promise<TripRecord[]> {
  const res = await fetch(
    `${BASE}/trips?site=${encodeURIComponent(site)}&date=${encodeURIComponent(date)}`,
    { headers: authHeaders() }
  );
  const data = await handle<any>(res);
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.trips) ? data.trips : [];
}

export async function getTripByCode(tripCode: string): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${encodeURIComponent(tripCode)}`, { headers: authHeaders() });
  return handle<TripRecord>(res);
}
// Back-compat alias (old callers used getTripById with any identifier)
export const getTripById = getTripByCode;

export async function updateTripStatus(tripCode: string, payload: TripStatusPayload): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${encodeURIComponent(tripCode)}/status`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle<TripRecord>(res);
}

export async function optimiseTrip(tripCode: string, payload: OptimisePayload): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${encodeURIComponent(tripCode)}/optimise`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle<TripRecord>(res);
}

export async function deleteTrip(tripCode: string): Promise<void> {
  const res = await fetch(`${BASE}/trips/${encodeURIComponent(tripCode)}`, {
    method: "DELETE", headers: authHeaders(),
  });
  await handle<void>(res);
}

// Full update — PUT /api/v1/trips/{tripCode}
export async function updateTrip(tripCode: string, payload: Partial<CreateTripPayload>): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${encodeURIComponent(tripCode)}`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle<TripRecord>(res);
}

// ── X3 lock / validate / unlock (single) ───────────────────────────
export async function lockTrip(tripCode: string): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${encodeURIComponent(tripCode)}/lock`, {
    method: "POST", headers: authHeaders(),
  });
  return handle<TripRecord>(res);
}

export async function validateTrip(tripCode: string): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${encodeURIComponent(tripCode)}/validate`, {
    method: "POST", headers: authHeaders(),
  });
  return handle<TripRecord>(res);
}

export async function unlockTrip(tripCode: string): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${encodeURIComponent(tripCode)}/unlock`, {
    method: "POST", headers: authHeaders(),
  });
  return handle<TripRecord>(res);
}

// ── X3 lock / validate / unlock (group) ────────────────────────────
export interface GroupActionResult {
  tripCode: string;
  success: boolean;
  message?: string;
}

async function groupAction(action: "lock" | "validate" | "unlock", tripCodes: string[]): Promise<GroupActionResult[] | any> {
  const res = await fetch(`${BASE}/trips/group/${action}`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(tripCodes),
  });
  return handle<any>(res);
}

export const lockTripsGroup     = (codes: string[]) => groupAction("lock", codes);
export const validateTripsGroup = (codes: string[]) => groupAction("validate", codes);
export const unlockTripsGroup   = (codes: string[]) => groupAction("unlock", codes);

// Namespaced object kept for backward compatibility with existing imports.
export const tripApi = {
  createTrip,
  loadTrips,
  getTripById,
  getTripByCode,
  updateTripStatus,
  optimiseTrip: (tripCode: string, payloadOrOrderMode: OptimisePayload | string, startTime?: string): Promise<TripRecord> => {
    if (typeof payloadOrOrderMode === "string") {
      const payload: OptimisePayload = {
        orderMode: payloadOrOrderMode,
        startTime: startTime ?? "",
        endTime: "", travelTime: "", totalTime: "", totalDistance: "",
        uomDistance: "mi", totalCost: "", distanceCost: "", fixedCost: "", serviceCost: "",
        stopResults: [],
      };
      return optimiseTrip(tripCode, payload);
    }
    return optimiseTrip(tripCode, payloadOrOrderMode);
  },
  deleteTrip,
  updateTrip,
  lockTrip, validateTrip, unlockTrip,
  lockTripsGroup, validateTripsGroup, unlockTripsGroup,
};
