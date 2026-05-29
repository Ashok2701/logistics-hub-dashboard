import { Bell, LogOut, User, Palette, Check, ChevronDown, UserCircle } from "lucide-react";
import { useTheme, COLOR_THEMES } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function AppHeader() {
  const { colorTheme, setColorTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const enabledPermissions = user?.permissions
    ? Object.entries(user.permissions).filter(([, v]) => v).map(([k]) => k)
    : [];

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

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white/80" />
            </div>
            <div className="hidden sm:block text-left">
              {user && (
                <>
                  <p className="text-sm font-medium text-white leading-tight">{user.username}</p>
                  <p className="text-[10px] text-white/50 leading-tight capitalize">{user.role}</p>
                </>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-elevated p-2 z-50"
              >
                <div className="px-2.5 py-2 border-b border-border mb-1">
                  <p className="text-sm font-semibold text-foreground leading-tight">{user?.username}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight capitalize mt-0.5">{user?.role}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-all duration-150"
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium">Profile</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-all duration-150"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[13px] font-medium">Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>Your account information and permissions</DialogDescription>
          </DialogHeader>
          {user && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <div className="w-14 h-14 rounded-full bg-gradient-header flex items-center justify-center">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{user.username}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-medium">Username</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{user.username}</span>
                </div>
                {user.xusrname && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Display Name</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{user.xusrname}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-medium">Role</span>
                  </div>
                  <span className="text-sm font-medium text-foreground capitalize">{user.role}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-medium">Status</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.xact !== false ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {user.xact !== false ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {enabledPermissions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {enabledPermissions.map((p) => (
                      <span key={p} className="text-[10px] font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">
                        {p.replace(/flg$/, "")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
