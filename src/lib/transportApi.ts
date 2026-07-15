// Transport module API client
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

export interface ApiSite {
  id: string;
  code: string;
  name: string;
  description: string;
  raw?: any;
}

export function mapApiSite(r: any): ApiSite {
  const code = r.fcy ?? r.code ?? r.siteCode ?? r.siteId ?? r.xcode ?? r.xsiteid ?? r.id ?? "";
  const description =
    r.fcynam ?? r.description ?? r.siteName ?? r.name ?? r.xdesc ?? r.xname ?? "";
  return {
    id: String(r.id ?? r.auuid ?? r.xid ?? r.fcyNumber ?? code),
    code: String(code),
    name: String(code),
    description: String(description),
    raw: r,
  };
}

export const transportApi = {
  listSites: async (): Promise<ApiSite[]> => {
    const data = await request<any>("/transport/sites");
    const arr = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.sites)
      ? data.sites
      : Array.isArray(data?.result)
      ? data.result
      : [];
    return arr.map(mapApiSite);
  },

  // ── VR (X3 XX10CPLANCHA) header + details ─────────────────
  getVrHeader: async (vrcode: string): Promise<any | null> => {
    const data = await request<any>(`/transport/vr?vrcode=${encodeURIComponent(vrcode)}`);
    if (!data) return null;
    if (Array.isArray(data)) return data[0] ?? null;
    if (Array.isArray(data?.data)) return data.data[0] ?? null;
    if (data?.data && typeof data.data === "object") return data.data;
    return data;
  },

  getVrDetails: async (vrcode: string): Promise<any[]> => {
    const data = await request<any>(`/transport/vrdetails?vrcode=${encodeURIComponent(vrcode)}`);
    const arr = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.details)
      ? data.details
      : Array.isArray(data?.result)
      ? data.result
      : [];
    return arr;
  },

  getVrLoadStock: async (vrcode: string): Promise<any[]> => {
    const data = await request<any>(`/transport/loadvehstk?vrcode=${encodeURIComponent(vrcode)}`);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.stock)) return data.stock;
    if (Array.isArray(data?.result)) return data.result;
    // Backend may return a single object for one stock row — normalise to array
    if (data && typeof data === "object") {
      const hasFields =
        data.vcrnum !== undefined ||
        data.VCRNUM_0 !== undefined ||
        data.xvrsel !== undefined ||
        data.xnum !== undefined ||
        data.lvsnum !== undefined;
      if (hasFields) return [data];
    }
    return [];
  },
};
