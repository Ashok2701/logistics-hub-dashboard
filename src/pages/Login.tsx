import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, User, Route, AlertCircle, Eye, EyeOff, MapPin, TrendingUp, Truck, Package, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import aerialBg from "@/assets/login-aerial-highway.jpg";

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

  const pins = [
    { x: 24, y: 20, color: "hsl(199 89% 55%)", label: "Hub A" },
    { x: 58, y: 12, color: "hsl(142 71% 50%)", label: "Hub B" },
    { x: 82, y: 30, color: "hsl(38 92% 55%)", label: "Hub C" },
    { x: 20, y: 62, color: "hsl(142 71% 50%)" },
    { x: 88, y: 56, color: "hsl(0 72% 60%)" },
    { x: 42, y: 80, color: "hsl(199 89% 55%)" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* LEFT — Form panel */}
      <div className="w-full lg:w-[44%] xl:w-[38%] flex flex-col px-6 sm:px-12 lg:px-14 xl:px-16 py-8 bg-white relative overflow-hidden">
        {/* subtle background accents */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-[hsl(199,89%,48%)]/5 blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-[hsl(199,89%,48%)] rounded-xl blur-md opacity-40" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-[hsl(199,89%,48%)] flex items-center justify-center shadow-lg">
              <Route className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-foreground tracking-tight leading-tight">
              Route <span className="text-primary">Planner</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold">Universal ERP Edition</p>
          </div>
        </div>

        <motion.div
          className="relative w-full max-w-[400px] mx-auto my-auto py-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* welcome chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Welcome back</span>
          </div>

          <h2 className="text-[34px] font-extrabold text-foreground tracking-tight leading-[1.05]">
            Sign in to your<br />
            <span className="bg-gradient-to-r from-primary to-[hsl(199,89%,48%)] bg-clip-text text-transparent">
              command center
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mt-3 mb-7">
            Manage fleet, plan routes and track every delivery in real time.
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm mb-5"
              >
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span className="text-destructive text-[13px]">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Username</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-white transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-12 pl-11 pr-12 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-white transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-medium">Remember me</span>
              </label>
              <button type="button" className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full h-12 mt-3 rounded-xl bg-gradient-to-r from-primary to-[hsl(199,89%,48%)] hover:brightness-110 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.5)] overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        <div className="relative text-center">
          <p className="text-[11px] text-muted-foreground">
            <span className="text-primary font-semibold">v1.0.0</span> · © 2026 Route Planner · Powered by TMS Solutions
          </p>
        </div>
      </div>

      {/* RIGHT — Cinematic hero */}
      <div className="hidden lg:block relative flex-1 overflow-hidden bg-[hsl(222,47%,8%)]">
        <img
          src={aerialBg}
          alt="Aerial logistics network"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        {/* dark cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,8%)]/30 via-transparent to-[hsl(222,47%,8%)]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,8%)]/95 via-[hsl(222,47%,8%)]/20 to-transparent" />

        {/* Animated SVG route overlay connecting pins */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(199 89% 60%)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="hsl(142 71% 55%)" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path
            d="M 24 20 Q 40 4 58 12 T 82 30"
            stroke="url(#rg)"
            strokeWidth="0.4"
            fill="none"
            strokeDasharray="1.5 1.5"
            className="animate-pulse"
          />
          <path
            d="M 20 62 Q 50 50 88 56"
            stroke="url(#rg)"
            strokeWidth="0.4"
            fill="none"
            strokeDasharray="1.5 1.5"
            className="animate-pulse"
          />
          <path
            d="M 24 20 Q 30 45 42 80"
            stroke="url(#rg)"
            strokeWidth="0.35"
            fill="none"
            strokeDasharray="1 2"
          />
        </svg>

        {/* Animated map pins */}
        {pins.map((p, i) => (
          <motion.div
            key={i}
            className="absolute z-10"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ opacity: 0, y: -12, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.5, ease: "backOut" }}
          >
            <div className="relative -translate-x-1/2 -translate-y-full">
              <span
                className="absolute left-1/2 bottom-1 -translate-x-1/2 w-7 h-7 rounded-full opacity-50"
                style={{ background: p.color, animation: `pulse-ring 2.4s ease-out ${i * 0.3}s infinite` }}
              />
              <div className="relative drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]">
                <MapPin className="w-9 h-9" style={{ color: p.color, fill: p.color }} strokeWidth={1.5} />
                <span className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white" />
              </div>
              {p.label && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-7 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur text-[10px] font-bold text-foreground whitespace-nowrap shadow-lg">
                  {p.label}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Top-right floating stat cards */}
        <div className="absolute top-8 right-8 z-20 space-y-3">
          {[
            { icon: Truck, label: "Active Fleet", value: "248", trend: "+12%", color: "hsl(199 89% 55%)" },
            { icon: Package, label: "On-Time Delivery", value: "98.4%", trend: "+2.1%", color: "hsl(142 71% 50%)" },
            { icon: TrendingUp, label: "Routes Optimized", value: "1,420", trend: "Today", color: "hsl(38 92% 55%)" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.15, duration: 0.5 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl min-w-[220px]"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${s.color}25`, color: s.color }}
              >
                <s.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">{s.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-white">{s.value}</span>
                  <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.trend}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-12 xl:px-16 pb-12 pt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,71%,55%)] animate-pulse" />
              <span className="text-[11px] font-semibold text-white tracking-wider uppercase">Live · Real-time tracking</span>
            </div>
            <h2 className="text-5xl xl:text-6xl font-extrabold text-white tracking-tight leading-[1.02]">
              Move smarter.<br />
              <span className="bg-gradient-to-r from-[hsl(199,89%,65%)] via-white to-[hsl(142,71%,65%)] bg-clip-text text-transparent">
                Deliver faster.
              </span>
            </h2>
            <p className="text-base xl:text-lg text-white/70 mt-5 max-w-xl leading-relaxed">
              Transportation Management for any ERP.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 text-white/80 text-sm font-semibold">
              {["Fleet", "Route Planning", "Dispatch", "Proof of Delivery"].map((t, i) => (
                <span key={t} className="flex items-center gap-2">
                  {i > 0 && <span className="w-1 h-1 rounded-full bg-white/40" />}
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
