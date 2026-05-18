import { useState } from "react";
import { PageHeader, DataTableShell, StatusDot } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { RefreshCw, FileText, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const syncData = [
  { object: "Customers", erpCount: 1245, localCount: 1243, lastSync: "2026-03-16 08:30:00", status: "syncing" as const },
  { object: "Products", erpCount: 3891, localCount: 3891, lastSync: "2026-03-16 08:15:00", status: "active" as const },
  { object: "Orders", erpCount: 8723, localCount: 8720, lastSync: "2026-03-16 07:45:00", status: "error" as const },
  { object: "Suppliers", erpCount: 456, localCount: 456, lastSync: "2026-03-16 08:30:00", status: "active" as const },
  { object: "Entities", erpCount: 28, localCount: 28, lastSync: "2026-03-16 06:00:00", status: "idle" as const },
];

export default function SyncCenter() {
  const [syncing, setSyncing] = useState<string | null>(null);

  const sort = useSortable(syncData);
  const sorted = sort.sorted;

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
          <button
            onClick={() => handleSync("all")}
            className="btn-gradient h-9 px-4 rounded-lg text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing === "all" ? "animate-spin" : ""}`} />
            Sync All
          </button>
        }
      />

      <DataTableShell>
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh sortKey="object" sort={sort}>Object</SortableTh>
              <SortableTh sortKey="intacctCount" sort={sort}>Intacct Count</SortableTh>
              <SortableTh sortKey="localCount" sort={sort}>Local Count</SortableTh>
              <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
              <SortableTh sortKey="lastSync" sort={sort}>Last Sync</SortableTh>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => (
              <motion.tr key={d.object} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                <td className="font-medium text-foreground">{d.object}</td>
                <td className="font-mono text-foreground">{d.intacctCount.toLocaleString()}</td>
                <td className="font-mono text-foreground">
                  {d.localCount.toLocaleString()}
                  {d.intacctCount !== d.localCount && (
                    <span className="ml-2 text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                      -{d.intacctCount - d.localCount}
                    </span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <StatusDot status={syncing === d.object || syncing === "all" ? "syncing" : d.status} />
                    <span className="text-xs capitalize text-muted-foreground">{syncing === d.object || syncing === "all" ? "Syncing..." : d.status}</span>
                  </div>
                </td>
                <td className="font-mono text-xs text-muted-foreground">{d.lastSync}</td>
                <td>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleSync(d.object)}
                      disabled={syncing === d.object || syncing === "all"}
                      className="btn-outline-theme h-7 px-2.5 text-[11px] flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing === d.object ? "animate-spin" : ""}`} /> Sync
                    </button>
                    <button className="h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 transition-all duration-200">
                      <FileText className="w-3 h-3" /> Logs
                    </button>
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
