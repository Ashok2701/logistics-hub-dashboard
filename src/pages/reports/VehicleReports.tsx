import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const vehicleData = [
  { plate: "ABC-1234", trips: 45, distance: 8920, utilization: 82 },
  { plate: "DEF-5678", trips: 38, distance: 7210, utilization: 71 },
  { plate: "GHI-9012", trips: 52, distance: 10340, utilization: 94 },
  { plate: "JKL-3456", trips: 12, distance: 2100, utilization: 28 },
  { plate: "MNO-7890", trips: 41, distance: 8430, utilization: 76 },
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

export default function VehicleReports() {
  const sort = useSortable(vehicleData);
  const sorted = sort.sorted;
  return (
    <div>
      <PageHeader title="Vehicle Reports" subtitle="Fleet utilization analytics" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {[
          { title: "Vehicle Utilization (%)", key: "utilization", color: "hsl(25, 95%, 53%)" },
          { title: "Trip Count", key: "trips", color: "hsl(217, 91%, 60%)" },
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
              <BarChart data={vehicleData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="plate" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
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
          <thead><tr>
            <SortableTh sortKey="plate" sort={sort}>Vehicle</SortableTh>
            <SortableTh sortKey="trips" sort={sort}>Trips</SortableTh>
            <SortableTh sortKey="distance" sort={sort}>Distance (km)</SortableTh>
            <SortableTh sortKey="utilization" sort={sort}>Utilization</SortableTh>
          </tr></thead>
          <tbody>
            {sorted.map((d, i) => (
              <motion.tr key={d.plate} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.04 }}>
                <td><span className="font-mono text-xs px-2 py-1 rounded bg-secondary text-foreground">{d.plate}</span></td>
                <td className="font-mono text-foreground">{d.trips}</td>
                <td className="font-mono text-foreground">{d.distance.toLocaleString()}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full gradient-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${d.utilization}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                      />
                    </div>
                    <span className="font-mono text-xs font-medium text-foreground">{d.utilization}%</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
