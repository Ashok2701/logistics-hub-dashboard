import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, User, Route, AlertCircle, Eye, EyeOff, MapPin } from "lucide-react";
import { motion } from "framer-motion";
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

  // Map pin markers (top-down placement on aerial image)
  const pins = [
    { x: 20, y: 14, color: "hsl(199 89% 55%)" },
    { x: 52, y: 8, color: "hsl(142 71% 50%)" },
    { x: 86, y: 20, color: "hsl(0 72% 55%)" },
    { x: 14, y: 50, color: "hsl(142 71% 50%)" },
    { x: 92, y: 60, color: "hsl(0 72% 55%)" },
    { x: 38, y: 70, color: "hsl(199 89% 55%)" },
    { x: 70, y: 92, color: "hsl(142 71% 50%)" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* LEFT — Simple form */}
      <div className="w-full lg:w-[40%] xl:w-[34%] flex flex-col items-center justify-between px-6 sm:px-12 py-10 bg-white">
        <div />

        <motion.div
          className="w-full max-w-[360px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-7">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <Route className="w-6 h-6 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-[18px] font-extrabold text-primary tracking-tight">Route<br/>Planner</p>
              <p className="text-[9px] text-muted-foreground font-semibold tracking-wider">FOR ANY ERP</p>
            </div>
          </div>

          {/* Welcome */}
          <div className="text-center mb-7">
            <h1 className="text-xl font-bold text-foreground">Welcome Back !</h1>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm mb-4">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="text-destructive text-[13px]">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="relative rounded-lg border border-border bg-white px-3 pt-2 pb-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3" /> Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none py-1"
              />
            </div>

            {/* Password */}
            <div className="relative rounded-lg border border-border bg-white px-3 pt-2 pb-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none py-1 pr-7"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">Remember me</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-semibold text-sm transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                "Log In"
              )}
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-xs text-primary font-semibold">Version 1.0.0</p>
          <p className="text-[11px] text-muted-foreground">© 2026 Route Planner. Powered by TMS Solutions Pvt Ltd</p>
        </div>
      </div>

      {/* RIGHT — Hero */}
      <div className="hidden lg:block relative flex-1 overflow-hidden">
        <img
          src={aerialBg}
          alt="Aerial view of highway logistics network"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Map pins */}
        {pins.map((p, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ opacity: 0, y: -10, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: "backOut" }}
          >
            <div className="relative -translate-x-1/2 -translate-y-full">
              <span
                className="absolute left-1/2 bottom-1 -translate-x-1/2 w-6 h-6 rounded-full opacity-50"
                style={{ background: p.color, animation: `pulse-ring 2.4s ease-out ${i * 0.3}s infinite` }}
              />
              <div className="relative drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                <MapPin className="w-9 h-9" style={{ color: p.color, fill: p.color }} strokeWidth={1.5} />
                <span className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white" />
              </div>
            </div>
          </motion.div>
        ))}

        {/* Bottom tagline band */}
        <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm px-12 py-10">
          <h2 className="text-4xl xl:text-5xl font-bold text-white tracking-tight leading-[1.1]">
            Transportation Management System
            <br />
            <span className="font-light">for any ERP</span>
          </h2>
          <p className="text-base text-[hsl(142,71%,65%)] font-semibold mt-3">
            Fleet · Route Planning · Dispatch · Proof of Delivery App
          </p>
        </div>
      </div>
    </div>
  );
}
