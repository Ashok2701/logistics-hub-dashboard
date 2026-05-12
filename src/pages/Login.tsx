import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, User, Route, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import logisticsBg from "@/assets/login-logistics-bg.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
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
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-4 py-8">
      {/* Background image */}
      <img
        src={logisticsBg}
        alt="Global logistics network with trucks, forklift, and shipping routes"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Blue tint overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,80%,55%)]/55 via-[hsl(210,85%,45%)]/45 to-[hsl(215,90%,35%)]/65" />

      {/* Decorative blurred blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[420px] h-[420px] rounded-full bg-[hsl(199,89%,60%)]/30 blur-3xl" />
      <div className="absolute bottom-[-15%] right-[-8%] w-[520px] h-[520px] rounded-full bg-[hsl(220,90%,50%)]/35 blur-3xl" />

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[420px] rounded-2xl border border-white/30 bg-white/15 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.45)] p-8 sm:p-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-white/95 flex items-center justify-center shadow-lg">
            <Route className="w-6 h-6 text-[hsl(215,90%,40%)]" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-white/80 tracking-[0.2em] uppercase">Route Planner</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Login</h1>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-300/30 mb-4">
            <AlertCircle className="w-4 h-4 text-red-100 flex-shrink-0" />
            <span className="text-red-50 text-[13px]">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="text-sm font-semibold text-white mb-1.5 block">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,60%,40%)]" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username@company.com"
                autoFocus
                className="w-full h-11 pl-10 pr-3 rounded-lg bg-white/95 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/60 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-white mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,60%,40%)]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-11 pl-10 pr-10 rounded-lg bg-white/95 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/60 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-white/90">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-white cursor-pointer"
              />
              Remember me
            </label>
            <button type="button" className="text-white/90 hover:text-white font-medium">
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 rounded-lg bg-[hsl(215,80%,20%)] hover:bg-[hsl(215,80%,15%)] active:scale-[0.98] text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Sign in <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-7 text-center">
          <p className="text-[11px] text-white/80">
            Transportation Management System for any ERP
          </p>
          <p className="text-[10px] text-white/60 mt-1">
            v1.0.0 · © 2026 Route Planner · Powered by TMS Solutions
          </p>
        </div>
      </motion.div>
    </div>
  );
}
