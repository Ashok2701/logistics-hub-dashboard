import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const driverData = [
  { name: "John Carter", deliveries: 142, distance: 4520 },
  { name: "Sarah Miles", deliveries: 98, distance: 3210 },
  { name: "Mike Chen", deliveries: 210, distance: 6780 },
  { name: "Lisa Brown", deliveries: 65, distance: 2100 },
  { name: "Tom Wilson", deliveries: 178, distance: 5430 },
];

export default function DriverReports() {
  return (
    <div>
      <PageHeader title="Driver Reports" subtitle="Performance analytics by driver" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Deliveries per Driver</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={driverData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="deliveries" fill="hsl(210, 100%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distance Travelled (km)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={driverData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="distance" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Driver</th><th>Total Deliveries</th><th>Distance (km)</th><th>Avg per Trip</th></tr></thead>
          <tbody>
            {driverData.map((d) => (
              <tr key={d.name}>
                <td className="font-medium">{d.name}</td>
                <td className="font-mono">{d.deliveries}</td>
                <td className="font-mono">{d.distance.toLocaleString()}</td>
                <td className="font-mono text-muted-foreground">{Math.round(d.distance / d.deliveries)} km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
