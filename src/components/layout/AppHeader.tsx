import { Bell, Search, LogOut, User, Command, Palette } from "lucide-react";
import { useTheme, COLOR_THEMES } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function AppHeader() {
  const { colorTheme, setColorTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showThemePicker, setShowThemePicker] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-[60px] border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-5 flex-shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search anything..."
            className="w-72 h-9 pl-10 pr-12 rounded-lg bg-secondary border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono border border-border">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Theme picker */}
        <div className="relative">
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <Palette className="w-[18px] h-[18px]" />
          </button>
          <AnimatePresence>
            {showThemePicker && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl p-3 shadow-lg z-50"
              >
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-2.5 text-center">Theme</p>
                <div className="flex items-center gap-2">
                  {COLOR_THEMES.map((t) => {
                    const [h, s, l] = t.hue.split(" ");
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setColorTheme(t.id); setShowThemePicker(false); }}
                        title={t.label}
                        className="group relative"
                      >
                        <span
                          className={`block w-7 h-7 rounded-full border-2 transition-all duration-200 ${
                            colorTheme === t.id
                              ? "border-primary scale-110 shadow-md"
                              : "border-border hover:border-primary/50 hover:scale-105"
                          }`}
                          style={{ background: `hsl(${h}, ${s}, ${l})` }}
                        />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all relative">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
        </button>

        <div className="w-px h-6 bg-border mx-2" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
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
