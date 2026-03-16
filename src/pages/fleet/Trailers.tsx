import { PageHeader, DataTableShell, StatusBadge } from "@/components/shared/MetricCard";
import { Plus, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const mockData = [
  { id: 1, code: "TRL-001", type: "Flatbed", capacity: "20 tons", status: "Available" },
  { id: 2, code: "TRL-002", type: "Enclosed", capacity: "15 tons", status: "In Use" },
  { id: 3, code: "TRL-003", type: "Refrigerated", capacity: "12 tons", status: "Maintenance" },
  { id: 4, code: "TRL-004", type: "Tanker", capacity: "25,000 L", status: "Available" },
];

export default function Trailers() {
  return (
    <div>
      <PageHeader title="Trailers" subtitle="Manage fleet trailers"
        actions={<button className="h-9 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-glow hover:shadow-glow-lg hover:opacity-90 transition-all"><Plus className="w-4 h-4" /> Add Trailer</button>}
      />
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Code</th><th>Type</th><th>Capacity</th><th>Status</th><th className="w-20">Actions</th></tr></thead>
          <tbody>
            {mockData.map((d, i) => (
              <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="group">
                <td><span className="font-mono text-xs px-2 py-1 rounded bg-secondary text-foreground">{d.code}</span></td>
                <td className="text-foreground">{d.type}</td>
                <td className="text-muted-foreground">{d.capacity}</td>
                <td><StatusBadge status={d.status} variant={d.status === "Available" ? "success" : d.status === "Maintenance" ? "warning" : "primary"} /></td>
                <td>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"><Edit className="w-3.5 h-3.5" /></button>
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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
