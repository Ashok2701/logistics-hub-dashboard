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
    active: "bg-primary/10 text-primary",
    delayed: "bg-warning/10 text-warning",
    delivered: "bg-success/10 text-success",
    idle: "bg-muted text-muted-foreground",
  }[status];

  const ribbon = {
    active: "border-l-primary",
    delayed: "border-l-warning",
    delivered: "border-l-success",
    idle: "border-l-muted-foreground/40",
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={cn(
        "relative bg-card rounded-xl border-l-[3px] p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 gradient-border overflow-hidden",
        ribbon
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/[0.02] -translate-y-8 translate-x-8" />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2 font-mono tracking-tight">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-[11px] font-medium px-1.5 py-0.5 rounded-md",
                trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", iconBg)}>
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
      className="flex items-center justify-between mb-6"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-heading font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
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
    idle: "bg-status-idle",
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
      className="bg-card rounded-xl border border-border overflow-hidden shadow-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
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
    active: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
    muted: "bg-muted text-muted-foreground border-border",
    primary: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border", styles[variant])}>
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
