import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import {
  Plus, Search, RefreshCw, Check, X, Edit, Trash2, Shield, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getRoles, upsertRole, deleteRole, subscribeRoles,
  ROLE_MODULES, type Role,
} from "@/lib/rolesStore";

function newId() {
  return `role-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const empty = (): Role => ({
  id: newId(),
  name: "",
  description: "",
  modules: [],
  status: "active",
  createdAt: new Date().toISOString(),
});

function ModulesPicker({
  value, onChange,
}: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (k: string) =>
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  const label =
    value.length === 0 ? "Select modules…"
    : value.length === ROLE_MODULES.length ? "All modules"
    : `${value.length} module${value.length > 1 ? "s" : ""}`;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 h-9 px-3 rounded-lg border border-border bg-card hover:border-primary/40 text-sm w-full min-w-[180px]"
      >
        <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>{label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-elevated p-1.5 w-64 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-border mb-1">
              <button type="button" onClick={() => onChange(ROLE_MODULES.map((m) => m.key))}
                className="text-[11px] font-medium text-primary hover:underline">Select all</button>
              <button type="button" onClick={() => onChange([])}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline">Clear</button>
            </div>
            {ROLE_MODULES.map((m) => {
              const checked = value.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggle(m.key)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors",
                    checked ? "bg-primary/10 text-foreground" : "hover:bg-muted text-foreground/80"
                  )}
                >
                  <span className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                    checked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  )}>
                    {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function RoleManagement() {
  const [rows, setRows] = useState<Role[]>(() => getRoles());
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Role | null>(null);

  useEffect(() => subscribeRoles(() => setRows(getRoles())), []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(s) ||
      r.description.toLowerCase().includes(s)
    );
  }, [rows, search]);

  const sort = useSortable(filtered);
  const sorted = sort.sorted;

  const startAdd = () => {
    const row = empty();
    setRows((p) => [row, ...p]);
    setEditingId(row.id);
    setDraft(row);
  };

  const startEdit = (r: Role) => { setEditingId(r.id); setDraft({ ...r }); };

  const cancel = () => {
    if (draft) {
      const original = rows.find((r) => r.id === draft.id);
      if (original && !original.name) {
        setRows((p) => p.filter((r) => r.id !== draft.id));
      }
    }
    setEditingId(null);
    setDraft(null);
  };

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Role name is required"); return; }
    if (draft.modules.length === 0) { toast.error("Select at least one module"); return; }
    upsertRole(draft);
    toast.success("Role saved");
    setEditingId(null);
    setDraft(null);
  };

  const remove = (r: Role) => {
    deleteRole(r.id);
    toast.success("Role deleted");
  };

  const refresh = () => {
    setRows(getRoles());
    setSearch("");
    toast.success("Refreshed");
  };

  const update = <K extends keyof Role>(k: K, v: Role[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div>
      <PageHeader
        title="Role Management"
        subtitle="Define roles and the modules they grant"
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
              <Plus className="w-4 h-4" /> Add New Role
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search roles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft transition-all"
          />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} role{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-16">SR No</th>
              <SortableTh sortKey="name" sort={sort}>Role Name</SortableTh>
              <SortableTh sortKey="description" sort={sort}>Description</SortableTh>
              <th>Modules</th>
              <SortableTh sortKey="status" sort={sort} className="w-28">Status</SortableTh>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No roles configured</p>
                </td>
              </tr>
            ) : (
              sorted.map((r, i) => {
                const isEditing = editingId === r.id && draft;
                return (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="group">
                    <td className="font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td>
                      {isEditing ? (
                        <input
                          value={draft!.name}
                          onChange={(e) => update("name", e.target.value)}
                          placeholder="e.g. Dispatcher"
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 w-full font-medium"
                        />
                      ) : (
                        <span className="font-medium text-foreground">{r.name || <em className="text-muted-foreground/60">—</em>}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={draft!.description}
                          onChange={(e) => update("description", e.target.value)}
                          placeholder="Short description"
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 w-full"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{r.description || "—"}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <ModulesPicker value={draft!.modules} onChange={(v) => update("modules", v)} />
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap max-w-md">
                          {r.modules.slice(0, 4).map((k) => {
                            const m = ROLE_MODULES.find((x) => x.key === k);
                            return (
                              <span key={k} className="text-[11px] px-2 py-0.5 rounded-md bg-primary/8 text-primary font-medium">
                                {m?.label ?? k}
                              </span>
                            );
                          })}
                          {r.modules.length > 4 && (
                            <span className="text-[11px] text-muted-foreground font-medium">+{r.modules.length - 4}</span>
                          )}
                          {r.modules.length === 0 && <span className="text-xs text-muted-foreground">No modules</span>}
                        </div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={draft!.status}
                          onChange={(e) => update("status", e.target.value as Role["status"])}
                          className="h-9 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/40"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium",
                          r.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", r.status === "active" ? "bg-success" : "bg-muted-foreground/50")} />
                          {r.status === "active" ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={save} className="w-8 h-8 rounded-lg flex items-center justify-center text-success hover:bg-success/10 hover:scale-110 transition-all" title="Save">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancel} className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 hover:scale-110 transition-all" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(r)} disabled={editingId !== null}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/8 hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => remove(r)} disabled={editingId !== null}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/8 hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Delete">
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
      </div>
    </div>
  );
}
