import {
  Truck,
  Route,
  Package,
  PackageCheck,
  Users,
  Car,
  MapPin,
  AlertTriangle,
  Clock,
  TrendingUp,
  Fuel,
  Wrench,
  CheckCircle,
  Bell,
} from "lucide-react";
import { MetricCard, PageHeader, StatusBadge, DataTableShell } from "@/components/shared/MetricCard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const metrics = [
  { title: "Total Vehicles", value: 142, icon: Truck, trend: { value: "+3 this week", positive: true }, status: "active" as const },
  { title: "Active Routes", value: 38, icon: Route, trend: { value: "12 in transit", positive: true }, status: "active" as const },
  { title: "Orders Pending", value: 67, icon: Package, trend: { value: "+8 today", positive: false }, status: "delayed" as const },
  { title: "Orders Delivered", value: "1,284", icon: PackageCheck, trend: { value: "+24 today", positive: true }, status: "delivered" as const },
  { title: "Drivers Available", value: 52, icon: Users, trend: { value: "6 on break", positive: true }, status: "active" as const },
  { title: "Vehicles Available", value: 89, icon: Car, trend: { value: "53 deployed", positive: true }, status: "idle" as const },
];

const recentActivity = [
  { id: "RT-1042", driver: "John Carter", vehicle: "VH-2281", status: "In Transit", statusVariant: "active" as const, eta: "14:30" },
  { id: "RT-1041", driver: "Sarah Miles", vehicle: "VH-1193", status: "Delayed", statusVariant: "warning" as const, eta: "16:15" },
  { id: "RT-1040", driver: "Mike Chen", vehicle: "VH-3340", status: "Delivered", statusVariant: "success" as const, eta: "Completed" },
  { id: "RT-1039", driver: "Lisa Brown", vehicle: "VH-0892", status: "In Transit", statusVariant: "active" as const, eta: "15:45" },
  { id: "RT-1038", driver: "Tom Wilson", vehicle: "VH-1567", status: "Idle", statusVariant: "muted" as const, eta: "—" },
];

const tmsKpis = [
  { title: "On-Time Delivery", value: "94.2%", icon: CheckCircle, trend: { value: "+1.5% vs last week", positive: true }, status: "active" as const },
  { title: "Avg Transit Time", value: "3.2 hrs", icon: Clock, trend: { value: "-12 min improvement", positive: true }, status: "active" as const },
  { title: "Fuel Efficiency", value: "8.4 km/l", icon: Fuel, trend: { value: "+0.3 vs target", positive: true }, status: "active" as const },
  { title: "Maintenance Due", value: "7", icon: Wrench, trend: { value: "3 urgent", positive: false }, status: "delayed" as const },
];

const alerts = [
  { type: "delay" as const, message: "Route RT-1041 delayed by 45 min — Weather advisory", time: "10 min ago" },
  { type: "warning" as const, message: "Vehicle VH-2281 requires tire inspection", time: "25 min ago" },
  { type: "info" as const, message: "New order batch #8921 assigned to Route RT-1045", time: "1 hr ago" },
  { type: "delay" as const, message: "Driver Tom Wilson exceeded daily drive limit", time: "2 hrs ago" },
  { type: "warning" as const, message: "Fuel level below 20% on VH-1567", time: "3 hrs ago" },
];

const todaySummary = [
  { label: "Orders Shipped", value: 128 },
  { label: "Orders Delivered", value: 94 },
  { label: "Orders In Transit", value: 34 },
  { label: "Exceptions", value: 3 },
];

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Fleet overview and real-time operations"
      />

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
        {metrics.map((m, i) => (
          <MetricCard key={m.title} {...m} index={i} />
        ))}
      </div>

      {/* TMS KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tmsKpis.map((k, i) => (
          <MetricCard key={k.title} {...k} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Recent Routes */}
        <div className="lg:col-span-2">
          <DataTableShell>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Active Routes</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{recentActivity.length} routes being tracked</p>
              </div>
              <button className="btn-gradient text-xs px-3 py-1.5 rounded-lg">View All</button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route ID</th>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
                    className="group cursor-pointer"
                  >
                    <td className="font-mono text-primary font-medium">{r.id}</td>
                    <td className="text-foreground">{r.driver}</td>
                    <td className="font-mono text-muted-foreground">{r.vehicle}</td>
                    <td><StatusBadge status={r.status} variant={r.statusVariant} /></td>
                    <td className="font-mono text-muted-foreground">{r.eta}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </div>

        {/* Map Widget */}
        <motion.div
          className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-premium"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Vehicle Locations</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Real-time GPS tracking</p>
          </div>
          <div className="h-80 relative bg-muted/30 overflow-hidden">
            {/* Subtle grid */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mapgrid)" />
            </svg>

            {/* Vehicle dots */}
            {[
              { top: "25%", left: "30%", status: "bg-primary", label: "VH-2281" },
              { top: "45%", left: "65%", status: "bg-success", label: "VH-3340" },
              { top: "60%", left: "40%", status: "bg-warning", label: "VH-1193" },
              { top: "35%", left: "75%", status: "bg-primary", label: "VH-0892" },
              { top: "70%", left: "25%", status: "bg-muted-foreground/50", label: "VH-1567" },
            ].map((v, i) => (
              <motion.div
                key={i}
                className="absolute group cursor-pointer"
                style={{ top: v.top, left: v.left }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.08, type: "spring", bounce: 0.4 }}
              >
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${v.status} ring-3 ring-card shadow-sm`} />
                </div>
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border rounded-md px-2 py-1 whitespace-nowrap shadow-elevated">
                  <span className="text-[10px] font-mono font-medium text-foreground">{v.label}</span>
                </div>
              </motion.div>
            ))}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center opacity-30">
                <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Map Integration</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row: Today's Summary + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's Summary */}
        <motion.div
          className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
        >
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Today&apos;s Summary</h3>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Daily operations snapshot</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            {todaySummary.map((s) => (
              <div key={s.label} className="bg-secondary/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerts & Notifications */}
        <motion.div
          className="lg:col-span-2 bg-card rounded-2xl border border-border/60 overflow-hidden shadow-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.35 }}
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Alerts &amp; Notifications</h3>
            </div>
            <span className="text-[11px] font-medium bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{alerts.length} new</span>
          </div>
          <div className="divide-y divide-border/40">
            {alerts.map((a, i) => (
              <motion.div
                key={i}
                className="px-5 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", {
                  "bg-destructive/10 text-destructive": a.type === "delay",
                  "bg-warning/10 text-warning": a.type === "warning",
                  "bg-primary/10 text-primary": a.type === "info",
                })}>
                  {a.type === "delay" && <AlertTriangle className="w-4 h-4" />}
                  {a.type === "warning" && <Wrench className="w-4 h-4" />}
                  {a.type === "info" && <CheckCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{a.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{a.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
