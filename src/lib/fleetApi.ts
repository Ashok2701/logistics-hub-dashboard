// Fleet module API client
const API_BASE =
  (import.meta as any).env?.VITE_FLEET_API_BASE ?? "https://tmssolutions.tema-systems.com:8040/api";

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
