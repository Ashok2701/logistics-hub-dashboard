import { createContext, useContext, useState, type ReactNode } from "react";

const API_BASE = "https://tmssolutions.tema-systems.com:8040/api/v1";

// ── Unified auth: single table for everything ──────────────────────
// Login now goes through /api/v1/auth/login (XRAuthService/XRAuthController
// on the backend), which authenticates against the SAME xr_users table
// used by the Users/Roles/Modules/User Types management pages (and their
// role -> module assignments) — replacing the old /api/v1/user/login,
// which checked a completely separate, disconnected legacy user table.
// A user created via the Users page can now actually log in, and the
// role's assigned modules come back directly in the login response
// (no separate lookup needed), which is what drives the sidebar filter.

export interface PermissionEntry {
  moduleCode: string;
  moduleName: string;
  menuPath: string | null;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AuthUser {
  username: string;
  fullName?: string;
  role: string;        // role NAME (e.g. "Admin") — display only, same as before
  userType?: string;
  sites?: string[];
  accessToken?: string;
  permissions: PermissionEntry[];
  /** menuPath values the user's role has view access to — drives which
   *  sidebar sections/items are shown. Derived directly from
   *  `permissions` above (canView === true), no extra round trip. */
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
      res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch (e) {
      throw new Error("Cannot reach server. Check network or CORS settings.");
    }

    if (!res.ok) {
      // XRAuthServiceImpl throws for "User not found" / "Password is
      // wrong" / "User is inactive" — surfaced here as a proper HTTP 400
      // with a message, unlike the old system which could return 200
      // with xact:false for the same cases.
      let msg = `Login failed (${res.status})`;
      try {
        const err = await res.json();
        msg = err.message || err.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const data = await res.json();
    if (!data.accessToken) {
      throw new Error(data.message || "Invalid credentials");
    }

    const permissions: PermissionEntry[] = Array.isArray(data.permissions) ? data.permissions : [];
    const accessibleMenuPaths = permissions
      .filter((p) => p.canView && p.menuPath)
      .map((p) => p.menuPath as string);

    const userData: AuthUser = {
      username: data.username || username,
      fullName: data.fullName,
      role: data.role || "user",
      userType: data.userType,
      sites: Array.isArray(data.sites) ? data.sites : [],
      accessToken: data.accessToken,
      permissions,
      accessibleMenuPaths,
    };

    localStorage.setItem("vanguard-user", JSON.stringify(userData));
    localStorage.setItem("vanguard-token", data.accessToken);
    setUser(userData);
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
