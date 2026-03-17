import { useState } from "react";
import { PageHeader, DataTableShell, StatusBadge } from "@/components/shared/MetricCard";
import { Plus, Search, Edit, Trash2, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";

const mockData = [
  { id: 1, vehicle: "ABC-1234", driver: "John Carter", assignedDate: "2026-03-10", status: "Active" },
  { id: 2, vehicle: "DEF-5678", driver: "Sarah Miles", assignedDate: "2026-03-08", status: "Active" },
  { id: 3, vehicle: "GHI-9012", driver: "Mike Chen", assignedDate: "2026-03-05", status: "Active" },
  { id: 4, vehicle: "MNO-7890", driver: "Lisa Brown", assignedDate: "2026-03-12", status: "Pending" },
];

export default function VehicleDriverAssignment() {
  const [search, setSearch] = useState("");
  const filtered = mockData.filter((d) => d.driver.toLowerCase().includes(search.toLowerCase()) || d.vehicle.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Vehicle-Driver Assignment" subtitle="Assign drivers to vehicles"
        actions={
          <button className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200">
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        }
      />
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search assignments..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft transition-all duration-200" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} assignments</p>
      </div>
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Vehicle</th><th>Driver</th><th>Assigned Date</th><th>Status</th><th className="w-20">Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12"><FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No assignments found</p></td></tr>
            ) : (
              filtered.map((d, i) => (
                <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="group cursor-default">
                  <td className="font-mono font-medium text-foreground">{d.vehicle}</td>
                  <td className="text-foreground">{d.driver}</td>
                  <td className="font-mono text-muted-foreground">{d.assignedDate}</td>
                  <td><StatusBadge status={d.status} variant={d.status === "Active" ? "success" : "warning"} /></td>
                  <td>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-150"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
