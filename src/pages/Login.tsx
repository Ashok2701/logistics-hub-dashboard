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
      {/* Left: Background image — 70% */}
      <div className="hidden lg:flex lg:w-[70%] relative overflow-hidden">
        <img
          src={loginBg}
          alt="Fleet tracking map"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/30" />
      </div>

      {/* Right: Login form panel — 30% */}
      <div className="w-full lg:w-[30%] min-w-[340px] flex flex-col items-center justify-center bg-background px-6 py-10 relative">
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
          {/* Branding card like reference */}
          <div className="bg-muted/60 rounded-xl p-4 mb-7 border border-border">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <Route className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground tracking-tight">Route Planner</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Sage Intacct</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-xs">
              <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Fleet</span>
              <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Tracking</span>
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
