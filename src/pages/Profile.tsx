import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, UserCircle, Shield, Check, Mail, Phone, ArrowLeft, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { siteApi, type Site } from "@/lib/fleetApi";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Resolved client-side rather than changing the login response's
  // `sites` shape (currently just site codes, e.g. ["11001"]) - this
  // keeps the fix isolated to this one page instead of touching
  // whatever else might read AuthUser.sites.
  useEffect(() => {
    siteApi.list().then(setSites).catch(() => {});
  }, []);

  if (!user) return null;

  // Modules the user's role can view — from the new unified login
  // response, replacing the old flat xxxflg permission object.
  const viewableModules = (user.permissions ?? []).filter((p) => p.canView);

  const siteLabel = (code: string) => {
    const s = sites.find((x) => x.siteCode === code);
    return s ? `${s.siteCode} — ${s.siteName}` : code;
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="bg-gradient-header p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border-2 border-white/30">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{user.username}</h1>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">User Details</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <DetailRow icon={Mail} label="Username" value={user.username} />
              {user.fullName && <DetailRow icon={UserCircle} label="Full Name" value={user.fullName} />}
              <DetailRow icon={Shield} label="Role" value={user.role} capitalize />
              {user.userType && <DetailRow icon={Shield} label="User Type" value={user.userType} capitalize />}
              {user.email && <DetailRow icon={Mail} label="Email" value={user.email} />}
              {user.mobileNo && <DetailRow icon={Phone} label="Mobile Number" value={user.mobileNo} />}
              {user.sites && user.sites.length > 0 && (
                <DetailRow icon={MapPin} label="Assigned Sites" value={user.sites.map(siteLabel).join(", ")} />
              )}
            </div>
          </div>

          {viewableModules.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Assigned Modules</p>
              <div className="flex flex-wrap gap-1.5">
                {viewableModules.map((m) => (
                  <span key={m.moduleCode} className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                    {m.moduleName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="text-sm font-medium text-destructive hover:underline"
            >
              Log out
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-semibold text-foreground mb-1">Log out</p>
              <p className="text-sm text-muted-foreground mb-5">Are you sure you want to log out of the application?</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="h-9 px-4 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, capitalize }: { icon: any; label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={`text-sm font-medium text-foreground ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}

