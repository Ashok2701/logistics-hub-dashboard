import { useState, useMemo, useEffect } from "react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { Plus, Search, ListChecks, RefreshCw, Check, X, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { reasonConfigApi, REASON_TYPES, type Reason, type ReasonType } from "@/lib/reasonConfigApi";

const TEMP_PREFIX = "__new__";
const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);

const emptyRow = (id: string): Reason => ({ id, description: "", type: "", active: true });

const typeLabel = (t: string) => REASON_TYPES.find((r) => r.value === t)?.label ?? t;

export default function ReasonConfiguration() {
  const [rows, setRows] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Reason | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await reasonConfigApi.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load reasons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter((r) => {
      if (filterType && r.type !== filterType) return false;
      if (!s) return true;
      return (r.description || "").toLowerCase().includes(s);
    });
  }, [rows, search, filterType]);

  const sort = useSortable(filtered);
  const sorted = sort.sorted;

  const startAdd = () => {
    const tempId = `${TEMP_PREFIX}${Date.now()}`;
    const newRow = emptyRow(tempId);
    setRows((prev) => [newRow, ...prev]);
    setEditingId(tempId);
    setDraft(newRow);
  };

  const startEdit = (row: Reason) => {
    setEditingId(row.id);
    setDraft({ ...row });
  };

  const cancelEdit = () => {
    if (draft && isTempId(draft.id)) {
      setRows((prev) => prev.filter((r) => r.id !== draft.id));
    }
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!draft) return;
    if (!draft.description.trim()) { toast.error("Description is required"); return; }
    if (!draft.type) { toast.error("Type is required"); return; }
    setSaving(true);
    try {
      const isNew = isTempId(draft.id);
      const { id, ...payload } = draft;
      const saved = isNew
        ? await reasonConfigApi.create(payload)
        : await reasonConfigApi.update(draft.id, payload);
      setRows((prev) => prev.map((r) => (r.id === draft.id ? saved : r)));
      toast.success("Saved");
      setEditingId(null);
      setDraft(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id: string) => {
    try {
      await reasonConfigApi.remove(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const toggleActive = async (row: Reason) => {
    try {
      const saved = await reasonConfigApi.toggleActive(row.id);
      setRows((prev) => prev.map((r) => (r.id === row.id ? saved : r)));
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    }
  };

  const refresh = () => { setSearch(""); setFilterType(""); load(); };

  const update = <K extends keyof Reason>(key: K, value: Reason[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div>
      <PageHeader
        title="Reason Configuration"
        subtitle="Configure reasons for Reschedule, Cancel, Skip & Partial Delivery"
        actions={
          <>
            <button
              onClick={refresh}
              className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={startAdd}
              disabled={editingId !== null}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Add New Reason
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft"
          >
            <option value="">All Types</option>
            {REASON_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft transition-all"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} Reasons</p>
      </div>

      <DataTableShell>
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh sortKey="description" sort={sort}>Reason Description</SortableTh>
              <SortableTh sortKey="type" sort={sort}>Type</SortableTh>
              <th>Status</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12">
                  <ListChecks className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No reasons found</p>
                </td>
              </tr>
            ) : (
              sorted.map((r, i) => {
                const isEditing = editingId === r.id && draft;
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="group"
                  >
                    <td>
                      {isEditing ? (
                        <input
                          value={draft!.description}
                          onChange={(e) => update("description", e.target.value)}
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 w-full"
                          placeholder="e.g. Customer Requested"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-foreground">{r.description || <em className="text-muted-foreground/60">—</em>}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={draft!.type}
                          onChange={(e) => update("type", e.target.value as ReasonType)}
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 w-full"
                        >
                          <option value="">Select...</option>
                          {REASON_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      ) : (
                        <span className="font-mono text-xs px-2 py-1 rounded-md bg-muted">{r.type ? typeLabel(r.type) : "—"}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draft!.active}
                            onChange={(e) => update("active", e.target.checked)}
                            className="w-4 h-4 rounded border-border accent-primary"
                          />
                          <span className="text-xs text-muted-foreground">Active</span>
                        </label>
                      ) : (
                        <button
                          onClick={() => toggleActive(r)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full transition-colors ${
                            r.active
                              ? "bg-success/10 text-success hover:bg-success/20"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          {r.active ? "Active" : "Inactive"}
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-success hover:bg-success/10 hover:scale-110 transition-all"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 hover:scale-110 transition-all"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(r)}
                              disabled={editingId !== null}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/8 hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRow(r.id)}
                              disabled={editingId !== null}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/8 hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
