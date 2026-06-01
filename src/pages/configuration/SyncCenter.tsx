import { useEffect, useState } from "react";
import { PageHeader, DataTableShell, MetricCard } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { RefreshCw, FileText, Database, CheckCircle2, XCircle, Clock, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { syncApi, type SyncStatus, type SyncLog } from "@/lib/fleetApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function fmtDt(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function statusClasses(status: string) {
  switch ((status || "").toUpperCase()) {
    case "SUCCESS":
      return "bg-success/10 text-success border-success/20";
    case "PARTIAL":
      return "bg-warning/10 text-warning border-warning/20";
    case "FAILED":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "RUNNING":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function SyncCenter() {
  const [rows, setRows] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const [logsOpen, setLogsOpen] = useState(false);
  const [logsObj, setLogsObj] = useState<string>("");
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const sort = useSortable(rows);

  const load = async () => {
    setLoading(true);
    try {
      const data = await syncApi.status();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load sync status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runSync = async (objectCode: string, objectName: string) => {
    setBusy(objectCode);
    try {
      await syncApi.sync(objectCode);
      toast.success(`${objectName} Sync Completed Successfully`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || `${objectName} sync failed`);
    } finally {
      setBusy(null);
    }
  };

  const runSyncAll = async () => {
    setConfirmAll(false);
    setBusy("__all__");
    try {
      await syncApi.syncAll();
      toast.success("All Sync Completed Successfully");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Sync All failed");
    } finally {
      setBusy(null);
    }
  };

  const openLogs = async (objectCode: string) => {
    setLogsObj(objectCode);
    setLogsOpen(true);
    setLogsLoading(true);
    setLogs([]);
    try {
      const data = await syncApi.logs(objectCode);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const total = rows.length;
  const successCount = rows.filter((r) => r.status?.toUpperCase() === "SUCCESS").length;
  const failedCount = rows.filter((r) => ["FAILED", "PARTIAL"].includes((r.status || "").toUpperCase())).length;
  const lastSync = rows
    .map((r) => r.lastSyncTime)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div>
      <PageHeader
        title="Master Data Sync"
        subtitle="Sage X3 → PostgreSQL synchronization"
        actions={
          <button
            onClick={() => setConfirmAll(true)}
            disabled={busy !== null}
            className="btn-gradient h-9 px-4 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", busy === "__all__" && "animate-spin")} />
            Sync All
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Objects" value={total} icon={Database} index={0} />
        <MetricCard title="Successful Syncs" value={successCount} icon={CheckCircle2} index={3} />
        <MetricCard title="Issues" value={failedCount} icon={XCircle} index={7} />
        <MetricCard
          title="Last Sync"
          value={lastSync ? new Date(lastSync).toLocaleTimeString() : "—"}
          icon={Clock}
          index={1}
        />
      </div>

      <DataTableShell>
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh sortKey="objectName" sort={sort}>Object Name</SortableTh>
              <SortableTh sortKey="x3Count" sort={sort}>X3 Count</SortableTh>
              <SortableTh sortKey="postgresCount" sort={sort}>PostgreSQL Count</SortableTh>
              <SortableTh sortKey="differenceCount" sort={sort}>Difference</SortableTh>
              <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
              <SortableTh sortKey="lastSyncTime" sort={sort}>Last Sync Time</SortableTh>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Loading...</td></tr>
            )}
            {!loading && sort.sorted.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No sync objects</td></tr>
            )}
            {!loading && sort.sorted.map((d, i) => {
              const isBusy = busy === d.objectCode || busy === "__all__";
              const diff = d.differenceCount ?? (d.x3Count - d.postgresCount);
              return (
                <motion.tr key={d.objectCode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <td className="font-medium text-foreground">{d.objectName}</td>
                  <td className="font-mono text-foreground">{d.x3Count?.toLocaleString?.() ?? d.x3Count}</td>
                  <td className="font-mono text-foreground">{d.postgresCount?.toLocaleString?.() ?? d.postgresCount}</td>
                  <td>
                    {diff === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" /> Matched
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-warning/10 text-warning" title="Missing records in PostgreSQL">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning" /> {diff} missing
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border", statusClasses(isBusy ? "RUNNING" : d.status))}>
                      {isBusy ? "RUNNING" : d.status}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-muted-foreground">{fmtDt(d.lastSyncTime)}</td>
                  <td>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => runSync(d.objectCode, d.objectName)}
                        disabled={isBusy}
                        className="btn-outline-theme h-7 px-2.5 text-[11px] flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <RefreshCw className={cn("w-3 h-3", busy === d.objectCode && "animate-spin")} /> Sync
                      </button>
                      <button
                        onClick={() => openLogs(d.objectCode)}
                        className="h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 transition-all duration-200"
                      >
                        <FileText className="w-3 h-3" /> Logs
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </DataTableShell>

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync All Master Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will synchronize all master data from Sage X3. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runSyncAll}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Sync History — {logsObj}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Completed</th>
                  <th>X3</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Inserted</th>
                  <th>Updated</th>
                  <th>Failed</th>
                  <th>Status</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading && (
                  <tr><td colSpan={10} className="text-center text-muted-foreground py-6">Loading...</td></tr>
                )}
                {!logsLoading && logs.length === 0 && (
                  <tr><td colSpan={10} className="text-center text-muted-foreground py-6">No history</td></tr>
                )}
                {!logsLoading && logs.map((l) => (
                  <tr key={l.syncId}>
                    <td className="font-mono text-xs">{fmtDt(l.startedAt)}</td>
                    <td className="font-mono text-xs">{fmtDt(l.completedAt)}</td>
                    <td className="font-mono">{l.x3Count}</td>
                    <td className="font-mono">{l.postgresBeforeCount}</td>
                    <td className="font-mono">{l.postgresAfterCount}</td>
                    <td className="font-mono text-success">{l.insertedCount}</td>
                    <td className="font-mono text-primary">{l.updatedCount}</td>
                    <td className="font-mono text-destructive">{l.failedCount}</td>
                    <td>
                      <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border", statusClasses(l.status))}>
                        {l.status}
                      </span>
                    </td>
                    <td className="text-xs text-destructive max-w-xs truncate" title={l.errorMessage || ""}>{l.errorMessage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
