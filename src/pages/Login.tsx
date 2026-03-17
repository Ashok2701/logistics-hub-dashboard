import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, User, Route, AlertCircle, Eye, EyeOff, Truck, Smartphone, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import loginBg from "@/assets/login-bg.jpg";

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
    <div className="min-h-screen w-full flex">
      {/* Left: Background image */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src={loginBg}
          alt="Fleet tracking map"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/40" />

        {/* Overlay branding */}
        <motion.div
          className="relative z-10 flex flex-col justify-end p-10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 max-w-sm border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/80 flex items-center justify-center">
                <Route className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">Route Planner</h2>
                <p className="text-white/50 text-[10px] uppercase tracking-widest">Sage Intacct</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/60 text-xs">
              <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Fleet</span>
              <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Tracking</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right: Login form panel */}
      <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col items-center justify-center bg-background px-8 py-12 relative">
        {/* Mobile-only background */}
        <img
          src={loginBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover lg:hidden"
        />
        <div className="absolute inset-0 bg-background/95 lg:hidden" />

        <motion.div
          className="relative z-10 w-full max-w-[360px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo & Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Route className="w-5.5 h-5.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Route Planner</h1>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Transport Management System</p>
            </div>
          </div>

          {/* Welcome */}
          <motion.div
            className="mb-7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to manage your fleet operations.</p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm mb-5"
              >
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span className="text-destructive text-[13px]">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Username</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., admin"
                  autoFocus
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all text-sm"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-11 pl-10 pr-11 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <button type="button" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  Forgot Password?
                </button>
              </div>
            </motion.div>

            {/* Sign In */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary/20 uppercase tracking-wide"
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
            className="text-xs text-muted-foreground text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            Demo: <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">admin</code> / <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">admin</code>
          </motion.p>
        </motion.div>

        {/* Copyright */}
        <p className="relative z-10 text-[11px] text-muted-foreground text-center mt-auto pt-8">
          © 2026 Route Planner for Sage Intacct. All rights reserved.
        </p>
      </div>
    </div>
  );
}
