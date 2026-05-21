import {
  Truck,
  Route,
  Package,
  PackageCheck,
  Users,
  Car,
  Clock,
  TrendingUp,
  Fuel,
  Wrench,
  CheckCircle,
} from "lucide-react";
import { MetricCard, PageHeader, StatusBadge, DataTableShell } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
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

const todaySummary = [
  { label: "Orders Shipped", value: 128 },
  { label: "Orders Delivered", value: 94 },
  { label: "Orders In Transit", value: 34 },
  { label: "Exceptions", value: 3 },
];

export default function Dashboard() {
  const sort = useSortable(recentActivity);
  const sortedActivity = sort.sorted;
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

        {/* Recent Routes */}
        <div className="lg:col-span-3">
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
                  <SortableTh sortKey="id" sort={sort}>Route ID</SortableTh>
                  <SortableTh sortKey="driver" sort={sort}>Driver</SortableTh>
                  <SortableTh sortKey="vehicle" sort={sort}>Vehicle</SortableTh>
                  <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                  <SortableTh sortKey="eta" sort={sort}>ETA</SortableTh>
                </tr>
              </thead>
              <tbody>
                {sortedActivity.map((r, i) => (
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

      {/* Bottom Row: Today's Summary */}
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
    </div>
  );
}
