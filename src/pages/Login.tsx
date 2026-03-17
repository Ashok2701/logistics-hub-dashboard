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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Full-screen background */}
      <img
        src={loginHero}
        alt="Fleet logistics background"
        className="absolute inset-0 w-full h-full object-cover scale-105 blur-[2px]"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[hsl(222,47%,6%)]/65" />

      {/* Centered modal card */}
      <motion.div
        className="relative z-10 w-full max-w-[420px] mx-4"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="bg-card rounded-2xl p-8 sm:p-9 shadow-[0_25px_60px_-12px_rgb(0_0_0/0.4)] border border-border/30">
          {/* Brand header */}
          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Route className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground tracking-tight leading-tight">Route Planner</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mt-0.5">Sage Intacct</p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-muted-foreground text-xs mb-8 pb-0 pt-2.5 border-t border-border/40 mt-3">
            <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Fleet</span>
            <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Tracking</span>
          </div>

          {/* Welcome */}
          <h2 className="text-[26px] font-bold text-foreground tracking-tight">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-7">Sign in to manage your fleet operations.</p>

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
            <div>
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
            </div>

            {/* Password */}
            <div>
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 uppercase tracking-wider"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                "Log In"
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <p className="text-xs text-muted-foreground text-center mt-7">
            Demo:{" "}
            <code className="font-mono text-primary bg-primary/8 px-1.5 py-0.5 rounded-md text-[11px] font-semibold">admin</code>
            {" / "}
            <code className="font-mono text-primary bg-primary/8 px-1.5 py-0.5 rounded-md text-[11px] font-semibold">admin</code>
          </p>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-white/40 text-center mt-6">
          © 2026 Route Planner for Sage Intacct. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
