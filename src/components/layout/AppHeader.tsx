import { Bell, Search, Sun, Moon, LogOut, User, Command } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-[60px] border-b border-[hsl(220,13%,91%)] bg-white/90 backdrop-blur-xl flex items-center justify-between px-5 flex-shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search anything..."
            className="w-72 h-9 pl-10 pr-12 rounded-lg bg-[hsl(220,14%,96%)] border border-transparent text-sm text-[hsl(222,47%,11%)] placeholder:text-[hsl(220,9%,46%)] focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono border border-border">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </motion.div>
        </button>

        {/* Notifications */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all relative">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full gradient-primary ring-2 ring-card" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-2" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            {user && (
              <>
                <p className="text-sm font-medium text-foreground leading-tight">{user.username}</p>
                <p className="text-[11px] text-muted-foreground leading-tight capitalize">{user.role}</p>
              </>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
