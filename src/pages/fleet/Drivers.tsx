import { useState } from "react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

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
      <PageHeader title="Drivers" subtitle="Manage fleet drivers" actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Driver</Button>} />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8" />
        </div>
      </div>
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Name</th><th>License</th><th>Phone</th><th>Status</th><th>Total Trips</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{d.name}</td>
                <td className="font-mono">{d.license}</td>
                <td className="font-mono text-muted-foreground">{d.phone}</td>
                <td><span className={`text-caption font-medium px-2 py-0.5 rounded-sm ${d.status === "Available" ? "bg-success/10 text-success" : d.status === "On Route" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{d.status}</span></td>
                <td className="font-mono">{d.trips}</td>
                <td><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
