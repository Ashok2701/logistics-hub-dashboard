import { useState } from "react";
import { PageHeader, DataTableShell, StatusBadge } from "@/components/shared/MetricCard";
import { Plus, Search, Edit, Trash2, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";

const mockData = [
  { id: 1, plate: "ABC-1234", vin: "1HGCM82633A004352", type: "Heavy Truck", status: "Active", driver: "John Carter" },
  { id: 2, plate: "DEF-5678", vin: "2FMDK3GC4BBA12345", type: "Light Van", status: "In Service", driver: "Sarah Miles" },
  { id: 3, plate: "GHI-9012", vin: "3VWDX7AJ5BM345678", type: "Refrigerated", status: "Active", driver: "Mike Chen" },
  { id: 4, plate: "JKL-3456", vin: "5YJSA1DN5DFP12345", type: "Flatbed", status: "Maintenance", driver: "—" },
  { id: 5, plate: "MNO-7890", vin: "WAUDFAFL0DA123456", type: "Tanker", status: "Active", driver: "Lisa Brown" },
];

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const filtered = mockData.filter((d) => d.plate.toLowerCase().includes(search.toLowerCase()) || d.driver.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl">
      <PageHeader title="Vehicles" subtitle="Fleet vehicle inventory"
        actions={
          <button className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200">
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        }
      />
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search by plate or driver..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft transition-all duration-200" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} vehicles</p>
      </div>
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Plate</th><th>VIN</th><th>Type</th><th>Status</th><th>Driver</th><th className="w-20">Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12"><FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No vehicles found</p></td></tr>
            ) : (
              filtered.map((d, i) => (
                <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="group cursor-default">
                  <td className="font-mono font-medium text-foreground">{d.plate}</td>
                  <td className="font-mono text-xs text-muted-foreground">{d.vin}</td>
                  <td className="text-foreground">{d.type}</td>
                  <td><StatusBadge status={d.status} variant={d.status === "Active" ? "success" : d.status === "Maintenance" ? "warning" : "primary"} /></td>
                  <td className="text-foreground">{d.driver}</td>
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
