// Trip management API client
const API_BASE = "https://tmssolutions.tema-systems.com:8040/api/v1";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("vanguard-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
}

export type OptiStatus = "Open" | "Optimised" | "Locked" | "Validated";

export interface TripRequestDTO {
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
  totalDistance: string;
  uomDistance: string;
  travelTime: string;
  weightPct: number;
  volumePct: number;
  totalCost: string;
  notes: string;
  generatedBy: string;
  userCode: string;
  stopObjects: any[];
  vehicleObject: any;
  totalObject: any;
}

export interface TripResponseDTO {
  tripId: number;
  tripCode: string;
  site: string;
  docDate: string;
  driverName: string;
  driverId?: string;
  vehicleCode: string;
  stops: number;
  drops: number;
  pickups: number;
  optiStatus: OptiStatus;
  lockFlag: number;
  startTime: string;
  endTime?: string;
  totalWeight: string;
  totalDistance: string;
  totalVolume?: string;
  travelTime?: string;
  totalCost?: string;
  depSite?: string;
  arrSite?: string;
  createDate: string;
  updateDate: string;
  stopObjects?: any[];
  vehicleObject?: any;
  totalObject?: any;
}

export interface TripStatusUpdateDTO {
  optiStatus: OptiStatus;
  lockFlag: number;
  notes?: string;
  userCode?: string;
}

export const tripApi = {
  createTrip: (payload: TripRequestDTO) =>
    request<TripResponseDTO>("/trips", { method: "POST", body: JSON.stringify(payload) }),

  loadTrips: async (site: string, date: string): Promise<TripResponseDTO[]> => {
    const data = await request<any>(`/trips?site=${encodeURIComponent(site)}&date=${encodeURIComponent(date)}`);
    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.trips) ? data.trips : [];
  },

  getTripById: (id: number | string) =>
    request<TripResponseDTO>(`/trips/${id}`),

  updateTrip: (id: number | string, payload: TripRequestDTO) =>
    request<TripResponseDTO>(`/trips/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  updateTripStatus: (id: number | string, payload: TripStatusUpdateDTO) =>
    request<TripResponseDTO>(`/trips/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) }),

  optimiseTrip: (id: number | string, orderMode: "fixed" | "auto", startTime: string) =>
    request<TripResponseDTO>(`/trips/${id}/optimise`, {
      method: "PATCH",
      body: JSON.stringify({ orderMode, startTime }),
    }),

  deleteTrip: (id: number | string) =>
    request<void>(`/trips/${id}`, { method: "DELETE" }),
};
