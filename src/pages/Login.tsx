import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, User, Route, AlertCircle, Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <img
        src={loginBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-[hsl(215,60%,8%)]/40" />

      {/* Outer glass frame */}
      <motion.div
        className="relative z-10 w-full max-w-[520px] mx-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Subtle outer glow card */}
        <div className="rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] p-2 shadow-2xl shadow-black/30">
          {/* Inner glass card */}
          <div className="rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.1] px-10 py-10">
            {/* Logo */}
            <motion.div
              className="flex flex-col items-center mb-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/80 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
                <Route className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Route Planner</h1>
              <p className="text-xs text-white/40 mt-0.5">for Sage Intacct</p>
            </motion.div>

            {/* Login heading */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white">Login</h2>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/15 border border-red-500/20 text-sm mb-5"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-300 text-[13px]">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <label className="text-sm font-medium text-white/80 mb-2 block">Username</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-white/30 group-focus-within:text-primary transition-colors" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoFocus
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm backdrop-blur-sm"
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="text-sm font-medium text-white/80 mb-2 block">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-white/30 group-focus-within:text-primary transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-11 pl-10 pr-11 rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm backdrop-blur-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Forgot password */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                <button type="button" className="text-xs text-white/50 hover:text-white/80 transition-colors">
                  Forgot Password?
                </button>
              </motion.div>

              {/* Sign In Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-[hsl(210,40%,15%)] hover:bg-[hsl(210,40%,20%)] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-white/[0.08] shadow-lg"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Sign in"
                  )}
                </button>
              </motion.div>
            </form>

            {/* Demo credentials */}
            <motion.p
              className="text-xs text-white/30 text-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Demo: <code className="font-mono text-primary/80 bg-white/[0.06] px-1.5 py-0.5 rounded">admin</code> / <code className="font-mono text-primary/80 bg-white/[0.06] px-1.5 py-0.5 rounded">admin</code>
            </motion.p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-white/20 text-center mt-5">
          © 2026 Route Planner for Sage Intacct. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
