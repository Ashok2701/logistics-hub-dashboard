import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";

const mockData = [
  { id: 1, vehicle: "ABC-1234", driver: "John Carter", assignedDate: "2026-03-10", status: "Active" },
  { id: 2, vehicle: "DEF-5678", driver: "Sarah Miles", assignedDate: "2026-03-08", status: "Active" },
  { id: 3, vehicle: "GHI-9012", driver: "Mike Chen", assignedDate: "2026-03-05", status: "Active" },
  { id: 4, vehicle: "MNO-7890", driver: "Lisa Brown", assignedDate: "2026-03-12", status: "Pending" },
];

export default function VehicleDriverAssignment() {
  return (
    <div>
      <PageHeader title="Vehicle-Driver Assignment" subtitle="Assign drivers to vehicles" actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Assignment</Button>} />
      <DataTableShell>
        <table className="data-table">
          <thead><tr><th>Vehicle</th><th>Driver</th><th>Assigned Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {mockData.map((d) => (
              <tr key={d.id}>
                <td className="font-mono font-medium">{d.vehicle}</td>
                <td>{d.driver}</td>
                <td className="font-mono text-muted-foreground">{d.assignedDate}</td>
                <td><span className={`text-caption font-medium px-2 py-0.5 rounded-sm ${d.status === "Active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{d.status}</span></td>
                <td><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
