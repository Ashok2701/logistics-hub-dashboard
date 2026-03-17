import { useState } from "react";
import { PageHeader, DataTableShell, StatusBadge } from "@/components/shared/MetricCard";
import { Plus, Search, Edit, Trash2, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";

const mockData = [
  { id: 1, name: "Heavy Truck", code: "HT", capacity: "20 tons", count: 45 },
  { id: 2, name: "Light Van", code: "LV", capacity: "2 tons", count: 32 },
  { id: 3, name: "Refrigerated", code: "RF", capacity: "10 tons", count: 18 },
  { id: 4, name: "Flatbed", code: "FB", capacity: "15 tons", count: 27 },
  { id: 5, name: "Tanker", code: "TK", capacity: "25,000 L", count: 12 },
];

export default function VehicleCategories() {
  const [search, setSearch] = useState("");
  const filtered = mockData.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Vehicle Categories"
        subtitle="Manage vehicle classification types"
        actions={
          <button className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        }
      />

      {/* Controls bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft transition-all duration-200"
          />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} categories</p>
      </div>

      <DataTableShell>
        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Name</th><th>Capacity</th><th>Vehicles</th><th className="w-20">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No categories found</p>
                </td>
              </tr>
            ) : (
              filtered.map((d, i) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="group cursor-default"
                >
                  <td><span className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-foreground">{d.code}</span></td>
                  <td className="font-medium text-foreground">{d.name}</td>
                  <td className="text-muted-foreground">{d.capacity}</td>
                  <td className="font-mono text-foreground">{d.count}</td>
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
