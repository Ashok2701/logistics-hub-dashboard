import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, User, Route, AlertCircle, Eye, EyeOff, MapPin } from "lucide-react";
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

  // Pin positions on hero image (% based)
  const pins = [
    { x: 22, y: 18, color: "hsl(199 89% 55%)" },
    { x: 55, y: 8, color: "hsl(142 71% 45%)" },
    { x: 80, y: 22, color: "hsl(199 89% 55%)" },
    { x: 18, y: 58, color: "hsl(142 71% 45%)" },
    { x: 90, y: 50, color: "hsl(0 72% 55%)" },
    { x: 38, y: 78, color: "hsl(199 89% 55%)" },
    { x: 72, y: 88, color: "hsl(142 71% 45%)" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* LEFT — Form panel */}
      <div className="w-full lg:w-[42%] xl:w-[36%] flex flex-col px-6 sm:px-12 lg:px-16 py-10 bg-white">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-[hsl(199,89%,48%)] flex items-center justify-center shadow-md shadow-primary/20">
            <Route className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-foreground tracking-tight leading-tight">
              Route <span className="text-primary">Planner</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] font-semibold">Universal ERP Edition</p>
          </div>
        </div>

        <motion.div
          className="w-full max-w-[380px] mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="text-2xl font-bold text-foreground tracking-tight text-center">
            Welcome Back <span className="text-primary">!</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-8 text-center">
            Sign in to your transport workspace
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
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Username</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-white transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-12 pl-11 pr-12 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-white transition-all text-sm"
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
              className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-primary to-[hsl(199,89%,48%)] hover:brightness-110 active:scale-[0.98] text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary/25"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Log In"
              )}
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <div className="mt-auto pt-10 text-center">
          <p className="text-xs text-primary font-semibold">Version 1.0.0</p>
          <p className="text-[11px] text-muted-foreground mt-1">© 2026 Route Planner. Powered by TMS Solutions.</p>
        </div>
      </div>

      {/* RIGHT — Hero image */}
      <div className="hidden lg:block relative flex-1 overflow-hidden">
        <img
          src={aerialBg}
          alt="Aerial view of highway interchange and logistics network"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Animated map pins */}
        {pins.map((p, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ opacity: 0, y: -10, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.12, duration: 0.5, ease: "backOut" }}
          >
            <div className="relative -translate-x-1/2 -translate-y-full">
              {/* pulse ring */}
              <span
                className="absolute left-1/2 bottom-1 -translate-x-1/2 w-6 h-6 rounded-full opacity-40"
                style={{ background: p.color, animation: "pulse-ring 2.4s ease-out infinite" }}
              />
              <div
                className="relative w-9 h-11 flex items-start justify-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
              >
                <MapPin className="w-9 h-9" style={{ color: p.color, fill: p.color }} strokeWidth={1.5} />
                <span className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white" />
              </div>
            </div>
          </motion.div>
        ))}

        {/* Bottom tagline overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-12 xl:px-16 pt-24 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.05]">
              Transportation Management
              <br />
              <span className="font-light text-white/90">for any ERP</span>
            </h2>
            <p className="text-base xl:text-lg text-[hsl(142,71%,65%)] font-semibold mt-4 tracking-wide">
              Fleet · Route Planning · Dispatch · Proof of Delivery
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
