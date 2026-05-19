import { useState, useMemo } from "react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { Plus, Search, FileText, RefreshCw, Check, X, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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

interface DocRow {
  id: number;
  document: string;
  docType: string;
  labelEng: string;
  labelFra: string;
  serviceTime: string; // HH:MM
  color: string;
}

const seed: DocRow[] = [
  { id: 1, document: "Purchase Receipt", docType: "REC", labelEng: "RECPT", labelFra: "RECPT", serviceTime: "01:00", color: "#3B82F6" },
  { id: 2, document: "Sales Delivery", docType: "SDN", labelEng: "DLV", labelFra: "DLV", serviceTime: "00:00", color: "#10B981" },
  { id: 3, document: "Sales Return", docType: "RTC", labelEng: "RTC", labelFra: "RTC", serviceTime: "00:00", color: "#F59E0B" },
  { id: 4, document: "Pick Ticket", docType: "BDP", labelEng: "PCKT", labelFra: "PCKT", serviceTime: "00:30", color: "#8B5CF6" },
];

const emptyRow = (id: number): DocRow => ({
  id, document: "", docType: "", labelEng: "", labelFra: "", serviceTime: "00:00", color: "#3B82F6",
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
  const [rows, setRows] = useState<DocRow[]>(seed);
  const [search, setSearch] = useState("");
  const [filterDoc, setFilterDoc] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DocRow | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter((r) => {
      if (filterDoc && r.document !== filterDoc) return false;
      if (!s) return true;
      return (
        r.document.toLowerCase().includes(s) ||
        r.docType.toLowerCase().includes(s) ||
        r.labelEng.toLowerCase().includes(s) ||
        r.labelFra.toLowerCase().includes(s)
      );
    });
  }, [rows, search, filterDoc]);

  const sort = useSortable(filtered);
  const sorted = sort.sorted;

  const startAdd = () => {
    const id = Math.max(0, ...rows.map((r) => r.id)) + 1;
    const newRow = emptyRow(id);
    setRows((prev) => [newRow, ...prev]);
    setEditingId(id);
    setDraft(newRow);
  };

  const startEdit = (row: DocRow) => {
    setEditingId(row.id);
    setDraft({ ...row });
  };

  const cancelEdit = () => {
    if (draft && !rows.find((r) => r.id === draft.id && r.document)) {
      // remove fresh empty row
      const original = rows.find((r) => r.id === draft.id);
      if (original && !original.document && !original.docType) {
        setRows((prev) => prev.filter((r) => r.id !== draft.id));
      }
    }
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!draft) return;
    if (!draft.document) { toast.error("Please select a document"); return; }
    if (!draft.docType) { toast.error("Doc Type is required"); return; }
    if (!/^\d{1,2}:\d{2}$/.test(draft.serviceTime)) { toast.error("Service time must be HH:MM"); return; }
    setRows((prev) => prev.map((r) => (r.id === draft.id ? draft : r)));
    toast.success("Saved");
    setEditingId(null);
    setDraft(null);
  };

  const deleteRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Deleted");
  };

  const refresh = () => {
    setRows(seed);
    setSearch("");
    setFilterDoc("");
    toast.success("Refreshed");
  };

  const update = <K extends keyof DocRow>(key: K, value: DocRow[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div>
      <PageHeader
        title="Document Configuration"
        subtitle="Configure document templates, labels & service times"
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
              <SortableTh sortKey="id" sort={sort} className="w-16">SR No</SortableTh>
              <SortableTh sortKey="document" sort={sort}>Document</SortableTh>
              <SortableTh sortKey="docType" sort={sort}>Doc Type</SortableTh>
              <SortableTh sortKey="labelEng" sort={sort}>Label (ENG)</SortableTh>
              <SortableTh sortKey="labelFra" sort={sort}>Label (FRA)</SortableTh>
              <SortableTh sortKey="serviceTime" sort={sort}>Service Time</SortableTh>
              <th>Color</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
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
                    <td className="font-mono text-xs text-muted-foreground">{r.id}</td>
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
                        <input
                          type="time"
                          value={draft!.serviceTime}
                          onChange={(e) => update("serviceTime", e.target.value)}
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 font-mono"
                        />
                      ) : (
                        <span className="font-mono text-foreground">{r.serviceTime}</span>
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
