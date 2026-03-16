import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, COLOR_THEMES } from "@/contexts/ThemeContext";
import { Lock, User, Route, AlertCircle, ArrowRight, Eye, EyeOff, Truck, MapPin, Package, Palette } from "lucide-react";
import { motion } from "framer-motion";
import logisticsBg from "@/assets/logistics-bg.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { colorTheme, setColorTheme } = useTheme();
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
    <div className="min-h-screen flex">
      {/* Left - Branding (70%) */}
      <motion.div
        className="hidden lg:flex flex-[7] relative flex-col justify-between p-12 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,50%,10%)] via-[hsl(210,40%,15%)] to-[hsl(210,30%,20%)]" />
        
        {/* Background image */}
        <img
          src={logisticsBg}
          alt="Transport management"
          className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-luminosity"
        />

        {/* Subtle grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Logo */}
        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Route className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-lg font-semibold text-white">Route Planner</span>
            <span className="text-lg font-light text-white/50 ml-1.5">for Sage X3</span>
          </div>
        </motion.div>

        {/* Hero text */}
        <div className="relative z-10 max-w-xl">
          <motion.h1
            className="text-5xl font-bold text-white leading-[1.15] mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Enterprise-Grade{" "}
            <br />
            Transport Management{" "}
            <br />
            System
          </motion.h1>
          <motion.p
            className="text-lg text-white/50 leading-relaxed mb-8 max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            A unified platform for fleet management, route planning, live tracking, and delivery optimization with seamless ERP integration.
          </motion.p>

          {/* Tags */}
          <motion.div
            className="flex flex-wrap gap-2.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            {["Fleet Tracking", "Route Optimization", "Sage X3", "Real-time GPS", "Analytics"].map((tag) => (
              <span key={tag} className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white/70 bg-white/[0.08] border border-white/10">
                {tag}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          className="relative z-10 flex gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
        >
          {[
            { icon: Truck, value: "10K+", label: "Vehicles Managed" },
            { icon: MapPin, value: "50K+", label: "Routes Optimized" },
            { icon: Package, value: "24/7", label: "Live Tracking" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-xl px-5 py-4 min-w-[150px]">
              <stat.icon className="w-4 h-4 text-primary mb-2" />
              <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Right - Login form (30%) */}
      <motion.div
        className="flex-[3] flex items-center justify-center p-8 bg-background min-h-screen"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Route className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">Route Planner</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-8">Sign in to your account to continue</p>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm mb-5"
            >
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="text-destructive">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Login ID</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your login ID"
                  autoFocus
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">Forgot password?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 pl-11 pr-12 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-md hover:shadow-lg group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            Demo: <span className="font-mono text-primary">admin</span> / <span className="font-mono text-primary">admin</span>
          </p>

          {/* Theme Selector */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Palette className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Theme</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              {COLOR_THEMES.map((t) => {
                const [h, s, l] = t.hue.split(" ");
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setColorTheme(t.id)}
                    title={t.label}
                    className="group relative"
                  >
                    <span
                      className={`block w-7 h-7 rounded-full border-2 transition-all duration-200 ${
                        colorTheme === t.id
                          ? "border-primary scale-110 shadow-md ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50 hover:scale-105"
                      }`}
                      style={{ background: `hsl(${h}, ${s}, ${l})` }}
                    />
                    {colorTheme === t.id && (
                      <motion.span
                        layoutId="theme-check"
                        className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow-md"
                      >
                        ✓
                      </motion.span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
