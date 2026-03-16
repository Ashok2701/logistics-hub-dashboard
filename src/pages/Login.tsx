import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, User, Route, AlertCircle, Truck, MapPin, Package, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import logisticsBg from "@/assets/logistics-bg.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 mesh-gradient" />
      
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={logisticsBg}
          alt="Logistics operations"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
      </div>

      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-[20%] right-[15%] w-96 h-96 rounded-full bg-[hsl(263,70%,50%)]/5 blur-3xl animate-float-delayed" />
        
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Left - Branding */}
      <motion.div 
        className="hidden lg:flex flex-1 relative z-10 flex-col justify-between p-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Route className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-lg font-semibold text-primary-foreground">Vanguard</span>
            <span className="text-lg font-light text-primary-foreground/60 ml-1">TMS</span>
          </div>
        </div>

        <div className="max-w-lg">
          <motion.h1 
            className="text-4xl font-bold text-primary-foreground leading-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Fleet intelligence,{" "}
            <span className="text-gradient">delivered.</span>
          </motion.h1>
          <motion.p 
            className="text-lg text-primary-foreground/50 leading-relaxed mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Enterprise-grade transportation management for modern logistics operations. Plan routes, track fleets, and optimize deliveries in real-time.
          </motion.p>

          {/* Stats */}
          <motion.div 
            className="flex gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            {[
              { icon: Truck, label: "Vehicles Managed", value: "10K+" },
              { icon: MapPin, label: "Routes Optimized", value: "50K+" },
              { icon: Package, label: "Deliveries/Day", value: "25K+" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 min-w-[140px]">
                <stat.icon className="w-5 h-5 text-primary mb-2" />
                <p className="text-xl font-bold text-primary-foreground font-mono">{stat.value}</p>
                <p className="text-[11px] text-primary-foreground/40 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="text-xs text-primary-foreground/30">© 2026 Vanguard TMS. Enterprise Logistics Platform.</p>
      </motion.div>

      {/* Right - Login Form */}
      <motion.div 
        className="relative z-10 w-full lg:w-[480px] flex items-center justify-center p-6"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="w-full max-w-sm">
          {/* Glass card */}
          <div className="glass rounded-2xl p-8 shadow-elevated">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Route className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-primary-foreground">Vanguard TMS</span>
            </div>

            <h2 className="text-xl font-semibold text-primary-foreground mb-1">Welcome back</h2>
            <p className="text-sm text-primary-foreground/40 mb-6">Sign in to your command center</p>

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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2 block">Username</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoFocus
                    className="w-full h-11 pl-11 pr-4 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/15 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2 block">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full h-11 pl-11 pr-4 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/15 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-primary-foreground/20 bg-transparent text-primary" />
                  <span className="text-xs text-primary-foreground/40">Remember me</span>
                </label>
                <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors">Forgot password?</button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg gradient-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-glow hover:shadow-glow-lg group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.06)] text-center">
              <p className="text-xs text-primary-foreground/30">
                Demo credentials: <span className="font-mono text-primary/70">admin</span> / <span className="font-mono text-primary/70">admin</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
