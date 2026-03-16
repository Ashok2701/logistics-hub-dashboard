import { useState } from "react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

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
    <div>
      <PageHeader title="Vehicles" subtitle="Fleet vehicle inventory" actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Vehicle</Button>} />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by plate or driver..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8" />
        </div>
      </div>
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Plate</th><th>VIN</th><th>Type</th><th>Status</th><th>Driver</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className={d.status === "Maintenance" ? "status-ribbon-delayed" : "status-ribbon-active"}>
                <td className="font-mono font-medium">{d.plate}</td>
                <td className="font-mono text-caption text-muted-foreground">{d.vin}</td>
                <td>{d.type}</td>
                <td>
                  <span className={`text-caption font-medium px-2 py-0.5 rounded-sm ${d.status === "Active" ? "bg-success/10 text-success" : d.status === "Maintenance" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>{d.status}</span>
                </td>
                <td>{d.driver}</td>
                <td>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
