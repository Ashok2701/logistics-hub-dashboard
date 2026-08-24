// Reason Configuration API client
const API_BASE =
  (import.meta as any).env?.VITE_REASON_CONFIG_API_BASE ?? "https://tmssolutions.tema-systems.com:8040/api";

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

export type ReasonType = "RESCHEDULE" | "CANCEL" | "SKIP" | "PARTIAL_DELIVERY";

export const REASON_TYPES: { value: ReasonType; label: string }[] = [
  { value: "RESCHEDULE", label: "Reschedule" },
  { value: "CANCEL", label: "Cancel" },
  { value: "SKIP", label: "Skip" },
  { value: "PARTIAL_DELIVERY", label: "Partial Delivery" },
];

// Backend DTO
export interface ReasonDTO {
  reasonId: string;
  reasonDescription: string | null;
  reasonType: string | null;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// UI-friendly shape
export interface Reason {
  id: string;
  description: string;
  type: ReasonType | "";
  active: boolean;
}

const fromDto = (d: ReasonDTO): Reason => ({
  id: d.reasonId,
  description: d.reasonDescription ?? "",
  type: (d.reasonType as ReasonType) ?? "",
  active: d.active ?? true,
});

const toDto = (c: Partial<Reason>): Partial<ReasonDTO> => ({
  ...(c.description !== undefined ? { reasonDescription: c.description || null } : {}),
  ...(c.type !== undefined ? { reasonType: c.type || null } : {}),
  ...(c.active !== undefined ? { active: c.active } : {}),
});

export const reasonConfigApi = {
  list: async () => (await request<ReasonDTO[]>("/reason-config")).map(fromDto),
  listActive: async () => (await request<ReasonDTO[]>("/reason-config/active")).map(fromDto),
  listByType: async (type: string) =>
    (await request<ReasonDTO[]>(`/reason-config/by-type/${encodeURIComponent(type)}`)).map(fromDto),
  get: async (id: string) => fromDto(await request<ReasonDTO>(`/reason-config/${id}`)),
  create: async (b: Partial<Reason>) =>
    fromDto(await request<ReasonDTO>("/reason-config", { method: "POST", body: JSON.stringify(toDto(b)) })),
  update: async (id: string, b: Partial<Reason>) =>
    fromDto(await request<ReasonDTO>(`/reason-config/${id}`, { method: "PUT", body: JSON.stringify(toDto(b)) })),
  toggleActive: async (id: string) =>
    fromDto(await request<ReasonDTO>(`/reason-config/${id}/toggle-active`, { method: "PATCH" })),
  remove: (id: string) => request<void>(`/reason-config/${id}`, { method: "DELETE" }),
};
