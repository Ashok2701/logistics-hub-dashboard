import { useState } from "react";
import { PageHeader, DataTableShell, StatusDot } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText } from "lucide-react";

const syncData = [
  { object: "Customers", intacctCount: 1245, localCount: 1243, lastSync: "2026-03-16 08:30:00", status: "syncing" as const },
  { object: "Products", intacctCount: 3891, localCount: 3891, lastSync: "2026-03-16 08:15:00", status: "active" as const },
  { object: "Orders", intacctCount: 8723, localCount: 8720, lastSync: "2026-03-16 07:45:00", status: "error" as const },
  { object: "Suppliers", intacctCount: 456, localCount: 456, lastSync: "2026-03-16 08:30:00", status: "active" as const },
  { object: "Entities", intacctCount: 28, localCount: 28, lastSync: "2026-03-16 06:00:00", status: "idle" as const },
];

export default function SyncCenter() {
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleSync = (object: string) => {
    setSyncing(object);
    setTimeout(() => setSyncing(null), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Sync Center"
        subtitle="Data synchronization dashboard"
        actions={
          <Button size="sm" onClick={() => handleSync("all")}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing === "all" ? "animate-spin" : ""}`} />
            Sync All
          </Button>
        }
      />

      <DataTableShell>
        <table className="data-table">
          <thead>
            <tr>
              <th>Object</th>
              <th>Intacct Count</th>
              <th>Local Count</th>
              <th>Status</th>
              <th>Last Sync</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {syncData.map((d) => (
              <tr key={d.object}>
                <td className="font-medium">{d.object}</td>
                <td className="font-mono">{d.intacctCount.toLocaleString()}</td>
                <td className="font-mono">{d.localCount.toLocaleString()}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <StatusDot status={syncing === d.object || syncing === "all" ? "syncing" : d.status} />
                    <span className="text-caption capitalize">{syncing === d.object || syncing === "all" ? "Syncing..." : d.status}</span>
                  </div>
                </td>
                <td className="font-mono text-caption text-muted-foreground">{d.lastSync}</td>
                <td>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-caption"
                      onClick={() => handleSync(d.object)}
                      disabled={syncing === d.object || syncing === "all"}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing === d.object ? "animate-spin" : ""}`} />
                      Sync
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-caption">
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Logs
                    </Button>
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
