import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const driverData = [
  { name: "John Carter", deliveries: 142, distance: 4520 },
  { name: "Sarah Miles", deliveries: 98, distance: 3210 },
  { name: "Mike Chen", deliveries: 210, distance: 6780 },
  { name: "Lisa Brown", deliveries: 65, distance: 2100 },
  { name: "Tom Wilson", deliveries: 178, distance: 5430 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-elevated">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-[11px] text-muted-foreground">
          {p.name}: <span className="font-mono font-medium text-foreground">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

export default function DriverReports() {
  return (
    <div>
      <PageHeader title="Driver Reports" subtitle="Performance analytics by driver" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {[
          { title: "Deliveries per Driver", key: "deliveries", color: "hsl(217, 91%, 60%)" },
          { title: "Distance Travelled (km)", key: "distance", color: "hsl(152, 69%, 41%)" },
        ].map((chart, i) => (
          <motion.div
            key={chart.key}
            className="bg-card rounded-xl border border-border shadow-card p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">{chart.title}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={driverData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.04)" }} />
                <Bar dataKey={chart.key} fill={chart.color} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        ))}
      </div>

      <DataTableShell>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Detailed Breakdown</h3>
        </div>
        <table className="data-table">
          <thead><tr><th>Driver</th><th>Total Deliveries</th><th>Distance (km)</th><th>Avg per Trip</th></tr></thead>
          <tbody>
            {driverData.map((d, i) => (
              <motion.tr key={d.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.04 }}>
                <td className="font-medium text-foreground">{d.name}</td>
                <td className="font-mono text-foreground">{d.deliveries}</td>
                <td className="font-mono text-foreground">{d.distance.toLocaleString()}</td>
                <td className="font-mono text-muted-foreground">{Math.round(d.distance / d.deliveries)} km</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
