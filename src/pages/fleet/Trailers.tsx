import { useState } from "react";
import { PageHeader, DataTableShell, StatusBadge } from "@/components/shared/MetricCard";
import { RowActions } from "@/components/shared/RowActions";
import { Plus, Search, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";

const mockData = [
  { id: 1, code: "TRL-001", type: "Flatbed", capacity: "20 tons", status: "Available" },
  { id: 2, code: "TRL-002", type: "Enclosed", capacity: "15 tons", status: "In Use" },
  { id: 3, code: "TRL-003", type: "Refrigerated", capacity: "12 tons", status: "Maintenance" },
  { id: 4, code: "TRL-004", type: "Tanker", capacity: "25,000 L", status: "Available" },
];

export default function Trailers() {
  const [search, setSearch] = useState("");
  const filtered = mockData.filter((d) => d.type.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Trailers" subtitle="Manage fleet trailers"
        actions={
          <button className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200">
            <Plus className="w-4 h-4" /> Add Trailer
          </button>
        }
      />
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search trailers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft transition-all duration-200" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} trailers</p>
      </div>
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Code</th><th>Type</th><th>Capacity</th><th>Status</th><th className="w-24 text-right">Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12"><FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No trailers found</p></td></tr>
            ) : (
              filtered.map((d, i) => (
                <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="group cursor-default">
                  <td><span className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-foreground">{d.code}</span></td>
                  <td className="font-medium text-foreground">{d.type}</td>
                  <td className="text-muted-foreground">{d.capacity}</td>
                  <td><StatusBadge status={d.status} variant={d.status === "Available" ? "success" : d.status === "Maintenance" ? "warning" : "primary"} /></td>
                  <td><RowActions /></td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
