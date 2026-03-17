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
  const iconBg = {
    active: "bg-primary/8 text-primary",
    delayed: "bg-warning/8 text-warning",
    delivered: "bg-success/8 text-success",
    idle: "bg-muted text-muted-foreground",
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="bg-card rounded-2xl p-5 shadow-premium hover:shadow-elevated transition-all duration-200 border border-border/40 relative overflow-hidden group cursor-default"
    >
      {/* Subtle top accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-[2px] opacity-60",
        status === "active" && "bg-primary",
        status === "delayed" && "bg-warning",
        status === "delivered" && "bg-success",
        status === "idle" && "bg-muted-foreground/30",
      )} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-[28px] font-bold text-foreground mt-2.5 tracking-tight leading-none">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-3">
              <span className={cn(
                "text-[11px] font-medium px-1.5 py-0.5 rounded-md",
                trend.positive ? "bg-success/8 text-success" : "bg-destructive/8 text-destructive"
              )}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105", iconBg)}>
          <Icon className="w-5 h-5" />
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
        <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
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
      className="bg-card rounded-2xl border border-border/40 overflow-hidden shadow-premium hover:shadow-elevated transition-shadow duration-300"
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
    active: "bg-primary/8 text-primary",
    warning: "bg-warning/8 text-warning",
    success: "bg-success/8 text-success",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/8 text-primary",
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
