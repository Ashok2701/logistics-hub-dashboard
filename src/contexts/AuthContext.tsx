import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; role: string } | null;
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
  const [user, setUser] = useState<{ username: string; role: string } | null>(() => {
    const stored = localStorage.getItem("vanguard-user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username: string, password: string) => {
    // Simulated JWT auth - replace with real API call
    if (!username || !password) throw new Error("Username and password required");
    
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));

    const validUsers: Record<string, { password: string; role: string }> = {
      admin: { password: "admin", role: "admin" },
      Tema: { password: "1234", role: "user" },
    };

    const account = validUsers[username];
    if (account && account.password === password) {
      const userData = { username, role: account.role };
      localStorage.setItem("vanguard-user", JSON.stringify(userData));
      localStorage.setItem("vanguard-token", "simulated-jwt-token");
      setUser(userData);
    } else {
      throw new Error("Invalid credentials. Try admin/admin or Tema/1234");
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
