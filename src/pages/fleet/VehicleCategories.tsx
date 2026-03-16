import { useState } from "react";
import { PageHeader, DataTableShell, StatusBadge } from "@/components/shared/MetricCard";
import { Plus, Search, Edit, Trash2, MoreHorizontal } from "lucide-react";
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
          <button className="h-9 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-glow hover:shadow-glow-lg hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        }
      />

      <div className="flex items-center gap-3 mb-5">
        <div className="relative group flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-secondary/70 border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <DataTableShell>
        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Name</th><th>Capacity</th><th>Vehicles</th><th className="w-20">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <motion.tr 
                key={d.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="group"
              >
                <td><span className="font-mono text-xs px-2 py-1 rounded bg-secondary text-foreground">{d.code}</span></td>
                <td className="font-medium text-foreground">{d.name}</td>
                <td className="text-muted-foreground">{d.capacity}</td>
                <td className="font-mono text-foreground">{d.count}</td>
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
