import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Search, RefreshCw, Check, X, Edit, Trash2, Shield, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { rolesApi, type Role } from "@/lib/userMgmtApi";

const empty = (): Role => ({ roleId: "", roleCode: "", roleName: "", active: true });

export default function RolesPage() {
  const [rows, setRows] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Role | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await rolesApi.list()); }
    catch (e: any) { toast.error(e.message || "Failed to load roles"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.roleCode?.toLowerCase().includes(s) || r.roleName?.toLowerCase().includes(s)
    );
  }, [rows, search]);
  const sort = useSortable(filtered);

  const startAdd = () => {
    const row = { ...empty(), roleId: `new-${Date.now()}` };
    setRows((p) => [row, ...p]); setEditingId(row.roleId); setDraft(row); setIsNew(true);
  };
  const startEdit = (r: Role) => { setEditingId(r.roleId); setDraft({ ...r }); setIsNew(false); };
  const cancel = () => {
    if (isNew && draft) setRows((p) => p.filter((r) => r.roleId !== draft.roleId));
    setEditingId(null); setDraft(null); setIsNew(false);
  };
  const save = async () => {
    if (!draft) return;
    if (!draft.roleCode.trim()) { toast.error("Role code required"); return; }
    if (!draft.roleName.trim()) { toast.error("Role name required"); return; }
    try {
      if (isNew) {
        await rolesApi.create({ roleCode: draft.roleCode.trim(), roleName: draft.roleName.trim() });
        toast.success("Role created");
      } else {
        await rolesApi.update(draft.roleId, { roleCode: draft.roleCode.trim(), roleName: draft.roleName.trim(), active: draft.active });
        toast.success("Role updated");
      }
      setEditingId(null); setDraft(null); setIsNew(false); await load();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
  };
  const remove = async (r: Role) => {
    if (!confirm(`Delete role "${r.roleName}"?`)) return;
    try { await rolesApi.remove(r.roleId); toast.success("Deleted"); await load(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };
  const upd = <K extends keyof Role>(k: K, v: Role[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Define roles assignable to users"
        actions={
          <>
            <button onClick={load} className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={startAdd} disabled={editingId !== null}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" /> Add Role
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search roles…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft transition-all" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} role{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh sortKey="roleCode" sort={sort}>Role Code</SortableTh>
              <SortableTh sortKey="roleName" sort={sort}>Role Name</SortableTh>
              <th className="w-28">Active</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sort.sorted.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12">
                <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No roles</p>
              </td></tr>
            ) : sort.sorted.map((r, i) => {
              const isEditing = editingId === r.roleId && draft;
              return (
                <motion.tr key={r.roleId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td>{isEditing ? (
                    <input value={draft!.roleCode} onChange={(e) => upd("roleCode", e.target.value.toUpperCase())}
                      placeholder="e.g. ADMIN"
                      className="h-9 px-2 rounded-lg border border-border bg-card text-sm w-full font-mono focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10" />
                  ) : <span className="font-mono text-xs px-2 py-1 rounded-md bg-muted">{r.roleCode}</span>}</td>
                  <td>{isEditing ? (
                    <input value={draft!.roleName} onChange={(e) => upd("roleName", e.target.value)}
                      placeholder="e.g. Administrator"
                      className="h-9 px-2 rounded-lg border border-border bg-card text-sm w-full focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10" />
                  ) : <span className="font-medium text-foreground">{r.roleName}</span>}</td>
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
