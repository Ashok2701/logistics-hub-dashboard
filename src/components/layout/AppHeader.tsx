import { Bell, LogOut, User, Palette, Check } from "lucide-react";
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
    <header className="h-[56px] bg-gradient-header backdrop-blur-xl flex items-center justify-between px-6 lg:px-8 flex-shrink-0 sticky top-0 z-20 shadow-[0_1px_3px_rgb(0_0_0/0.1)] border-b border-white/10">
      <div />

      <div className="flex items-center gap-1">
        {/* Theme Switcher */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
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
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
        </button>

        <div className="w-px h-5 bg-white/15 mx-2" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white/80" />
          </div>
          <div className="hidden sm:block">
            {user && (
              <>
                <p className="text-sm font-medium text-white leading-tight">{user.username}</p>
                <p className="text-[10px] text-white/50 leading-tight capitalize">{user.role}</p>
              </>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-red-300 hover:bg-white/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
