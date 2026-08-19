import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Search, RefreshCw, Check, X, Edit, Trash2, UserCog, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { userTypesApi, type UserType } from "@/lib/userMgmtApi";

const empty = (): UserType => ({
  userTypeId: "",
  userTypeCode: "",
  userTypeName: "",
  requiresSiteMapping: false,
  active: true,
});

export default function UserTypesPage() {
  const [rows, setRows] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserType | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await userTypesApi.list()); }
    catch (e: any) { toast.error(e.message || "Failed to load user types"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.userTypeCode?.toLowerCase().includes(s) || r.userTypeName?.toLowerCase().includes(s)
    );
  }, [rows, search]);
  const sort = useSortable(filtered);

  const startAdd = () => {
    const row = { ...empty(), userTypeId: `new-${Date.now()}` };
    setRows((p) => [row, ...p]);
    setEditingId(row.userTypeId);
    setDraft(row);
    setIsNew(true);
  };
  const startEdit = (r: UserType) => { setEditingId(r.userTypeId); setDraft({ ...r }); setIsNew(false); };
  const cancel = () => {
    if (isNew && draft) setRows((p) => p.filter((r) => r.userTypeId !== draft.userTypeId));
    setEditingId(null); setDraft(null); setIsNew(false);
  };
  const save = async () => {
    if (!draft) return;
    if (!draft.userTypeCode.trim()) { toast.error("Code required"); return; }
    if (!draft.userTypeName.trim()) { toast.error("Name required"); return; }
    try {
      if (isNew) {
        await userTypesApi.create({
          userTypeCode: draft.userTypeCode.trim(),
          userTypeName: draft.userTypeName.trim(),
          requiresSiteMapping: draft.requiresSiteMapping,
          active: draft.active,
        });
        toast.success("User type created");
      } else {
        await userTypesApi.update(draft.userTypeId, {
          userTypeCode: draft.userTypeCode.trim(),
          userTypeName: draft.userTypeName.trim(),
          requiresSiteMapping: draft.requiresSiteMapping,
          active: draft.active,
        });
        toast.success("User type updated");
      }
      setEditingId(null); setDraft(null); setIsNew(false);
      await load();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
  };
  const remove = async (r: UserType) => {
    if (!confirm(`Delete user type "${r.userTypeName}"?`)) return;
    try { await userTypesApi.remove(r.userTypeId); toast.success("Deleted"); await load(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  const upd = <K extends keyof UserType>(k: K, v: UserType[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div>
      <PageHeader
        title="User Types"
        subtitle="Manage user categories and site-mapping requirements"
        actions={
          <>
            <button onClick={load} className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={startAdd} disabled={editingId !== null}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" /> Add User Type
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search user types…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft transition-all" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} Type{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh sortKey="userTypeCode" sort={sort}>Code</SortableTh>
              <SortableTh sortKey="userTypeName" sort={sort}>Name</SortableTh>
              <th className="w-44">Requires Site Mapping</th>
              <th className="w-28">Active</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sort.sorted.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12">
                <UserCog className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No user types</p>
              </td></tr>
            ) : sort.sorted.map((r, i) => {
              const isEditing = editingId === r.userTypeId && draft;
              return (
                <motion.tr key={r.userTypeId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td>{isEditing ? (
                    <input value={draft!.userTypeCode} onChange={(e) => upd("userTypeCode", e.target.value.toUpperCase())}
                      placeholder="e.g. DRIVER"
                      className="h-9 px-2 rounded-lg border border-border bg-card text-sm w-full font-mono focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10" />
                  ) : <span className="font-mono text-xs px-2 py-1 rounded-md bg-muted">{r.userTypeCode}</span>}</td>
                  <td>{isEditing ? (
                    <input value={draft!.userTypeName} onChange={(e) => upd("userTypeName", e.target.value)}
                      placeholder="e.g. Driver"
                      className="h-9 px-2 rounded-lg border border-border bg-card text-sm w-full focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10" />
                  ) : <span className="font-medium text-foreground">{r.userTypeName}</span>}</td>
                  <td>{isEditing ? (
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={draft!.requiresSiteMapping} onChange={(e) => upd("requiresSiteMapping", e.target.checked)}
                        className="w-4 h-4 accent-primary" />
                      <span className="text-sm">Requires sites</span>
                    </label>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${r.requiresSiteMapping ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {r.requiresSiteMapping ? "Yes" : "No"}
                    </span>
                  )}</td>
                  <td>{isEditing ? (
                    <select value={draft!.active ? "1" : "0"} onChange={(e) => upd("active", e.target.value === "1")}
                      className="h-9 px-2 rounded-lg border border-border bg-card text-sm">
                      <option value="1">Active</option><option value="0">Inactive</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${r.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${r.active ? "bg-success" : "bg-muted-foreground/50"}`} />
                      {r.active ? "Active" : "Inactive"}
                    </span>
                  )}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={save} className="w-8 h-8 rounded-lg flex items-center justify-center text-success hover:bg-success/10 hover:scale-110 transition-all" title="Save"><Check className="w-4 h-4" /></button>
                          <button onClick={cancel} className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 hover:scale-110 transition-all" title="Cancel"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(r)} disabled={editingId !== null} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/8 hover:scale-110 transition-all disabled:opacity-30" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => remove(r)} disabled={editingId !== null} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/8 hover:scale-110 transition-all disabled:opacity-30" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
