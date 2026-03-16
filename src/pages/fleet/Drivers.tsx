import { useState } from "react";
import { PageHeader, DataTableShell, StatusBadge } from "@/components/shared/MetricCard";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const mockData = [
  { id: 1, name: "John Carter", license: "DL-98234", phone: "+1 555-0101", status: "Available", trips: 142 },
  { id: 2, name: "Sarah Miles", license: "DL-76521", phone: "+1 555-0102", status: "On Route", trips: 98 },
  { id: 3, name: "Mike Chen", license: "DL-43219", phone: "+1 555-0103", status: "Available", trips: 210 },
  { id: 4, name: "Lisa Brown", license: "DL-55432", phone: "+1 555-0104", status: "On Break", trips: 65 },
  { id: 5, name: "Tom Wilson", license: "DL-11298", phone: "+1 555-0105", status: "Available", trips: 178 },
];

export default function Drivers() {
  const [search, setSearch] = useState("");
  const filtered = mockData.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Drivers" subtitle="Manage fleet drivers"
        actions={<button className="h-9 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-glow hover:shadow-glow-lg hover:opacity-90 transition-all"><Plus className="w-4 h-4" /> Add Driver</button>}
      />
      <div className="flex items-center gap-3 mb-5">
        <div className="relative group flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-10 pr-4 rounded-lg bg-secondary/70 border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all" />
        </div>
      </div>
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Name</th><th>License</th><th>Phone</th><th>Status</th><th>Total Trips</th><th className="w-20">Actions</th></tr></thead>
          <tbody>
            {filtered.map((d, i) => (
              <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="group">
                <td className="font-medium text-foreground">{d.name}</td>
                <td className="font-mono text-muted-foreground">{d.license}</td>
                <td className="font-mono text-muted-foreground">{d.phone}</td>
                <td><StatusBadge status={d.status} variant={d.status === "Available" ? "success" : d.status === "On Route" ? "primary" : "muted"} /></td>
                <td className="font-mono text-foreground">{d.trips}</td>
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
