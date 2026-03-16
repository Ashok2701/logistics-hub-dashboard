import { PageHeader, DataTableShell, StatusBadge } from "@/components/shared/MetricCard";
import { Plus, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const mockData = [
  { id: 1, vehicle: "ABC-1234", trailer: "TRL-001", assignedDate: "2026-03-10", status: "Active" },
  { id: 2, vehicle: "DEF-5678", trailer: "TRL-002", assignedDate: "2026-03-08", status: "Active" },
  { id: 3, vehicle: "GHI-9012", trailer: "TRL-003", assignedDate: "2026-03-05", status: "Detached" },
];

export default function VehicleTrailerAssignment() {
  return (
    <div>
      <PageHeader title="Vehicle-Trailer Assignment" subtitle="Assign trailers to vehicles"
        actions={<button className="h-9 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-glow hover:shadow-glow-lg hover:opacity-90 transition-all"><Plus className="w-4 h-4" /> New Assignment</button>}
      />
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Vehicle</th><th>Trailer</th><th>Assigned Date</th><th>Status</th><th className="w-20">Actions</th></tr></thead>
          <tbody>
            {mockData.map((d, i) => (
              <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="group">
                <td className="font-mono font-medium text-foreground">{d.vehicle}</td>
                <td><span className="font-mono text-xs px-2 py-1 rounded bg-secondary text-foreground">{d.trailer}</span></td>
                <td className="font-mono text-muted-foreground">{d.assignedDate}</td>
                <td><StatusBadge status={d.status} variant={d.status === "Active" ? "success" : "muted"} /></td>
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
