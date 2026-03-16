import { useState } from "react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Plus, GripVertical, Truck, Clock, Package } from "lucide-react";

const routes = [
  { id: "RT-1042", origin: "Warehouse A", destination: "Customer Hub North", stops: 4, distance: "142 km", driver: "John Carter", vehicle: "VH-2281", status: "In Transit", eta: "14:30" },
  { id: "RT-1041", origin: "Distribution Center", destination: "Port Terminal B", stops: 2, distance: "87 km", driver: "Sarah Miles", vehicle: "VH-1193", status: "Planned", eta: "16:15" },
  { id: "RT-1040", origin: "Factory Floor", destination: "Regional Depot C", stops: 6, distance: "224 km", driver: "Mike Chen", vehicle: "VH-3340", status: "Completed", eta: "—" },
  { id: "RT-1039", origin: "Warehouse B", destination: "Customer Hub South", stops: 3, distance: "98 km", driver: "Lisa Brown", vehicle: "VH-0892", status: "In Transit", eta: "15:45" },
  { id: "RT-1038", origin: "Port Terminal A", destination: "Warehouse A", stops: 1, distance: "56 km", driver: "Tom Wilson", vehicle: "VH-1567", status: "Planned", eta: "17:00" },
];

export default function RoutePlanner() {
  const [search, setSearch] = useState("");
  const filtered = routes.filter((r) => r.id.toLowerCase().includes(search.toLowerCase()) || r.driver.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Route Planner"
        subtitle="Plan, optimize, and assign delivery routes"
        actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> Create Route</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route List */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search routes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8" />
            </div>
            <Button variant="outline" size="sm">All</Button>
            <Button variant="ghost" size="sm">In Transit</Button>
            <Button variant="ghost" size="sm">Planned</Button>
          </div>

          <DataTableShell>
            <table className="data-table">
              <thead>
                <tr><th>Route</th><th>Origin → Destination</th><th>Stops</th><th>Distance</th><th>Driver</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={r.status === "In Transit" ? "status-ribbon-active" : r.status === "Completed" ? "status-ribbon-delivered" : "status-ribbon-idle"}>
                    <td className="font-mono text-primary font-medium">{r.id}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground">{r.origin}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-foreground">{r.destination}</span>
                      </div>
                    </td>
                    <td className="font-mono">{r.stops}</td>
                    <td className="font-mono text-muted-foreground">{r.distance}</td>
                    <td>{r.driver}</td>
                    <td>
                      <span className={`text-caption font-medium px-2 py-0.5 rounded-sm ${
                        r.status === "In Transit" ? "bg-primary/10 text-primary" :
                        r.status === "Completed" ? "bg-success/10 text-success" :
                        "bg-muted text-muted-foreground"
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </div>

        {/* Route Details Panel */}
        <div className="bg-card border border-border rounded-md">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Route Details</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded bg-secondary/50">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">RT-1042</p>
                <p className="text-caption text-muted-foreground">John Carter • VH-2281</p>
              </div>
            </div>

            {/* Stops */}
            <div className="space-y-2">
              <p className="text-caption uppercase tracking-wider text-muted-foreground font-medium">Stops</p>
              {["Warehouse A", "Stop 1: Retail Park", "Stop 2: Office Complex", "Stop 3: Mall District", "Customer Hub North"].map((stop, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-success" : i === 4 ? "bg-primary" : "bg-muted-foreground"}`} />
                  <span className="text-foreground">{stop}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded bg-secondary/50">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-caption">ETA</span>
                </div>
                <p className="font-mono text-sm font-medium text-foreground">14:30</p>
              </div>
              <div className="p-2.5 rounded bg-secondary/50">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Package className="w-3.5 h-3.5" />
                  <span className="text-caption">Items</span>
                </div>
                <p className="font-mono text-sm font-medium text-foreground">24</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1">Commit Route</Button>
              <Button size="sm" variant="outline">Edit</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
