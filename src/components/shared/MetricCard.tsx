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
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-border"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2 tracking-tight">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-[11px] font-medium px-1.5 py-0.5 rounded-md",
                trend.positive ? "bg-success/8 text-success" : "bg-destructive/8 text-destructive"
              )}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg)}>
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
        <h1 className="text-heading font-semibold text-foreground">{title}</h1>
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
      className="bg-card rounded-xl border border-border overflow-hidden shadow-card"
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
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md", styles[variant])}>
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
