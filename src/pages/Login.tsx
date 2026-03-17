import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, User, Route, AlertCircle, Eye, EyeOff, Truck, Smartphone, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import loginHero from "@/assets/login-hero.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left: Hero image */}
      <div className="hidden lg:block lg:w-[60%] xl:w-[65%] relative overflow-hidden">
        <img
          src={loginHero}
          alt="Fleet logistics tracking map"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(222,47%,6%)]/60 via-[hsl(222,47%,6%)]/30 to-[hsl(222,47%,6%)]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,6%)]/50 to-transparent" />

        {/* Overlay branding */}
        <div className="absolute bottom-10 left-10 right-10 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="text-white text-2xl font-bold tracking-tight mb-2">
              Fleet Intelligence, Simplified.
            </h2>
            <p className="text-white/60 text-sm max-w-md">
              Real-time tracking, route optimization, and fleet management — all in one platform.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right: Login panel */}
      <div className="w-full lg:w-[40%] xl:w-[35%] flex flex-col items-center justify-center px-6 sm:px-10 py-10 relative">
        {/* Mobile background */}
        <img src={loginHero} alt="" className="absolute inset-0 w-full h-full object-cover lg:hidden" />
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm lg:hidden" />

        <motion.div
          className="relative z-10 w-full max-w-[380px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Brand header */}
          <div className="bg-card rounded-2xl p-5 mb-8 border border-border/60 shadow-premium">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <Route className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold text-foreground tracking-tight leading-tight">Route Planner</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mt-0.5">Sage Intacct</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-muted-foreground text-xs pt-1 border-t border-border/50">
              <span className="flex items-center gap-1.5 pt-2.5"><Truck className="w-3.5 h-3.5" /> Fleet</span>
              <span className="flex items-center gap-1.5 pt-2.5"><Smartphone className="w-3.5 h-3.5" /> Mobile</span>
              <span className="flex items-center gap-1.5 pt-2.5"><MapPin className="w-3.5 h-3.5" /> Tracking</span>
            </div>
          </div>

          {/* Welcome */}
          <motion.div className="mb-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <h2 className="text-[26px] font-bold text-foreground tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Sign in to manage your fleet operations.</p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/8 border border-destructive/15 text-sm mb-5"
              >
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span className="text-destructive text-[13px]">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <label className="text-sm font-semibold text-foreground mb-2 block">Username</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-200" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., admin"
                  autoFocus
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-card transition-all duration-200 text-sm"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <label className="text-sm font-semibold text-foreground mb-2 block">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-200" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-12 pl-11 pr-12 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-card transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all duration-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <button type="button" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors duration-200">
                  Forgot Password?
                </button>
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  "Log In"
                )}
              </button>
            </motion.div>
          </form>

          {/* Demo credentials */}
          <motion.p
            className="text-xs text-muted-foreground text-center mt-7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            Demo:{" "}
            <code className="font-mono text-primary bg-primary/8 px-1.5 py-0.5 rounded-md text-[11px] font-semibold">admin</code>
            {" / "}
            <code className="font-mono text-primary bg-primary/8 px-1.5 py-0.5 rounded-md text-[11px] font-semibold">admin</code>
          </motion.p>
        </motion.div>

        {/* Footer */}
        <p className="relative z-10 text-[11px] text-muted-foreground/60 text-center mt-auto pt-8">
          © 2026 Route Planner for Sage Intacct. All rights reserved.
        </p>
      </div>
    </div>
  );
}
