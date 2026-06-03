// Fleet module API client
const API_BASE =
  (import.meta as any).env?.VITE_FLEET_API_BASE ?? "https://tmssolutions.tema-systems.com:8040/api";
const SYNC_API_BASE =
  (import.meta as any).env?.VITE_SYNC_API_BASE ?? "https://localhost:8082/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("vanguard-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestBase<T = any>(base: string, path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, {
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

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  return requestBase<T>(API_BASE, path, options);
}

async function syncRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  return requestBase<T>(SYNC_API_BASE, path, options);
}


export interface VehicleCategory {
  categoryCode: string;
  description: string;
  active: boolean;
  countryCode: string;
  vehicleType: number;
  axleCount: number;
  maxCapacityWt: number;
  maxCapacityVol: number;
  volumeUnit: string;
  weightUnit: string;
  skillNumber: number;
}

export const vehicleCategoryApi = {
  list: () => request<VehicleCategory[]>("/vehicle-category"),
  get: (code: string) => request<VehicleCategory>(`/vehicle-category/${code}`),
  create: (b: Partial<VehicleCategory>) =>
    request<VehicleCategory>("/vehicle-category", { method: "POST", body: JSON.stringify(b) }),
  update: (code: string, b: Partial<VehicleCategory>) =>
    request<VehicleCategory>(`/vehicle-category/${code}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (code: string) =>
    request<void>(`/vehicle-category/${code}`, { method: "DELETE" }),
};

export interface Vehicle {
  vehicleCode: string;
  vehicleName: string;
  vehicleNumber: string;
  categoryCode: string;
  brand: string;
  model: string;
  vehicleYear: number;
  color: string;
  capacityWeight: number;
  capacityVolume: number;
  volumeUnit: string;
  weightUnit: string;
  driverId: string;
  active: boolean;
  vehicleStatus: number;
}

export const vehicleApi = {
  list: () => request<Vehicle[]>("/vehicles"),
  get: (code: string) => request<Vehicle>(`/vehicles/${code}`),
  create: (b: Partial<Vehicle>) =>
    request<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(b) }),
  update: (code: string, b: Partial<Vehicle>) =>
    request<Vehicle>(`/vehicles/${code}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (code: string) =>
    request<void>(`/vehicles/${code}`, { method: "DELETE" }),
};

export interface Driver {
  driverId: string;
  driverName: string;
  active: boolean;
  employeeCode: string;
  mobileNo: string;
  email: string;
  licenseNumber: string;
  licenseType: number;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  issuedBy: string;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  driverStatus: number;
  allowAllVehicles: boolean;
  longHaulDriver: boolean;
  notes: string;
}

export const driverApi = {
  list: () => request<Driver[]>("/drivers"),
  get: (id: string) => request<Driver>(`/drivers/${id}`),
  create: (b: Partial<Driver>) =>
    request<Driver>("/drivers", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: Partial<Driver>) =>
    request<Driver>(`/drivers/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: string) =>
    request<void>(`/drivers/${id}`, { method: "DELETE" }),
};

export interface VehicleDriverAssignment {
  assignmentId: string;
  vehicleCode: string;
  vehicleName: string;
  driverId: string;
  driverName: string;
  startDate: string;
  endDate: string;
  active: boolean;
  remarks: string;
}

export const vehicleDriverAssignmentApi = {
  list: () => request<VehicleDriverAssignment[]>("/vehicle-driver-assignment"),
  get: (id: string) => request<VehicleDriverAssignment>(`/vehicle-driver-assignment/${id}`),
  create: (b: Partial<VehicleDriverAssignment>) =>
    request<VehicleDriverAssignment>("/vehicle-driver-assignment", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: Partial<VehicleDriverAssignment>) =>
    request<VehicleDriverAssignment>(`/vehicle-driver-assignment/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: string) =>
    request<void>(`/vehicle-driver-assignment/${id}`, { method: "DELETE" }),
};

export interface SyncStatus {
  objectCode: string;
  objectName: string;
  x3Count: number;
  postgresCount: number;
  differenceCount: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "RUNNING" | string;
  lastSyncTime: string;
}

export interface SyncLog {
  syncId: string;
  objectCode: string;
  startedAt: string;
  completedAt: string;
  x3Count: number;
  postgresBeforeCount: number;
  postgresAfterCount: number;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
  status: string;
  errorMessage: string | null;
}

export const syncApi = {
  status: () => syncRequest<SyncStatus[]>("/sync/status"),
  sync: (objectCode: string) => syncRequest<any>(`/sync/${objectCode}`, { method: "POST" }),
  syncAll: () => syncRequest<any>("/sync/all", { method: "POST" }),
  logs: (objectCode: string) => syncRequest<SyncLog[]>(`/sync/logs/${objectCode}`),
};

export interface Site {
  siteCode: string;
  siteName: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  tmsFlag: boolean;
  workingStartTime?: string | null;
  workingEndTime?: string | null;
  loadingDockCount?: number | null;
  maxVehicleCapacity?: number | null;
  remarks?: string | null;
  updatedBy?: string | null;
}

export interface SiteUpdatePayload {
  latitude?: number | null;
  longitude?: number | null;
  workingStartTime?: string | null;
  workingEndTime?: string | null;
  loadingDockCount?: number | null;
  maxVehicleCapacity?: number | null;
  tmsFlag?: boolean;
  remarks?: string | null;
  updatedBy?: string | null;
}

export const siteApi = {
  list: () => syncRequest<Site[]>("/sites"),
  update: (code: string, b: SiteUpdatePayload) =>
    syncRequest<Site>(`/sites/${code}`, { method: "PUT", body: JSON.stringify(b) }),
};
