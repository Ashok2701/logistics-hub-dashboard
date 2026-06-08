import { useState, useMemo, useEffect } from "react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { Plus, Search, FileText, RefreshCw, Check, X, Edit, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { documentConfigApi, type DocumentConfig } from "@/lib/documentConfigApi";

const DOC_OPTIONS = [
  "Sales Order",
  "Purchase Order",
  "Sales Delivery",
  "Purchase Receipt",
  "Purchase Return",
  "Sales Return",
  "Pick Ticket",
];

const PRESET_COLORS = [
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F97316", "#F59E0B", "#10B981", "#14B8A6", "#0EA5E9",
  "#64748B", "#1F2937",
];

type DocRow = DocumentConfig;

const TEMP_PREFIX = "__new__";
const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);

const emptyRow = (id: string): DocRow => ({
  id, document: "", docType: "", labelEng: "", labelFra: "", color: "#3B82F6", active: true,
});

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-2 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors"
      >
        <span className="w-5 h-5 rounded-md border border-border/60" style={{ backgroundColor: value }} />
        <span className="text-xs font-mono text-muted-foreground">{value}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-elevated p-3 w-56">
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                  className="w-7 h-7 rounded-md border border-border/60 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 h-8 px-2 rounded-md border border-border bg-background text-xs font-mono"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function DocumentConfiguration() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDoc, setFilterDoc] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DocRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await documentConfigApi.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load document configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter((r) => {
      if (filterDoc && r.document !== filterDoc) return false;
      if (!s) return true;
      return (
        (r.document || "").toLowerCase().includes(s) ||
        (r.docType || "").toLowerCase().includes(s) ||
        (r.labelEng || "").toLowerCase().includes(s) ||
        (r.labelFra || "").toLowerCase().includes(s)
      );
    });
  }, [rows, search, filterDoc]);

  const sort = useSortable(filtered);
  const sorted = sort.sorted;

  const startAdd = () => {
    const tempId = `${TEMP_PREFIX}${Date.now()}`;
    const newRow = emptyRow(tempId);
    setRows((prev) => [newRow, ...prev]);
    setEditingId(tempId);
    setDraft(newRow);
  };

  const startEdit = (row: DocRow) => {
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
    if (!draft.document) { toast.error("Please select a document"); return; }
    if (!draft.docType) { toast.error("Doc Type is required"); return; }
    setSaving(true);
    try {
      const isNew = isTempId(draft.id);
      const { id, ...payload } = draft;
      const saved = isNew
        ? await documentConfigApi.create(payload)
        : await documentConfigApi.update(draft.id, payload);
      setRows((prev) =>
        isNew
          ? prev.map((r) => (r.id === draft.id ? saved : r))
          : prev.map((r) => (r.id === draft.id ? saved : r))
      );
      toast.success("Saved");
      setEditingId(null);
      setDraft(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id: number) => {
    try {
      await documentConfigApi.remove(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const refresh = () => {
    setSearch("");
    setFilterDoc("");
    load();
  };

  const update = <K extends keyof DocRow>(key: K, value: DocRow[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div>
      <PageHeader
        title="Document Configuration"
        subtitle="Configure document templates, labels & colors"
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
              <Plus className="w-4 h-4" /> Add New Item
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          <select
            value={filterDoc}
            onChange={(e) => setFilterDoc(e.target.value)}
            className="h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft"
          >
            <option value="">All Documents</option>
            {DOC_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search document..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft transition-all"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} items</p>
      </div>

      <DataTableShell>
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh sortKey="document" sort={sort}>Document</SortableTh>
              <SortableTh sortKey="docType" sort={sort}>Doc Type</SortableTh>
              <SortableTh sortKey="labelEng" sort={sort}>Display Name (English)</SortableTh>
              <SortableTh sortKey="labelFra" sort={sort}>Display Name (French)</SortableTh>
              <th>Color</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No documents found</p>
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
                        <select
                          value={draft!.document}
                          onChange={(e) => update("document", e.target.value)}
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 w-full"
                        >
                          <option value="">Select...</option>
                          {DOC_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : (
                        <span className="font-medium text-foreground">{r.document || <em className="text-muted-foreground/60">—</em>}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={draft!.docType}
                          onChange={(e) => update("docType", e.target.value.toUpperCase())}
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 w-full font-mono"
                          placeholder="e.g. REC"
                        />
                      ) : (
                        <span className="font-mono text-xs px-2 py-1 rounded-md bg-muted">{r.docType}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={draft!.labelEng}
                          onChange={(e) => update("labelEng", e.target.value)}
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 w-full"
                        />
                      ) : (
                        <span className="text-foreground">{r.labelEng}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={draft!.labelFra}
                          onChange={(e) => update("labelFra", e.target.value)}
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 w-full"
                        />
                      ) : (
                        <span className="text-foreground">{r.labelFra}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <ColorPicker value={draft!.color} onChange={(v) => update("color", v)} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md border border-border/60 shadow-sm" style={{ backgroundColor: r.color }} />
                          <span className="font-mono text-xs text-muted-foreground">{r.color}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveEdit}
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
