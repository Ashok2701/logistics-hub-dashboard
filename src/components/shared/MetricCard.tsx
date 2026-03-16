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
}

export function MetricCard({ title, value, icon: Icon, trend, status = "active" }: MetricCardProps) {
  const ribbonClass = {
    active: "status-ribbon-active",
    delayed: "status-ribbon-delayed",
    delivered: "status-ribbon-delivered",
    idle: "status-ribbon-idle",
  }[status];

  return (
    <motion.div
      whileHover={{ translateY: -2 }}
      className={cn("metric-card bg-card", ribbonClass)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-heading font-semibold text-foreground mt-1 font-mono">{value}</p>
          {trend && (
            <p className={cn("text-caption mt-1", trend.positive ? "text-success" : "text-destructive")}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
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
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-heading font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
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

  return <span className={cn("inline-block w-1.5 h-1.5 rounded-full", colors[status])} />;
}

interface DataTableShellProps {
  children: ReactNode;
}

export function DataTableShell({ children }: DataTableShellProps) {
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      {children}
    </div>
  );
}
