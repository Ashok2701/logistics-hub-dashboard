import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, User, Route, AlertCircle, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-4 py-8 font-sans">
      {/* Background image */}
      <img
        src={logisticsBg}
        alt="Global logistics network"
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />
      {/* Premium blue gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(212,90%,52%)]/70 via-[hsl(218,85%,38%)]/55 to-[hsl(224,80%,22%)]/85" />
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(8,20,48,0.55)_100%)]" />

      {/* Floating glow orbs */}
      <motion.div
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[8%] left-[6%] w-[380px] h-[380px] rounded-full bg-[hsl(199,95%,65%)]/35 blur-[110px]"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-12%] right-[-6%] w-[520px] h-[520px] rounded-full bg-[hsl(225,85%,45%)]/45 blur-[120px]"
      />

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[440px]"
      >
        {/* Outer ring glow */}
        <div className="absolute -inset-px rounded-[26px] bg-gradient-to-br from-white/50 via-white/10 to-white/30 opacity-80 blur-[1px]" />

        <div className="relative rounded-[24px] border border-white/25 bg-white/[0.08] backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] overflow-hidden">
          {/* Top sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="absolute -top-24 -right-20 w-64 h-64 rounded-full bg-white/15 blur-3xl pointer-events-none" />

          <div className="relative p-9 sm:p-10">
            {/* Brand */}
            <div className="flex items-center gap-3 mb-7">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-white/85 flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)]">
                <Route className="w-[22px] h-[22px] text-[hsl(218,85%,32%)]" strokeWidth={2.4} />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[hsl(142,71%,50%)] border-2 border-white" />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-semibold text-white/70 tracking-[0.28em] uppercase">Route Planner</p>
                <h1 className="text-[28px] font-bold text-white tracking-tight">Welcome back</h1>
              </div>
            </div>

            <p className="text-sm text-white/75 mb-6 -mt-2">
              Sign in to your transportation command center.
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-300/30 mb-4"
              >
                <AlertCircle className="w-4 h-4 text-red-100 flex-shrink-0" />
                <span className="text-red-50 text-[13px]">{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="text-[11px] font-semibold text-white/85 mb-1.5 block tracking-wider uppercase">
                  Username
                </label>
                <div className="group relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-white transition-colors" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username@company.com"
                    autoFocus
                    className="w-full h-12 pl-11 pr-3 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-white/60 focus:bg-white/15 focus:ring-4 focus:ring-white/10 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-semibold text-white/85 mb-1.5 block tracking-wider uppercase">
                  Password
                </label>
                <div className="group relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-white transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full h-12 pl-11 pr-11 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-white/60 focus:bg-white/15 focus:ring-4 focus:ring-white/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/55 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[13px] pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-white/85 hover:text-white transition">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded accent-[hsl(199,95%,55%)] cursor-pointer"
                  />
                  Remember me
                </label>
                <button type="button" className="text-white/85 hover:text-white font-medium hover:underline underline-offset-4">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-12 mt-3 rounded-xl bg-gradient-to-r from-[hsl(199,95%,55%)] via-[hsl(210,90%,50%)] to-[hsl(220,85%,45%)] text-white font-semibold text-[15px] shadow-[0_10px_30px_-8px_rgba(33,150,243,0.6)] hover:shadow-[0_14px_36px_-8px_rgba(33,150,243,0.8)] active:scale-[0.985] transition-all disabled:opacity-60 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Sign in <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                  )}
                </span>
              </button>
            </form>

            {/* Trust line */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-white/60">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Secured · TMS for any ERP</span>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="relative px-9 py-3.5 bg-black/20 border-t border-white/10 flex items-center justify-between text-[10px] text-white/55">
            <span>v1.0.0</span>
            <span>© 2026 Route Planner · TMS Solutions</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
