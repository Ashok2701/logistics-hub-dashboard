// Frontend-only mock store for Roles + per-user role assignment.
// Persists to localStorage and exposes a tiny pub/sub.

export interface Role {
  id: string;
  name: string;
  description: string;
  modules: string[];
  status: "active" | "inactive";
  createdAt: string;
}

// Keep the module keys in sync with UserManagement's MODULES list.
export const ROLE_MODULES = [
  { key: "route_planner", label: "Route Planner" },
  { key: "scheduler", label: "Scheduler" },
  { key: "calendar", label: "Calendar" },
  { key: "map_view", label: "Map View" },
  { key: "fleet_mgmt", label: "Fleet Management" },
  { key: "reports", label: "Reports" },
  { key: "user_mgmt", label: "User Management" },
  { key: "add_pick_ticket", label: "Add Pick Ticket" },
  { key: "remove_pick_ticket", label: "Remove Pick Ticket" },
];

const ROLES_KEY = "rp-roles";
const USER_ROLE_MAP_KEY = "rp-user-role-map";

const SEED: Role[] = [
  {
    id: "role-admin",
    name: "Administrator",
    description: "Full access to every module",
    modules: ROLE_MODULES.map((m) => m.key),
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "role-dispatcher",
    name: "Dispatcher",
    description: "Plans routes and manages pick tickets",
    modules: ["route_planner", "scheduler", "calendar", "map_view", "add_pick_ticket", "remove_pick_ticket"],
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "role-fleet-manager",
    name: "Fleet Manager",
    description: "Manages vehicles, drivers and trailers",
    modules: ["fleet_mgmt", "map_view", "reports"],
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "role-viewer",
    name: "Reports Viewer",
    description: "Read-only access to reports & calendar",
    modules: ["reports", "calendar", "map_view"],
    status: "active",
    createdAt: new Date().toISOString(),
  },
];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
}

// ─── Roles ──────────────────────────────────────────────────────
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function subscribeRoles(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getRoles(): Role[] {
  const existing = read<Role[] | null>(ROLES_KEY, null);
  if (!existing || existing.length === 0) {
    write(ROLES_KEY, SEED);
    return SEED;
  }
  return existing;
}

export function saveRoles(roles: Role[]) {
  write(ROLES_KEY, roles);
  notify();
}

export function upsertRole(role: Role) {
  const all = getRoles();
  const idx = all.findIndex((r) => r.id === role.id);
  if (idx >= 0) all[idx] = role; else all.push(role);
  saveRoles(all);
}

export function deleteRole(id: string) {
  saveRoles(getRoles().filter((r) => r.id !== id));
}

// ─── User → Role mapping (mock, per-username) ───────────────────
type UserRoleMap = Record<string, string>; // username → roleId

export function getUserRoleMap(): UserRoleMap {
  return read<UserRoleMap>(USER_ROLE_MAP_KEY, {});
}

export function getUserRoleId(username: string): string | undefined {
  return getUserRoleMap()[username];
}

export function setUserRoleId(username: string, roleId: string) {
  const map = getUserRoleMap();
  map[username] = roleId;
  write(USER_ROLE_MAP_KEY, map);
}

export function getRoleById(id: string | undefined): Role | undefined {
  if (!id) return undefined;
  return getRoles().find((r) => r.id === id);
}
