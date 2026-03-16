import {
  Truck,
  Route,
  Package,
  PackageCheck,
  Users,
  Car,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { MetricCard, PageHeader } from "@/components/shared/MetricCard";

const metrics = [
  { title: "Total Vehicles", value: 142, icon: Truck, trend: { value: "+3 this week", positive: true }, status: "active" as const },
  { title: "Active Routes", value: 38, icon: Route, trend: { value: "12 in transit", positive: true }, status: "active" as const },
  { title: "Orders Pending", value: 67, icon: Package, trend: { value: "+8 today", positive: false }, status: "delayed" as const },
  { title: "Orders Delivered", value: 1284, icon: PackageCheck, trend: { value: "+24 today", positive: true }, status: "delivered" as const },
  { title: "Drivers Available", value: 52, icon: Users, trend: { value: "6 on break", positive: true }, status: "active" as const },
  { title: "Vehicles Available", value: 89, icon: Car, trend: { value: "53 deployed", positive: true }, status: "idle" as const },
];

const recentActivity = [
  { id: "RT-1042", driver: "John Carter", vehicle: "VH-2281", status: "In Transit", eta: "14:30", statusType: "active" },
  { id: "RT-1041", driver: "Sarah Miles", vehicle: "VH-1193", status: "Delayed", eta: "16:15", statusType: "delayed" },
  { id: "RT-1040", driver: "Mike Chen", vehicle: "VH-3340", status: "Delivered", eta: "Completed", statusType: "delivered" },
  { id: "RT-1039", driver: "Lisa Brown", vehicle: "VH-0892", status: "In Transit", eta: "15:45", statusType: "active" },
  { id: "RT-1038", driver: "Tom Wilson", vehicle: "VH-1567", status: "Idle", eta: "—", statusType: "idle" },
];

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Fleet Status: 94% Operational"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {metrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Routes */}
        <div className="lg:col-span-2 bg-card border border-border rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Active Routes</h3>
            <span className="text-caption text-muted-foreground">{recentActivity.length} routes</span>
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
              {recentActivity.map((r) => (
                <tr key={r.id} className={`status-ribbon-${r.statusType}`}>
                  <td className="font-mono text-primary">{r.id}</td>
                  <td>{r.driver}</td>
                  <td className="font-mono">{r.vehicle}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 text-caption font-medium px-2 py-0.5 rounded-sm ${
                      r.statusType === "active" ? "bg-primary/10 text-primary" :
                      r.statusType === "delayed" ? "bg-warning/10 text-warning" :
                      r.statusType === "delivered" ? "bg-success/10 text-success" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        r.statusType === "active" ? "bg-primary" :
                        r.statusType === "delayed" ? "bg-warning" :
                        r.statusType === "delivered" ? "bg-success" :
                        "bg-muted-foreground"
                      }`} />
                      {r.status}
                    </span>
                  </td>
                  <td className="font-mono text-muted-foreground">{r.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Map Widget Placeholder */}
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Vehicle Locations</h3>
          </div>
          <div className="h-80 flex items-center justify-center relative bg-secondary/30">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-primary/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Map Integration</p>
              <p className="text-caption text-muted-foreground mt-1">Connect Mapbox or Google Maps</p>
            </div>
            {/* Simulated vehicle dots */}
            <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-primary rounded-full animate-pulse-dot" />
            <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-success rounded-full" />
            <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-warning rounded-full animate-pulse-dot" />
          </div>
        </div>
      </div>
    </div>
  );
}
