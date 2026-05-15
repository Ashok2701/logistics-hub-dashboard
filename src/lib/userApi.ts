// User module API client
// Backend: http://tmssolutions.tema-systems.com:8082/api/v1/user

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

// ─── Endpoints ─────────────────────────────────────────────────────
export const userApi = {
  login: (username: string, password: string) =>
    request("/user/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  logout: () => request("/user/logout", { method: "POST" }),

  create: (payload: Record<string, any>) =>
    request("/user/create", { method: "POST", body: JSON.stringify(payload) }),

  list: () => request<any[]>("/user/list"),

  getUsers: () => request<any[]>("/user/getusers"),

  getByLogin: (xlogin: string) => request(`/user/${encodeURIComponent(xlogin)}`),

  update: (xlogin: string, payload: Record<string, any>) =>
    request(`/user/update/${encodeURIComponent(xlogin)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  remove: (xlogin: string) =>
    request(`/user/delete/${encodeURIComponent(xlogin)}`, { method: "DELETE" }),
};

// ─── Mapper: backend record → UI User shape ───────────────────────
export interface ApiUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  mobile: string;
  status: "active" | "inactive";
  modules: string[];
  sites: string[];
  defaultSite: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  raw?: any;
}

export function mapApiUser(r: any): ApiUser {
  const username = r.username ?? r.xlogin ?? r.login ?? "";
  const active =
    r.status === "active" || r.xact === true || r.active === true || r.isActive === true;
  return {
    id: String(r.id ?? r.xid ?? username),
    username,
    fullName: r.fullName ?? r.xfullnam ?? r.xfullname ?? r.name ?? "",
    email: r.email ?? r.xemail ?? "",
    mobile: r.mobile ?? r.xmobile ?? r.phone ?? "",
    status: active ? "active" : "inactive",
    modules: Array.isArray(r.modules) ? r.modules : [],
    sites: Array.isArray(r.sites) ? r.sites : [],
    defaultSite: r.defaultSite ?? r.xdefsite ?? "",
    primaryLanguage: r.primaryLanguage ?? r.xprilang ?? "English",
    secondaryLanguage: r.secondaryLanguage ?? r.xseclang ?? "",
    raw: r,
  };
}
