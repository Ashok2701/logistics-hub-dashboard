// Load Bay Configuration API client
const API_BASE =
  (import.meta as any).env?.VITE_LOADBAY_CONFIG_API_BASE ?? "https://tmssolutions.tema-systems.com:8040/api";

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
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// Backend DTO
export interface LoadBayDTO {
  loadbayId: string;
  loadbayDesc: string | null;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// UI-friendly shape
export interface LoadBay {
  id: string;
  description: string;
  active: boolean;
}

const fromDto = (d: LoadBayDTO): LoadBay => ({
  id: d.loadbayId,
  description: d.loadbayDesc ?? "",
  active: d.active ?? true,
});

const toDto = (c: Partial<LoadBay>): Partial<LoadBayDTO> => ({
  ...(c.description !== undefined ? { loadbayDesc: c.description || null } : {}),
  ...(c.active !== undefined ? { active: c.active } : {}),
});

export const loadBayConfigApi = {
  list: async () => (await request<LoadBayDTO[]>("/loadbay-config")).map(fromDto),
  listActive: async () => (await request<LoadBayDTO[]>("/loadbay-config/active")).map(fromDto),
  get: async (id: string) => fromDto(await request<LoadBayDTO>(`/loadbay-config/${id}`)),
  create: async (b: Partial<LoadBay>) =>
    fromDto(await request<LoadBayDTO>("/loadbay-config", { method: "POST", body: JSON.stringify(toDto(b)) })),
  update: async (id: string, b: Partial<LoadBay>) =>
    fromDto(await request<LoadBayDTO>(`/loadbay-config/${id}`, { method: "PUT", body: JSON.stringify(toDto(b)) })),
  toggleActive: async (id: string) =>
    fromDto(await request<LoadBayDTO>(`/loadbay-config/${id}/toggle-active`, { method: "PATCH" })),
  remove: (id: string) => request<void>(`/loadbay-config/${id}`, { method: "DELETE" }),
};
