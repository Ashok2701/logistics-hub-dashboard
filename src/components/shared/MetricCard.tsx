import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  status?: "active" | "delayed" | "delivered" | "idle";
  index?: number;
}

const PALETTES = [
  { card: "from-indigo-600 via-indigo-700 to-violet-800", glow: "from-indigo-500 to-purple-600", blob: "bg-indigo-400/20" },
  { card: "from-sky-500 via-blue-600 to-indigo-700", glow: "from-sky-400 to-blue-600", blob: "bg-sky-300/20" },
  { card: "from-amber-500 via-orange-600 to-rose-600", glow: "from-amber-400 to-rose-500", blob: "bg-amber-300/20" },
  { card: "from-emerald-500 via-teal-600 to-cyan-700", glow: "from-emerald-400 to-cyan-500", blob: "bg-emerald-300/20" },
  { card: "from-fuchsia-500 via-pink-600 to-rose-700", glow: "from-fuchsia-400 to-pink-600", blob: "bg-fuchsia-300/20" },
  { card: "from-cyan-500 via-teal-600 to-emerald-700", glow: "from-cyan-400 to-teal-500", blob: "bg-cyan-300/20" },
  { card: "from-violet-500 via-purple-600 to-fuchsia-700", glow: "from-violet-400 to-fuchsia-500", blob: "bg-violet-300/20" },
  { card: "from-rose-500 via-red-600 to-orange-700", glow: "from-rose-400 to-red-600", blob: "bg-rose-300/20" },
  { card: "from-lime-500 via-green-600 to-emerald-700", glow: "from-lime-400 to-green-500", blob: "bg-lime-300/20" },
  { card: "from-slate-600 via-slate-700 to-slate-900", glow: "from-slate-400 to-slate-600", blob: "bg-slate-300/10" },
];

const BAR_HEIGHTS = ["h-1/2", "h-3/4", "h-1/2", "h-full", "h-2/3"];

export function MetricCard({ title, value, icon: Icon, trend, index = 0 }: MetricCardProps) {
  const g = PALETTES[index % PALETTES.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="relative group"
    >
      {/* Glow Layer */}
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition duration-500",
          g.glow
        )}
      />

      {/* Card Body */}
      <div
        className={cn(
          "relative bg-gradient-to-br p-5 rounded-2xl border border-white/10 shadow-xl overflow-hidden h-full",
          g.card
        )}
      >
        {/* Abstract background blobs */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className={cn("absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 rounded-full blur-2xl pointer-events-none", g.blob)} />

        <div className="relative flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-white/70 text-[10px] font-semibold tracking-wider uppercase truncate">{title}</p>
              <h3 className="text-white text-[26px] font-bold tracking-tight leading-none">{value}</h3>
            </div>
            <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 shadow-inner flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            {trend ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className={cn(
                    "flex items-center px-1.5 py-0.5 rounded-md flex-shrink-0",
                    trend.positive ? "bg-emerald-400/25" : "bg-rose-400/25"
                  )}
                >
                  <span className={cn("text-[10px] font-bold", trend.positive ? "text-emerald-200" : "text-rose-100")}>
                    {trend.positive ? "↑" : "↓"} {trend.value}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-white/50 text-[10px]">—</span>
            )}

            {/* Micro bar graph */}
            <div className="flex items-end gap-1 h-6 flex-shrink-0">
              {BAR_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full",
                    h,
                    i === 3 ? "bg-white/70" : i % 2 === 0 ? "bg-white/30" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <motion.div
      className="flex items-center justify-between mb-8"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </motion.div>
  );
}

interface StatusDotProps {
  status: "active" | "syncing" | "idle" | "error";
}

export function StatusDot({ status }: StatusDotProps) {
  const colors = {
    active: "bg-success",
    syncing: "bg-primary animate-pulse-dot",
    idle: "bg-muted-foreground/40",
    error: "bg-destructive",
  };

  return <span className={cn("inline-block w-2 h-2 rounded-full", colors[status])} />;
}

interface DataTableShellProps {
  children: ReactNode;
}

export function DataTableShell({ children }: DataTableShellProps) {
  return (
    <motion.div
      className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-card hover:shadow-premium transition-shadow duration-300"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

interface StatusBadgeProps {
  status: string;
  variant?: "active" | "warning" | "success" | "muted" | "primary";
}

export function StatusBadge({ status, variant = "muted" }: StatusBadgeProps) {
  const styles = {
    active: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full", styles[variant])}>
      <span
        className={cn("w-1.5 h-1.5 rounded-full", {
          "bg-primary": variant === "active" || variant === "primary",
          "bg-warning": variant === "warning",
          "bg-success": variant === "success",
          "bg-muted-foreground": variant === "muted",
        })}
      />
      {status}
    </span>
  );
}
