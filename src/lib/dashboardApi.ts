// Dashboard API client
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ?? "https://tmssolutions.tema-systems.com:8040/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("vanguard-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json", ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export interface KpiMetric {
  value: number;
  vsYesterday: number;
  subtitle: string;
}

export interface FleetStatusDTO {
  onRoad: number;
  idleDepot: number;
  maintenance: number;
  total: number;
  trailers: number;
  drivers: number;
  utilisationPct: number;
}

export interface DriverHoursDTO {
  safe: number;
  caution: number;
  alert: number;
  maxHoursPerDay: number;
  subtitle: string;
}

export interface DashboardResponse {
  activeTrips:     KpiMetric;
  vehiclesOnRoad:  KpiMetric;
  driversOnDuty:   KpiMetric;
  deliveriesToday: KpiMetric;
  fleetStatus:     FleetStatusDTO;
  driverHours:     DriverHoursDTO;
}

/** GET /api/v1/dashboard?site=X&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  (site optional = All sites) */
export function fetchDashboard(site: string | null, startDate: string, endDate?: string): Promise<DashboardResponse> {
  const params = new URLSearchParams();
  if (site) params.set("site", site);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();
  return request<DashboardResponse>(`/v1/dashboard${qs ? `?${qs}` : ""}`);
}

