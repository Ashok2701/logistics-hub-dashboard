// Route Planner API client
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ?? "https://tmssolutions.tema-systems.com:8040/api";

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
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────

export interface RpSite {
  siteCode: string;
  siteName: string;
  latitude:  number | null;
  longitude: number | null;
  tmsFlag:   boolean;
  addressLine1: string | null;
  city:         string | null;
  postalCode:   string | null;
  countryCode:  string | null;
}

export interface RpVehicle {
  vehicleCode:          string;
  vehicleName:          string;
  vehicleNumber:        string;
  categoryCode:         string | null;
  categoryDescription:  string | null;
  brand:                string | null;
  model:                string | null;
  vehicleYear:          number | null;
  color:                string | null;
  capacityWeight:       number | null;
  capacityVolume:       number | null;
  volumeUnit:           string | null;
  weightUnit:           string | null;
  vehicleStatus:        number | null;
  driverId:             string | null;
}

export interface RpDriver {
  driverId:        string;
  driverName:      string;
  employeeCode:    string | null;
  mobileNo:        string | null;
  licenseNumber:   string | null;
  licenseType:     number | null;
  driverStatus:    number | null;
  longHaulDriver:  boolean | null;
  allowAllVehicles: boolean | null;
}

export interface RpStop {
  stopType:             string;   // 'DROP' | 'PICKUP'
  docType:              string;   // 'DLV'  | 'PICK'
  docNum:               string;
  movType:              string;
  site:                 string;
  docDate:              string;
  originalDeliveryDate: string | null;
  companyCode:          string | null;
  deliveryStatus:       number | null;
  routeStatus:          string | null;
  priority:             number | null;
  routeCode:            string | null;
  routeCodeDesc:        string | null;
  routeCodeBgColor:     string | null;
  // p — from Postgres
  routeTag:             string | null;
  routeTagFra:          string | null;
  routeColor:           string | null;
  // partner
  bpCode:               string;
  bpName:               string;
  addressCode:          string;
  addressName:          string | null;
  // address
  addLine1:             string | null;
  addLine2:             string | null;
  addLine3:             string | null;
  posCode:              string | null;
  city:                 string | null;
  stateCode:            string | null;
  countryCode:          string | null;
  countryName:          string | null;
  // geo — from Postgres
  latitude:             number | null;
  longitude:            number | null;
  // weight/volume
  nbPack:               number | null;
  netWeight:            number | null;
  weightUnit:           string | null;
  volume:               number | null;
  volumeUnit:           string | null;
  // driver/vehicle
  driverCode:           string | null;
  vehicleCode:          string | null;
  vehiclePlate:         string | null;
  // trip
  tripNo:               string | null;
  vrCode:               string | null;
  vrSeq:                string | null;
  seq:                  number | null;
  dlvMode:              string | null;
  // dep/arv
  depDate:              string | null;
  depTime:              string | null;
  arvDate:              string | null;
  arvTime:              string | null;
  // carrier
  carrier:              string | null;
  carrColor:            string | null;
  docInst:              string | null;
  // p — service/waiting
  serviceTime:          string | null;
  waitingTime:          string | null;
  // p — time windows
  anyTimeWindow:        boolean | null;
  fromTime:             string | null;
  toTime:               string | null;
}

export interface RpResponse {
  siteCode:     string;
  siteName:     string;
  planDate:     string;
  site:         RpSite;
  vehicles:     RpVehicle[];
  drivers:      RpDriver[];
  drops:        RpStop[];
  pickups:      RpStop[];
  vehicleCount: number;
  driverCount:  number;
  dropCount:    number;
  pickupCount:  number;
}

// ── API calls ─────────────────────────────────────────────────

/** GET /api/v1/route-planner/sites — all TMS-enabled sites */
export function fetchTmsSites(): Promise<RpSite[]> {
  return request("/v1/route-planner/sites");
}

/** GET /api/v1/route-planner/load?siteCode=X&planDate=YYYY-MM-DD */
export function loadPlannerData(siteCode: string, planDate: string): Promise<RpResponse> {
  return request(`/v1/route-planner/load?siteCode=${encodeURIComponent(siteCode)}&planDate=${planDate}`);
}
