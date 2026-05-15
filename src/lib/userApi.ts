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

// Backend module flag ↔ UI module key
export const MODULE_FLAG_MAP: Record<string, string> = {
  route_planner: "routeplannerflg",
  scheduler: "schedulerflg",
  calendar: "calendarrpflg",
  map_view: "mapviewrpflg",
  fleet_mgmt: "fleetmgmtflg",
  reports: "screportsflg",
  user_mgmt: "usermgmtflg",
  add_pick_ticket: "addPickTcktflg",
  remove_pick_ticket: "removePickTcktflg",
};

export function mapApiUser(r: any): ApiUser {
  const username = r.username ?? r.xlogin ?? r.login ?? "";
  const active =
    r.xact === true || r.status === "active" || r.active === true || r.isActive === true;
  const modules: string[] = [];
  for (const [uiKey, flag] of Object.entries(MODULE_FLAG_MAP)) {
    if (r[flag] === true) modules.push(uiKey);
  }
  const sites: string[] = Array.isArray(r.alignedSites)
    ? r.alignedSites.map((s: any) => (typeof s === "string" ? s : s?.siteId ?? s?.name ?? String(s)))
    : Array.isArray(r.sites) ? r.sites : [];
  return {
    id: String(r.auuid ?? r.id ?? r.xid ?? username),
    username,
    fullName: r.xusrname ?? r.fullName ?? r.xfullnam ?? r.name ?? "",
    email: r.email ?? r.xemail ?? "",
    mobile: r.phone ?? r.mobile ?? r.tel ?? r.xmobile ?? "",
    status: active ? "active" : "inactive",
    modules,
    sites,
    defaultSite: r.defaultSite ?? r.xdefsite ?? sites[0] ?? "",
    primaryLanguage: r.lngmain ?? r.primaryLanguage ?? r.xprilang ?? "English",
    secondaryLanguage: r.lansec ?? r.secondaryLanguage ?? r.xseclang ?? "",
    raw: r,
  };
}

// Build backend payload from UI form
export function buildApiPayload(form: {
  username: string;
  fullName: string;
  email: string;
  mobile: string;
  password?: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  modules: string[];
  sites: string[];
  defaultSite: string;
  status: boolean;
}): Record<string, any> {
  const payload: Record<string, any> = {
    username: form.username.trim(),
    xusrname: form.fullName,
    email: form.email,
    phone: form.mobile,
    xact: form.status,
    lngmain: form.primaryLanguage,
    lansec: form.secondaryLanguage,
    alignedSites: form.sites,
  };
  if (form.password) payload.password = form.password;
  for (const [uiKey, flag] of Object.entries(MODULE_FLAG_MAP)) {
    payload[flag] = form.modules.includes(uiKey);
  }
  return payload;
}
