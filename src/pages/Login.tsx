import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, COLOR_THEMES } from "@/contexts/ThemeContext";
import { Lock, User, Route, AlertCircle, ArrowRight, Eye, EyeOff, Truck, MapPin, Package, Palette, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import transportHero from "@/assets/transport-hero.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const navigate = useNavigate();

  const isDark = theme === "dark";

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
      {/* ── Left Panel: Branding (70%) ── */}
      <motion.div
        className="hidden lg:flex flex-[7] relative flex-col justify-between overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Hero Image - full bleed */}
        <img
          src={transportHero}
          alt="Fleet of trucks at logistics hub"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(210,50%,6%)]/90 via-[hsl(210,40%,8%)]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(210,50%,4%)]/80 via-transparent to-[hsl(210,50%,6%)]/40" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="w-11 h-11 rounded-xl bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/20">
              <Route className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">Route Planner</span>
              <span className="text-sm font-light text-white/40 ml-2">for Sage X3</span>
            </div>
          </motion.div>

          {/* Hero Content */}
          <div className="max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/20 backdrop-blur-sm mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">Enterprise Platform</span>
              </div>

              <h1 className="text-[3.2rem] font-extrabold text-white leading-[1.08] tracking-tight mb-5">
                Enterprise-Grade
                <br />
                <span className="text-gradient">Transport</span>
                <br />
                Management
              </h1>

              <p className="text-base text-white/45 leading-relaxed max-w-md mb-8">
                A unified platform for fleet management, route planning, live tracking, and delivery optimization with seamless Sage X3 integration.
              </p>
            </motion.div>

            {/* Tags */}
            <motion.div
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
            >
              {["Fleet Tracking", "Route Optimization", "Sage X3", "Real-time GPS"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium text-white/60 bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Stats Row */}
          <motion.div
            className="flex gap-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            {[
              { icon: Truck, value: "10K+", label: "Vehicles" },
              { icon: MapPin, value: "50K+", label: "Routes" },
              { icon: Package, value: "24/7", label: "Tracking" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.05] backdrop-blur-md border border-white/[0.08] rounded-xl px-5 py-4 min-w-[130px] hover:bg-white/[0.08] transition-colors"
              >
                <stat.icon className="w-4 h-4 text-primary mb-2.5" />
                <p className="text-2xl font-bold text-white font-mono tracking-tight">{stat.value}</p>
                <p className="text-[10px] text-white/35 uppercase tracking-[0.15em] mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ── Right Panel: Login Form (30%) ── */}
      <motion.div
        className="flex-[3] flex flex-col min-h-screen bg-background relative"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Top bar with dark/light toggle */}
        <div className="flex items-center justify-end p-5">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all shadow-sm"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </motion.div>
          </button>
        </div>

        {/* Login form centered */}
        <div className="flex-1 flex items-center justify-center px-8 pb-8">
          <div className="w-full max-w-[360px]">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-10 lg:hidden">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Route className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Route Planner</span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground mt-1.5 mb-8">Sign in to your account to continue</p>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/8 border border-destructive/15 text-sm mb-6"
                >
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-destructive text-[13px]">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Login ID */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
              >
                <label className="text-sm font-medium text-foreground mb-2 block">Login ID</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-200" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your login ID"
                    autoFocus
                    className="w-full h-[52px] pl-12 pr-4 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all text-sm shadow-sm"
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-200" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-[52px] pl-12 pr-12 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all text-sm shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </motion.div>

              {/* Sign In Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2.5 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20 group"
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
              </motion.div>
            </form>

            {/* Demo credentials */}
            <motion.p
              className="text-xs text-muted-foreground text-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Demo: <code className="font-mono text-primary bg-primary/8 px-1.5 py-0.5 rounded">admin</code> / <code className="font-mono text-primary bg-primary/8 px-1.5 py-0.5 rounded">admin</code>
            </motion.p>

            {/* Theme selector */}
            <motion.div
              className="mt-10 pt-6 border-t border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Color Theme</span>
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
                        className={`block w-8 h-8 rounded-full border-[2.5px] transition-all duration-200 ${
                          colorTheme === t.id
                            ? "border-foreground scale-110 shadow-lg"
                            : "border-border hover:border-muted-foreground hover:scale-105"
                        }`}
                        style={{ background: `hsl(${h}, ${s}, ${l})` }}
                      />
                      {colorTheme === t.id && (
                        <motion.span
                          layoutId="theme-indicator"
                          className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow-md"
                        >
                          ✓
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-5 text-center">
          <p className="text-[11px] text-muted-foreground/50">© 2026 Route Planner for Sage X3. All rights reserved.</p>
        </div>
      </motion.div>
    </div>
  );
}
