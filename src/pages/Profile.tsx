import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, UserCircle, Shield, Check, Mail, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const enabledPermissions = user.permissions
    ? Object.entries(user.permissions).filter(([, v]) => v).map(([k]) => k)
    : [];

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
            <p className="text-sm text-white/70 capitalize">{user.role}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Account Details</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <DetailRow icon={Mail} label="Username" value={user.username} />
              {user.xusrname && <DetailRow icon={UserCircle} label="Display Name" value={user.xusrname} />}
              <DetailRow icon={Shield} label="Role" value={user.role} capitalize />
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="w-4 h-4" />
                  <span className="text-xs font-medium">Status</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.xact !== false ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {user.xact !== false ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {enabledPermissions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {enabledPermissions.map((p) => (
                  <span key={p} className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                    {p.replace(/flg$/, "")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
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
