import { Truck, Compass, IdCard, CheckCircle2, User } from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Trend = { value: string; tone: "positive" | "warning" | "neutral" };

const kpis: { label: string; value: string; icon: any; trend: Trend }[] = [
  { label: "Active Trips", value: "18", icon: Truck, trend: { value: "▲ 3 vs yesterday", tone: "positive" } },
  { label: "Vehicles on Road", value: "22", icon: Compass, trend: { value: "▲ 81% utilised", tone: "positive" } },
  { label: "Drivers on Duty", value: "24", icon: IdCard, trend: { value: "2 approaching hour limit", tone: "warning" } },
  { label: "Deliveries Today", value: "41", icon: CheckCircle2, trend: { value: "▲ 94.1% on time", tone: "positive" } },
];

const fleetStatus = [
  { label: "On Road", value: 22, max: 30, color: "emerald" },
  { label: "Idle / Depot", value: 5, max: 30, color: "sky" },
  { label: "Maintenance", value: 3, max: 30, color: "rose" },
];

const fleetTotals = [
  { label: "Total", value: 30 },
  { label: "Trailers", value: 18 },
  { label: "Drivers", value: 32 },
];

const driverHours = [
  { label: "Under 8h — safe", value: 18, max: 24, color: "emerald" },
  { label: "8–10h — caution", value: 4, max: 24, color: "amber" },
  { label: "Over 10h — alert", value: 2, max: 24, color: "rose" },
];

const barColors: Record<string, { bar: string; text: string }> = {
  emerald: { bar: "bg-emerald-500", text: "text-emerald-600" },
  sky: { bar: "bg-sky-500", text: "text-sky-600" },
  amber: { bar: "bg-amber-500", text: "text-amber-600" },
  rose: { bar: "bg-rose-500", text: "text-rose-600" },
};

const trendTone: Record<Trend["tone"], string> = {
  positive: "text-emerald-600",
  warning: "text-amber-600",
  neutral: "text-muted-foreground",
};

export default function Dashboard() {
  return (
    <div>
      <PageHeader title="Operations Overview" subtitle="Live fleet snapshot · own road fleet only" />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card rounded-xl border border-border shadow-card p-5"
            >
              <Icon className="w-6 h-6 text-muted-foreground/60 mb-4" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {k.label}
              </p>
              <p className="text-4xl font-bold text-foreground mb-2">{k.value}</p>
              <p className={cn("text-xs font-medium", trendTone[k.trend.tone])}>{k.trend.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Fleet Status + Driver Hours Today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Fleet Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Fleet Status</h3>
          </div>
          <div className="p-5 space-y-5">
            {fleetStatus.map((s) => {
              const c = barColors[s.color];
              const pct = (s.value / s.max) * 100;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{s.label}</span>
                    <span className={cn("text-sm font-semibold", c.text)}>{s.value}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", c.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5 grid grid-cols-3 gap-3">
            {fleetTotals.map((t) => (
              <div key={t.label} className="bg-secondary/60 rounded-lg p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {t.label}
                </p>
                <p className="text-xl font-bold text-foreground">{t.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Driver Hours Today */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden flex flex-col"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Driver Hours Today</h3>
          </div>
          <div className="p-5 space-y-5 flex-1">
            {driverHours.map((s) => {
              const c = barColors[s.color];
              const pct = (s.value / s.max) * 100;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{s.label}</span>
                    <span className={cn("text-sm font-semibold", c.text)}>{s.value}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", c.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5">
            <p className="text-xs text-muted-foreground">
              Max limit: 10h/day · <span className="text-amber-600 font-medium">2 drivers on warning</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
