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
  netweight: number;
  vol: number;
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

export async function getTripById(id: number | string): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${id}`, { headers: authHeaders() });
  return handle<TripRecord>(res);
}

export async function updateTripStatus(id: number | string, payload: TripStatusPayload): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${id}/status`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle<TripRecord>(res);
}

export async function optimiseTrip(id: number | string, payload: OptimisePayload): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${id}/optimise`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle<TripRecord>(res);
}

export async function deleteTrip(id: number | string): Promise<void> {
  const res = await fetch(`${BASE}/trips/${id}`, {
    method: "DELETE", headers: authHeaders(),
  });
  await handle<void>(res);
}

// Partial update — used when re-assigning vehicle or driver from the planner.
export async function updateTrip(id: number | string, payload: Partial<CreateTripPayload>): Promise<TripRecord> {
  const res = await fetch(`${BASE}/trips/${id}`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle<TripRecord>(res);
}

// Namespaced object kept for backward compatibility with existing imports.
export const tripApi = {
  createTrip,
  loadTrips,
  getTripById,
  updateTripStatus,
  optimiseTrip: (id: number | string, payloadOrOrderMode: OptimisePayload | string, startTime?: string): Promise<TripRecord> => {
    if (typeof payloadOrOrderMode === "string") {
      // Legacy call signature: optimiseTrip(id, orderMode, startTime)
      const payload: OptimisePayload = {
        orderMode: payloadOrOrderMode,
        startTime: startTime ?? "",
        endTime: "",
        travelTime: "",
        totalTime: "",
        totalDistance: "",
        uomDistance: "mi",
        totalCost: "",
        distanceCost: "",
        fixedCost: "",
        serviceCost: "",
        stopResults: [],
      };
      return optimiseTrip(id, payload);
    }
    return optimiseTrip(id, payloadOrOrderMode);
  },
  deleteTrip,
  updateTrip,
};
