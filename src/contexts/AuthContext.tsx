import { createContext, useContext, useState, type ReactNode } from "react";
import { usersApi, rolesApi, modulesApi, roleModulesApi } from "@/lib/userMgmtApi";

const API_BASE = "https://tmssolutions.tema-systems.com:8040/api/v1";

export interface UserPermissions {
  fleetmgmtflg?: boolean;
  routeplannerflg?: boolean;
  schedulerflg?: boolean;
  mapviewrpflg?: boolean;
  calendarrpflg?: boolean;
  screportsflg?: boolean;
  usermgmtflg?: boolean;
  addPicktcktflg?: boolean;
  removePicktcktflg?: boolean;
  [key: string]: boolean | undefined;
}

export interface AuthUser {
  username: string;
  xusrname?: string;
  role: string;
  accessToken?: string;
  xact?: boolean;
  permissions?: UserPermissions;
  /** menuPath values (from Modules) the user's role is assigned, per
   *  RoleModulesPage — drives which sidebar sections/items are shown.
   *  null = couldn't be resolved (e.g. no matching Users record, or the
   *  RBAC tables aren't populated yet) -> sidebar falls back to showing
   *  everything rather than locking the user out entirely. */
  accessibleMenuPaths: string[] | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("vanguard-user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username: string, password: string) => {
    if (!username || !password) throw new Error("Username and password required");

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch (e) {
      throw new Error("Cannot reach server. Check network or CORS settings.");
    }

    if (!res.ok) {
      let msg = `Login failed (${res.status})`;
      try {
        const err = await res.json();
        msg = err.message || err.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const data = await res.json();

    if (!data.accessToken || data.xact === false) {
      throw new Error(data.message || "Invalid credentials");
    }

    const {
      accessToken,
      xusrname,
      xact,
      username: uname,
      ...flags
    } = data;

    const permissions: UserPermissions = {};
    Object.keys(flags).forEach((k) => {
      if (k.endsWith("flg")) permissions[k] = !!flags[k];
    });

    const userData: AuthUser = {
      username: uname || username,
      xusrname,
      role: permissions.usermgmtflg ? "admin" : "user",
      accessToken,
      xact,
      permissions,
      accessibleMenuPaths: null,
    };

    localStorage.setItem("vanguard-user", JSON.stringify(userData));
    localStorage.setItem("vanguard-token", accessToken);
    setUser(userData);

    // Resolve role -> assigned modules for sidebar filtering. Deliberately
    // NOT awaited here — login() returns as soon as the existing flow
    // above finishes, exactly like it always did, so this can't slow down
    // or otherwise change existing login behavior/timing. It updates
    // accessibleMenuPaths asynchronously once it resolves (or leaves it
    // null on any failure — new Users record doesn't exist for this login
    // yet, RBAC tables not populated, etc. — and the sidebar falls back
    // to showing everything rather than locking someone out because the
    // new RBAC system isn't fully wired up for their account yet).
    resolveAccessibleMenuPaths(uname || username, userData).catch(() => {});
  };

  async function resolveAccessibleMenuPaths(loginUsername: string, userData: AuthUser) {
    try {
      const users = await usersApi.list();
      const matched = users.find(
        (u) => u.username?.toLowerCase() === loginUsername.toLowerCase(),
      );
      const roleId = matched?.roleId;
      if (roleId) {
        const [perms, modules] = await Promise.all([
          roleModulesApi.get(roleId),
          modulesApi.list(),
        ]);
        const activeModuleIds = new Set(perms.filter((p) => p.canView).map((p) => p.moduleId));
        const menuPaths = modules
          .filter((m) => m.active && activeModuleIds.has(m.moduleId) && m.menuPath)
          .map((m) => m.menuPath);
        const resolved: AuthUser = { ...userData, accessibleMenuPaths: menuPaths };
        localStorage.setItem("vanguard-user", JSON.stringify(resolved));
        setUser(resolved);
      }
    } catch {
      // Leave accessibleMenuPaths null — sidebar shows everything. Not
      // fatal to login either way.
    }
  };

  const logout = () => {
    localStorage.removeItem("vanguard-user");
    localStorage.removeItem("vanguard-token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
