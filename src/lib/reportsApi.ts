// Reports API client
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

export interface VehicleReportRow {
  plate: string;
  trips: number;
  distance: number;
  utilization: number;
}

/** GET /api/v1/reports/vehicles?site=X&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  (site optional = All sites) */
export function fetchVehicleReports(
  site: string | null,
  startDate: string,
  endDate?: string
): Promise<VehicleReportRow[]> {
  const params = new URLSearchParams();
  if (site) params.set("site", site);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();
  return request<VehicleReportRow[]>(`/reports/vehiclereport${qs ? `?${qs}` : ""}`);
}

/**
 * GET /api/reports/live/{name}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&site=X
 * Real trip and document data for the report screens. Leave site out for all sites.
 * name: calendar | pod-tracking | routes | kpi | drivers
 */
export function fetchLiveReport<T = any>(
  name: "calendar" | "pod-tracking" | "routes" | "kpi" | "drivers",
  site: string | null,
  startDate: string,
  endDate: string
): Promise<T> {
  const params = new URLSearchParams({ startDate, endDate });
  if (site) params.set("site", site);
  return request<T>(`/reports/live/${name}?${params.toString()}`);
}
