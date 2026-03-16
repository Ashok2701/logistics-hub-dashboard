import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, COLOR_THEMES, type ColorTheme } from "@/contexts/ThemeContext";
import { Lock, User, Route, AlertCircle, ArrowRight, Palette, Eye, EyeOff, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_LOGINS = [
  { label: "Admin", username: "admin", role: "admin" },
  { label: "Dispatcher", username: "dispatcher", role: "dispatcher" },
  { label: "Driver", username: "driver", role: "driver" },
  { label: "Viewer", username: "viewer", role: "viewer" },
];

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

  const handleQuickLogin = async (uname: string) => {
    setUsername(uname);
    setPassword("admin");
    setError("");
    setLoading(true);
    try {
      await login(uname, "admin");
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient" />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Floating blobs */}
      <div className="absolute top-[10%] left-[15%] w-80 h-80 rounded-full bg-primary/8 blur-3xl animate-float" />
      <div className="absolute bottom-[15%] right-[10%] w-96 h-96 rounded-full bg-[hsl(263,70%,50%)]/6 blur-3xl animate-float-delayed" />

      {/* Centered login card */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo above card */}
        <motion.div
          className="flex flex-col items-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-4">
            <Route className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Route Planner</h1>
          <p className="text-sm text-white/50 mt-1">Fleet Management System</p>
        </motion.div>

        {/* Card */}
        <div className="rounded-2xl backdrop-blur-2xl bg-[hsl(225,30%,12%)]/80 border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-semibold text-white text-center">Welcome Back</h2>
            <p className="text-sm text-white/40 text-center mt-1 mb-6">Sign in to your account to continue</p>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/15 border border-destructive/20 text-sm mb-5"
                >
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-destructive">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">Username</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-primary transition-colors" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoFocus
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 focus:bg-white/[0.08] transition-all text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-primary transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-12 pl-11 pr-12 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 focus:bg-white/[0.08] transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-glow hover:shadow-glow-lg group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Login Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[11px] uppercase tracking-widest text-white/30 bg-[hsl(225,30%,12%)]">Quick Login (Demo)</span>
              </div>
            </div>

            {/* Quick Login Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_LOGINS.map((q) => (
                <button
                  key={q.username}
                  type="button"
                  onClick={() => handleQuickLogin(q.username)}
                  className="flex flex-col items-start px-4 py-3 rounded-xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.08] hover:border-primary/30 transition-all text-left group"
                >
                  <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{q.label}</span>
                  <span className="text-[11px] text-white/30 font-mono">{q.username}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selector Footer */}
          <div className="px-8 py-5 border-t border-white/8 bg-white/[0.02]">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Palette className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[11px] uppercase tracking-widest text-white/30 font-medium">Theme</span>
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
                      className={`block w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                        colorTheme === t.id
                          ? "border-white scale-110 shadow-lg ring-2 ring-white/20"
                          : "border-white/15 hover:border-white/40 hover:scale-105"
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

        {/* Footer */}
        <p className="text-center text-[11px] text-white/20 mt-6">© 2026 Route Planner for Sage X3. All rights reserved.</p>
      </motion.div>
    </div>
  );
}
