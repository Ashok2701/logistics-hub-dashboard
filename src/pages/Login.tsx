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
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background map */}
      <img
        src={loginBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Login Card */}
      <motion.div
        className="relative z-10 w-full max-w-[420px] mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Branded header strip */}
        <div className="bg-primary/80 backdrop-blur-md rounded-t-xl px-6 py-5 flex items-center gap-3 border border-white/10">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Route className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground tracking-tight">Route Planner</h1>
            <p className="text-[11px] text-primary-foreground/70 uppercase tracking-wider font-medium">Transport Management System</p>
          </div>
        </div>

        {/* Glass card body */}
        <div className="backdrop-blur-xl bg-white/15 rounded-b-xl px-8 py-8 shadow-2xl shadow-black/30 border border-white/20 border-t-0">
          {/* Welcome text */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-bold text-white">Welcome Back!</h2>
            <p className="text-sm text-white/60 mt-1">Sign in to manage your fleet.</p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-sm mb-5"
              >
                <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
                <span className="text-red-200 text-[13px]">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <label className="text-sm font-semibold text-white/80 mb-1.5 block">Username</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary-foreground transition-colors" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., admin"
                  autoFocus
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="text-sm font-semibold text-white/80 mb-1.5 block">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary-foreground transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-11 pl-10 pr-11 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <button type="button" className="text-xs text-white/50 hover:text-white/80 font-medium transition-colors">
                  Forgot Password?
                </button>
              </div>
            </motion.div>

            {/* Sign In Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary/30 uppercase tracking-wide"
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
            className="text-xs text-white/40 text-center mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Demo: <code className="font-mono text-primary-foreground bg-white/10 px-1.5 py-0.5 rounded">admin</code> / <code className="font-mono text-primary-foreground bg-white/10 px-1.5 py-0.5 rounded">admin</code>
          </motion.p>
        </div>
      </motion.div>

      {/* Footer features */}
      <motion.div
        className="relative z-10 flex items-center gap-6 mt-6 text-white/80 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Fleet Management</span>
        <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile App</span>
        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Live Tracking</span>
      </motion.div>

      {/* Copyright */}
      <p className="relative z-10 text-[11px] text-white/50 text-center mt-3">
        © 2026 Route Planner for Sage Intacct. All rights reserved.
      </p>
    </div>
  );
}
