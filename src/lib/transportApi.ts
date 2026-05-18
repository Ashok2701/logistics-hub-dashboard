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
  const code = r.code ?? r.siteCode ?? r.siteId ?? r.xcode ?? r.xsiteid ?? r.id ?? "";
  const description =
    r.description ?? r.siteName ?? r.name ?? r.xdesc ?? r.xname ?? "";
  return {
    id: String(r.id ?? r.auuid ?? r.xid ?? code),
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
};
