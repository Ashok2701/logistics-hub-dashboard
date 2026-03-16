import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";

const mockData = [
  { id: 1, code: "TRL-001", type: "Flatbed", capacity: "20 tons", status: "Available" },
  { id: 2, code: "TRL-002", type: "Enclosed", capacity: "15 tons", status: "In Use" },
  { id: 3, code: "TRL-003", type: "Refrigerated", capacity: "12 tons", status: "Maintenance" },
  { id: 4, code: "TRL-004", type: "Tanker", capacity: "25,000 L", status: "Available" },
];

export default function Trailers() {
  return (
    <div>
      <PageHeader title="Trailers" subtitle="Manage fleet trailers" actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Trailer</Button>} />
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Code</th><th>Type</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {mockData.map((d) => (
              <tr key={d.id}>
                <td className="font-mono font-medium">{d.code}</td>
                <td>{d.type}</td>
                <td>{d.capacity}</td>
                <td><span className={`text-caption font-medium px-2 py-0.5 rounded-sm ${d.status === "Available" ? "bg-success/10 text-success" : d.status === "Maintenance" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>{d.status}</span></td>
                <td><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
