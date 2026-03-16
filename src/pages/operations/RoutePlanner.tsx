import { useState } from "react";
import { PageHeader, DataTableShell, StatusBadge } from "@/components/shared/MetricCard";
import { Search, Plus, Truck, Clock, Package, GripVertical, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const routes = [
  { id: "RT-1042", origin: "Warehouse A", destination: "Customer Hub North", stops: 4, distance: "142 km", driver: "John Carter", vehicle: "VH-2281", status: "In Transit", variant: "active" as const },
  { id: "RT-1041", origin: "Distribution Center", destination: "Port Terminal B", stops: 2, distance: "87 km", driver: "Sarah Miles", vehicle: "VH-1193", status: "Planned", variant: "muted" as const },
  { id: "RT-1040", origin: "Factory Floor", destination: "Regional Depot C", stops: 6, distance: "224 km", driver: "Mike Chen", vehicle: "VH-3340", status: "Completed", variant: "success" as const },
  { id: "RT-1039", origin: "Warehouse B", destination: "Customer Hub South", stops: 3, distance: "98 km", driver: "Lisa Brown", vehicle: "VH-0892", status: "In Transit", variant: "active" as const },
  { id: "RT-1038", origin: "Port Terminal A", destination: "Warehouse A", stops: 1, distance: "56 km", driver: "Tom Wilson", vehicle: "VH-1567", status: "Planned", variant: "muted" as const },
];

export default function RoutePlanner() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const filtered = routes.filter((r) => {
    const matchSearch = r.id.toLowerCase().includes(search.toLowerCase()) || r.driver.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "All" || r.status === activeFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <PageHeader
        title="Route Planner"
        subtitle="Plan, optimize, and assign delivery routes"
        actions={<button className="h-9 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-glow hover:shadow-glow-lg hover:opacity-90 transition-all"><Plus className="w-4 h-4" /> Create Route</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="relative group flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input placeholder="Search routes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-10 pr-4 rounded-lg bg-secondary/70 border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all" />
            </div>
            {["All", "In Transit", "Planned", "Completed"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`h-9 px-3.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === f
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <DataTableShell>
            <table className="data-table">
              <thead><tr><th>Route</th><th>Origin → Destination</th><th>Stops</th><th>Distance</th><th>Driver</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="group cursor-pointer">
                    <td className="font-mono text-primary font-medium">{r.id}</td>
                    <td>
                      <span className="text-foreground">{r.origin}</span>
                      <ArrowRight className="w-3 h-3 inline mx-1.5 text-muted-foreground" />
                      <span className="text-foreground">{r.destination}</span>
                    </td>
                    <td className="font-mono text-foreground">{r.stops}</td>
                    <td className="font-mono text-muted-foreground">{r.distance}</td>
                    <td className="text-foreground">{r.driver}</td>
                    <td><StatusBadge status={r.status} variant={r.variant} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </div>

        {/* Route Detail */}
        <motion.div
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Route Details</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">RT-1042 • In Transit</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 gradient-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">John Carter</p>
                <p className="text-[11px] text-muted-foreground font-mono">VH-2281</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Stops</p>
              <div className="space-y-1">
                {["Warehouse A", "Stop 1: Retail Park", "Stop 2: Office Complex", "Stop 3: Mall District", "Customer Hub North"].map((stop, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm py-1.5 px-2 rounded-md hover:bg-secondary/50 transition-colors">
                    <GripVertical className="w-3 h-3 text-muted-foreground/40" />
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${i === 0 ? "bg-success border-success/30" : i === 4 ? "bg-primary border-primary/30" : "border-muted-foreground/40"}`} />
                    <span className="text-foreground">{stop}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[{ icon: Clock, label: "ETA", value: "14:30" }, { icon: Package, label: "Items", value: "24" }].map((s) => (
                <div key={s.label} className="p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1"><s.icon className="w-3.5 h-3.5" /><span className="text-[11px] uppercase tracking-wider">{s.label}</span></div>
                  <p className="font-mono text-lg font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            <button className="w-full h-10 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-glow hover:shadow-glow-lg hover:opacity-90 transition-all">
              Commit Route
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
