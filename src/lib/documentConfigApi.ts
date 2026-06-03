// Document Configuration API client
const API_BASE =
  (import.meta as any).env?.VITE_DOCUMENT_CONFIG_API_BASE ?? "https://localhost:8082/api";

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

export interface DocumentConfig {
  id: number;
  document: string;
  docType: string;
  labelEng: string;
  labelFra: string;
  color: string;
}

export const documentConfigApi = {
  list: () => request<DocumentConfig[]>("/document-config"),
  get: (id: number | string) => request<DocumentConfig>(`/document-config/${id}`),
  create: (b: Partial<DocumentConfig>) =>
    request<DocumentConfig>("/document-config", { method: "POST", body: JSON.stringify(b) }),
  update: (id: number | string, b: Partial<DocumentConfig>) =>
    request<DocumentConfig>(`/document-config/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: number | string) =>
    request<void>(`/document-config/${id}`, { method: "DELETE" }),
};
