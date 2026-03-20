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

export function MetricCard({ title, value, icon: Icon, trend, status = "active", index = 0 }: MetricCardProps) {
  const iconStyle = {
    active: "bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] text-white shadow-lg",
    delayed: "bg-gradient-to-br from-warning to-[hsl(38,92%,40%)] text-white shadow-lg shadow-warning/20",
    delivered: "bg-gradient-to-br from-success to-[hsl(142,71%,35%)] text-white shadow-lg shadow-success/20",
    idle: "bg-muted text-muted-foreground",
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="bg-card rounded-2xl p-5 shadow-card hover:shadow-elevated transition-all duration-300 border border-border/50 relative overflow-hidden cursor-default gradient-border-top"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-[28px] font-bold text-foreground mt-2 tracking-tight leading-none">{value}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110", iconStyle)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <>
          <div className="h-px bg-border/40 my-3" />
          <div className="flex items-center gap-1">
            <span className={cn(
              "text-[11px] font-medium px-1.5 py-0.5 rounded-md",
              trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          </div>
        </>
      )}
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
      <span className={cn("w-1.5 h-1.5 rounded-full", {
        "bg-primary": variant === "active" || variant === "primary",
        "bg-warning": variant === "warning",
        "bg-success": variant === "success",
        "bg-muted-foreground": variant === "muted",
      })} />
      {status}
    </span>
  );
}
