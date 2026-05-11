import { createContext, useContext, useState, type ReactNode } from "react";

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
    };

    localStorage.setItem("vanguard-user", JSON.stringify(userData));
    localStorage.setItem("vanguard-token", accessToken);
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
