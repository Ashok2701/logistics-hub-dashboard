import { Bell, Search, LogOut, User, Command, Palette, Check } from "lucide-react";
import { useTheme, COLOR_THEMES, type ColorTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function AppHeader() {
  const { colorTheme, setColorTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-[56px] border-b border-border/50 bg-card/85 backdrop-blur-xl flex items-center justify-between px-6 lg:px-8 flex-shrink-0 sticky top-0 z-20 shadow-soft">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <input
            placeholder="Search..."
            className="w-64 h-9 pl-10 pr-12 rounded-lg bg-muted border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border focus:bg-card transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-card text-[10px] text-muted-foreground font-mono border border-border">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Theme Switcher */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="Change theme"
          >
            <Palette className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showThemePicker && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-elevated p-2 z-50"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">Theme</p>
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setColorTheme(theme.id);
                      setShowThemePicker(false);
                    }}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${
                      colorTheme === theme.id
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: theme.preview }}
                    >
                      {colorTheme === theme.id && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium leading-tight">{theme.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{theme.description}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>

        <div className="w-px h-5 bg-border mx-2" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="hidden sm:block">
            {user && (
              <>
                <p className="text-sm font-medium text-foreground leading-tight">{user.username}</p>
                <p className="text-[10px] text-muted-foreground leading-tight capitalize">{user.role}</p>
              </>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
