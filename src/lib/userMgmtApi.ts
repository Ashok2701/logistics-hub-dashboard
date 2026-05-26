// User Management API client
// Backend base: https://tmssolutions.tema-systems.com:8040/api
// Override via VITE_USER_MGMT_API_BASE if needed.

const API_BASE =
  (import.meta as any).env?.VITE_USER_MGMT_API_BASE ?? "https://tmssolutions.tema-systems.com:8040/api";

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

// ─── Types ──────────────────────────────────────────────────────────
export interface UserType {
  userTypeId: string;
  userTypeCode: string;
  userTypeName: string;
  requiresSiteMapping: boolean;
  active: boolean;
}

export interface Role {
  roleId: string;
  roleCode: string;
  roleName: string;
  active: boolean;
}

export interface ModuleItem {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  menuName: string;
  menuPath: string;
  icon: string;
  displayOrder: number;
  active: boolean;
}

export interface RolePermission {
  moduleId: string;
  moduleName?: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface UserRecord {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  mobileNo: string;
  role?: string;
  roleId?: string;
  userType?: string;
  userTypeId?: string;
  sites: string[];
  active: boolean;
}

// ─── User Types ─────────────────────────────────────────────────────
export const userTypesApi = {
  list: () => request<UserType[]>("/user-types"),
  get: (id: string) => request<UserType>(`/user-types/${id}`),
  create: (b: Partial<UserType>) => request<UserType>("/user-types", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: Partial<UserType>) => request<UserType>(`/user-types/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: string) => request<void>(`/user-types/${id}`, { method: "DELETE" }),
};

// ─── Roles ──────────────────────────────────────────────────────────
export const rolesApi = {
  list: () => request<Role[]>("/roles"),
  get: (id: string) => request<Role>(`/roles/${id}`),
  create: (b: Partial<Role>) => request<Role>("/roles", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: Partial<Role>) => request<Role>(`/roles/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: string) => request<void>(`/roles/${id}`, { method: "DELETE" }),
};

// ─── Modules ────────────────────────────────────────────────────────
export const modulesApi = {
  list: () => request<ModuleItem[]>("/modules"),
  get: (id: string) => request<ModuleItem>(`/modules/${id}`),
  create: (b: Partial<ModuleItem>) => request<ModuleItem>("/modules", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: Partial<ModuleItem>) => request<ModuleItem>(`/modules/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: string) => request<void>(`/modules/${id}`, { method: "DELETE" }),
};

// ─── Role Permissions ──────────────────────────────────────────────
export const roleModulesApi = {
  get: (roleId: string) => request<RolePermission[]>(`/role-modules/${roleId}`),
  save: (roleId: string, body: RolePermission[]) =>
    request<void>(`/role-modules/${roleId}`, { method: "POST", body: JSON.stringify(body) }),
};

// ─── Users ──────────────────────────────────────────────────────────
export const usersApi = {
  list: () => request<UserRecord[]>("/users"),
  get: (id: string) => request<UserRecord>(`/users/${id}`),
  create: (b: Record<string, any>) => request<UserRecord>("/users", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: Record<string, any>) => request<UserRecord>(`/users/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
};
