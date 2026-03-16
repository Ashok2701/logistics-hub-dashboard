import { useState } from "react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

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
        actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Category</Button>}
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8" />
        </div>
      </div>

      <DataTableShell>
        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Name</th><th>Capacity</th><th>Vehicles</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td className="font-mono">{d.code}</td>
                <td className="font-medium">{d.name}</td>
                <td>{d.capacity}</td>
                <td className="font-mono">{d.count}</td>
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
