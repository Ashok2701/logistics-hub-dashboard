import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { Plus, Search, FileText, RefreshCw, Check, X, Edit, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { documentConfigApi, type DocumentConfig } from "@/lib/documentConfigApi";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DOC_OPTIONS = [
  "Sales Order",
  "Purchase Order",
  "Sales Delivery",
  "Purchase Receipt",
  "Purchase Return",
  "Sales Return",
  "Pick Ticket",
];

const PALETTE: { hex: string; name: string }[] = [
  { hex: "#EF4444", name: "Red" },          { hex: "#DC2626", name: "Crimson" },     { hex: "#B91C1C", name: "Dark Red" },
  { hex: "#F97316", name: "Orange" },       { hex: "#EA580C", name: "Burnt Orange" },{ hex: "#F59E0B", name: "Amber" },
  { hex: "#EAB308", name: "Yellow" },       { hex: "#CA8A04", name: "Gold" },        { hex: "#84CC16", name: "Lime" },
  { hex: "#22C55E", name: "Light Green" },  { hex: "#10B981", name: "Emerald Green" },{ hex: "#16A34A", name: "Green" },
  { hex: "#15803D", name: "Forest Green" }, { hex: "#14B8A6", name: "Teal" },        { hex: "#0D9488", name: "Dark Teal" },
  { hex: "#06B6D4", name: "Cyan" },         { hex: "#0EA5E9", name: "Sky Blue" },    { hex: "#3B82F6", name: "Blue" },
  { hex: "#2563EB", name: "Royal Blue" },   { hex: "#1D4ED8", name: "Navy Blue" },   { hex: "#6366F1", name: "Indigo" },
  { hex: "#8B5CF6", name: "Violet" },       { hex: "#7C3AED", name: "Purple" },      { hex: "#A855F7", name: "Light Purple" },
  { hex: "#D946EF", name: "Magenta" },      { hex: "#EC4899", name: "Pink" },        { hex: "#F43F5E", name: "Rose" },
  { hex: "#FB7185", name: "Coral" },        { hex: "#A16207", name: "Brown" },       { hex: "#78350F", name: "Dark Brown" },
  { hex: "#94A3B8", name: "Light Slate" },  { hex: "#64748B", name: "Slate" },       { hex: "#475569", name: "Dark Slate" },
  { hex: "#9CA3AF", name: "Grey" },         { hex: "#6B7280", name: "Dark Grey" },   { hex: "#374151", name: "Graphite" },
  { hex: "#1F2937", name: "Charcoal" },     { hex: "#111827", name: "Near Black" },  { hex: "#000000", name: "Black" },
];

const COLOR_NAMES: Record<string, string> = Object.fromEntries(PALETTE.map((c) => [c.hex, c.name]));

// Colour name: the exact palette name when the colour is one of them (any letter case),
// otherwise the nearest palette name, shown as "Custom <name>".
const colorName = (hex: string): string => {
  const h = (hex || "").trim().toUpperCase();
  if (COLOR_NAMES[h]) return COLOR_NAMES[h];
  const m = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/.exec(h);
  if (!m) return "Custom";
  const rgb = [1, 2, 3].map((i) => parseInt(m[i], 16));
  let best = "", bd = Infinity;
  for (const c of PALETTE) {
    const d = [1, 3, 5].reduce((a, i, j) => a + (parseInt(c.hex.slice(i, i + 2), 16) - rgb[j]) ** 2, 0);
    if (d < bd) { bd = d; best = c.name; }
  }
  return best ? `Custom (${best})` : "Custom";
};

type DocRow = DocumentConfig;

const TEMP_PREFIX = "__new__";
const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);

const emptyRow = (id: string): DocRow => ({
  id, document: "", docType: "", labelEng: "", labelFra: "", color: "#3B82F6", active: true,
});

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const current = (value || "").toUpperCase();

  // Keep the popup inside the window: open it to the left when there is no room on the right.
  const rect = open && btnRef.current ? btnRef.current.getBoundingClientRect() : null;
  const POP_W = 320;
  const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - POP_W - 8)) : 0;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors min-w-[150px]"
      >
        <span className="w-5 h-5 shrink-0 rounded-md border border-border/60" style={{ backgroundColor: value }} />
        <span className="text-xs text-foreground whitespace-nowrap">{colorName(value)}</span>
      </button>
      {open && rect && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 bg-card border border-border rounded-xl shadow-elevated p-3"
               style={{ top: rect.bottom + 4, left, width: POP_W }}>
            <div className="grid grid-cols-8 gap-1.5 mb-3">
              {PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => { onChange(c.hex); setOpen(false); }}
                  title={c.name}
                  className={cn(
                    "w-8 h-8 rounded-md border hover:scale-110 transition-transform",
                    current === c.hex ? "border-foreground ring-2 ring-primary/40" : "border-border/60",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#3B82F6"}
                  onChange={(e) => onChange(e.target.value.toUpperCase())}
                  className="w-8 h-8 shrink-0 rounded cursor-pointer bg-transparent border-0"
                  title="Pick any colour"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-28 h-8 px-2 rounded-md border border-border bg-background text-xs font-mono"
                  placeholder="#3B82F6"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-sm border border-border/60" style={{ backgroundColor: value }} />
                <span>Selected: <span className="text-foreground font-medium">{colorName(value)}</span></span>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export default function DocumentConfiguration() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
      toast.success("Document data saved successfully");
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
      await documentConfigApi.remove(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const refresh = async () => {
    setSearch("");
    setFilterDoc("");
    await load();
    toast.success("Document data refreshed successfully");
  };

  const update = <K extends keyof DocRow>(key: K, value: DocRow[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div>
      <PageHeader
        title="Document Configuration"
        subtitle="Customize document templates, labels, and visual styles."
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
        <p className="text-xs text-muted-foreground">{filtered.length} Items</p>
      </div>

      <DataTableShell>
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh sortKey="document" sort={sort}>Document</SortableTh>
              <SortableTh sortKey="docType" sort={sort}>Doc Type</SortableTh>
              <SortableTh sortKey="labelEng" sort={sort}>Display Name (English)</SortableTh>
              <th>Doc Type Style</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
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
                        <ColorPicker value={draft!.color} onChange={(v) => update("color", v)} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md border border-border/60 shadow-sm" style={{ backgroundColor: r.color }} />
                          <span className="text-xs text-muted-foreground">{colorName(r.color)}</span>
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
                              onClick={() => setConfirmDeleteId(r.id)}
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

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete the document?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDeleteId) deleteRow(confirmDeleteId); setConfirmDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
