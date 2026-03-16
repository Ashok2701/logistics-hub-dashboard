import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";

const mockData = [
  { id: 1, vehicle: "ABC-1234", trailer: "TRL-001", assignedDate: "2026-03-10", status: "Active" },
  { id: 2, vehicle: "DEF-5678", trailer: "TRL-002", assignedDate: "2026-03-08", status: "Active" },
  { id: 3, vehicle: "GHI-9012", trailer: "TRL-003", assignedDate: "2026-03-05", status: "Detached" },
];

export default function VehicleTrailerAssignment() {
  return (
    <div>
      <PageHeader title="Vehicle-Trailer Assignment" subtitle="Assign trailers to vehicles" actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Assignment</Button>} />
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Vehicle</th><th>Trailer</th><th>Assigned Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {mockData.map((d) => (
              <tr key={d.id}>
                <td className="font-mono font-medium">{d.vehicle}</td>
                <td className="font-mono">{d.trailer}</td>
                <td className="font-mono text-muted-foreground">{d.assignedDate}</td>
                <td><span className={`text-caption font-medium px-2 py-0.5 rounded-sm ${d.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{d.status}</span></td>
                <td><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
