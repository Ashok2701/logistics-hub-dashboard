// Document Configuration API client
const API_BASE =
  (import.meta as any).env?.VITE_DOCUMENT_CONFIG_API_BASE ?? "https://tmssolutions.tema-systems.com:8040/api";

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
export interface DocumentConfigDTO {
  documentId: string;
  documentName: string;
  documentType: string;
  displayNameEn: string | null;
  displayNameFr: string | null;
  colorCode: string | null;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// UI-friendly shape
export interface DocumentConfig {
  id: string;
  document: string;
  docType: string;
  labelEng: string;
  labelFra: string;
  color: string;
  active: boolean;
}

const fromDto = (d: DocumentConfigDTO): DocumentConfig => ({
  id: d.documentId,
  document: d.documentName ?? "",
  docType: d.documentType ?? "",
  labelEng: d.displayNameEn ?? "",
  labelFra: d.displayNameFr ?? "",
  color: d.colorCode ?? "",
  active: d.active ?? true,
});

const toDto = (c: Partial<DocumentConfig>): Partial<DocumentConfigDTO> => ({
  ...(c.document !== undefined ? { documentName: c.document } : {}),
  ...(c.docType !== undefined ? { documentType: c.docType } : {}),
  ...(c.labelEng !== undefined ? { displayNameEn: c.labelEng || null } : {}),
  ...(c.labelFra !== undefined ? { displayNameFr: c.labelFra || null } : {}),
  ...(c.color !== undefined ? { colorCode: c.color || null } : {}),
  ...(c.active !== undefined ? { active: c.active } : {}),
});

export const documentConfigApi = {
  list: async () => (await request<DocumentConfigDTO[]>("/document-config")).map(fromDto),
  listActive: async () => (await request<DocumentConfigDTO[]>("/document-config/active")).map(fromDto),
  listByType: async (type: string) =>
    (await request<DocumentConfigDTO[]>(`/document-config/by-type/${encodeURIComponent(type)}`)).map(fromDto),
  get: async (id: string) => fromDto(await request<DocumentConfigDTO>(`/document-config/${id}`)),
  create: async (b: Partial<DocumentConfig>) =>
    fromDto(await request<DocumentConfigDTO>("/document-config", { method: "POST", body: JSON.stringify(toDto(b)) })),
  update: async (id: string, b: Partial<DocumentConfig>) =>
    fromDto(await request<DocumentConfigDTO>(`/document-config/${id}`, { method: "PUT", body: JSON.stringify(toDto(b)) })),
  toggleActive: async (id: string) =>
    fromDto(await request<DocumentConfigDTO>(`/document-config/${id}/toggle-active`, { method: "PATCH" })),
  remove: (id: string) => request<void>(`/document-config/${id}`, { method: "DELETE" }),
};
