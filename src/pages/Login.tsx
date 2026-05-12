import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, User, Route, AlertCircle, Eye, EyeOff, Truck, MapPin, Package, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import fleetBg from "@/assets/login-fleet-bg-light.jpg";

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
      {/* LEFT — Brand / hero (light) */}
      <div className="hidden lg:flex relative flex-1 overflow-hidden bg-[hsl(210,40%,98%)]">
        {/* background image */}
        <img
          src={fleetBg}
          alt="Fleet logistics route network"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* soft white overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/40 to-[hsl(199,89%,90%)]/40" />
        {/* glow accents */}
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-primary/10 blur-3xl animate-float pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-[460px] h-[460px] rounded-full bg-[hsl(199,89%,48%)]/10 blur-3xl animate-float-delayed pointer-events-none" />

        {/* content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Route className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-foreground tracking-tight leading-tight">Route Planner</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] font-semibold mt-0.5">Universal ERP Edition</p>
            </div>
          </div>

          {/* hero copy */}
          <div className="space-y-10">
            <div>
              <h2 className="text-4xl xl:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
                Plan smarter routes.<br />
                <span className="bg-gradient-to-r from-primary to-[hsl(199,89%,48%)] bg-clip-text text-transparent">
                  Move every load faster.
                </span>
              </h2>
              <p className="text-muted-foreground text-[15px] mt-5 max-w-md leading-relaxed">
                A modern Transport Management Suite for fleet, deliveries and route optimization.
              </p>
            </div>

            {/* animated route illustration */}
            <div className="relative h-44 rounded-2xl border border-border bg-white/60 backdrop-blur-sm overflow-hidden shadow-sm">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 180" fill="none">
                <defs>
                  <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(199 89% 48%)" />
                  </linearGradient>
                </defs>
                <path
                  d="M 30 140 Q 100 40 180 90 T 370 50"
                  stroke="url(#routeGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  fill="none"
                  className="animate-pulse"
                />
                {[
                  { x: 30, y: 140 },
                  { x: 180, y: 90 },
                  { x: 370, y: 50 },
                ].map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="14" fill="hsl(var(--primary) / 0.15)" />
                    <circle cx={p.x} cy={p.y} r="6" fill="hsl(var(--primary))" />
                  </g>
                ))}
              </svg>
              <div className="absolute bottom-3 left-4 flex items-center gap-2 text-muted-foreground text-[11px] font-medium">
                <MapPin className="w-3 h-3" /> Live route optimization
              </div>
            </div>

            {/* feature pills */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Truck, label: "Fleet Ops" },
                { icon: Package, label: "Deliveries" },
                { icon: BarChart3, label: "Analytics" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/70 border border-border shadow-sm">
                  <f.icon className="w-4 h-4 text-primary" />
                  <span className="text-foreground text-xs font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* tagline footer */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              Built for modern logistics teams
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-12">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* mobile-only logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Route className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-base font-bold text-foreground">Route Planner</h1>
          </div>

          <h2 className="text-[28px] font-bold text-foreground tracking-tight">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-8">
            Sign in to your transport management workspace.
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Username</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoFocus
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-12 pl-11 pr-12 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-all"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <button type="button" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  Forgot Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 uppercase tracking-wider"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Secured by TMS Solutions · v1.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}
