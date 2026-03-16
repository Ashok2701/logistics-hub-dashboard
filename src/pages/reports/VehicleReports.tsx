import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const vehicleData = [
  { plate: "ABC-1234", trips: 45, distance: 8920, utilization: 82 },
  { plate: "DEF-5678", trips: 38, distance: 7210, utilization: 71 },
  { plate: "GHI-9012", trips: 52, distance: 10340, utilization: 94 },
  { plate: "JKL-3456", trips: 12, distance: 2100, utilization: 28 },
  { plate: "MNO-7890", trips: 41, distance: 8430, utilization: 76 },
];

export default function VehicleReports() {
  return (
    <div>
      <PageHeader title="Vehicle Reports" subtitle="Fleet utilization analytics" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Vehicle Utilization (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vehicleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="plate" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="utilization" fill="hsl(35, 100%, 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Trip Count</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vehicleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="plate" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="trips" fill="hsl(210, 100%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Vehicle</th><th>Trips</th><th>Distance (km)</th><th>Utilization</th></tr></thead>
          <tbody>
            {vehicleData.map((d) => (
              <tr key={d.plate} className={d.utilization < 50 ? "status-ribbon-delayed" : "status-ribbon-active"}>
                <td className="font-mono font-medium">{d.plate}</td>
                <td className="font-mono">{d.trips}</td>
                <td className="font-mono">{d.distance.toLocaleString()}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${d.utilization}%` }} />
                    </div>
                    <span className="font-mono text-caption">{d.utilization}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
