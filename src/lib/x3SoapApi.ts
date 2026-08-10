// X3 SOAP module API client
// Calls the backend's X3SoapController (com.transport.tms.X3Soap), which proxies
// Sage X3 SOAP calls server-side. Credentials never reach the browser —
// unlike CBTTL, which called the SOAP endpoint directly from the client.
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

function qs(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, v);
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export const x3SoapApi = {
  /** X10CCONBUT — confirm/validate an LVS in X3 */
  confirmLvs: (lvsNum: string) =>
    request<Record<string, any>>(`/x3/confirm-lvs${qs({ lvsNum })}`, { method: "POST" }),

  /** X1CONFIRM — confirm the route/trip itself in X3 (I_XNUMPC = VR number) */
  confirmRoute: (vrNumber: string) =>
    request<Record<string, any>>(`/x3/confirm-route${qs({ vrNumber })}`, { method: "POST" }),

  /** X10CSTKMTV — Load Truck: move stock onto the vehicle for an LVS (I_XLVSNUM = LVS number) */
  loadTruck: (lvsNum: string) =>
    request<Record<string, any>>(`/x3/load-truck${qs({ lvsNum })}`, { method: "POST" }),

  /** XX10CVTLOC — create/register a vehicle's location in X3
   *  (xfcy = site/facility code, vehLoc = vehicle code). Response
   *  includes o_xstatus ("2" = success) and o_xmess (message). */
  createVehicleLocation: (xfcy: string, vehLoc: string) =>
    request<Record<string, any>>(`/x3/vehicle-location${qs({ xfcy, vehLoc })}`, { method: "POST" }),

  /** X1CROUTDET — route/trip detail */
  getRouteDetail: (vrNum: string) =>
    request<Record<string, any>>(`/x3/route-detail${qs({ vrNum })}`),

  /** X1CALLDET — allocation details */
  getAllocationDetails: (vrNum: string, floctyp = "", tloctyp = "", floc = "", tloc = "") =>
    request<Record<string, any>>(`/x3/allocation-details${qs({ vrNum, floctyp, tloctyp, floc, tloc })}`),

  /** X1CPICALL — submit pick allocation */
  submitAllocation: (pickNum: string) =>
    request<Record<string, any>>(`/x3/submit-allocation${qs({ pickNum })}`, { method: "POST" }),

  /** X1CLOTDET — lot details */
  getLotDetails: (site: string, productNum: string, vrNum: string) =>
    request<Record<string, any>>(`/x3/lot-details${qs({ site, productNum, vrNum })}`),

  /** X1CSTASTO — allocated data by staging locations */
  getAllocatedDataByStagingLocations: (vrNum: string, fromloc = "", toloc = "", floc = "", tloc = "") =>
    request<Record<string, any>>(`/x3/staging-allocation${qs({ vrNum, fromloc, toloc, floc, tloc })}`),

  /** X1CSTALOC — staging locations */
  getStagingLocations: (site: string) =>
    request<Record<string, any>>(`/x3/staging-locations${qs({ site })}`),

  /** X1CLOCSEL — locations by type */
  getLocations: (site: string, floctyp = "", tloctyp = "") =>
    request<Record<string, any>>(`/x3/locations${qs({ site, floctyp, tloctyp })}`),

  /** XPCKTCKDL — delete pick ticket documents */
  deleteDocuments: (docNums: string[]) =>
    request<Record<string, any>>(`/x3/documents`, {
      method: "DELETE",
      body: JSON.stringify(docNums),
    }),
};
