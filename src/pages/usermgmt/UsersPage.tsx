import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, Search, RefreshCw, Edit, Trash2, Users as UsersIcon, Loader2,
  ArrowLeft, X, Check, ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { cn } from "@/lib/utils";
import {
  usersApi, rolesApi, userTypesApi,
  type UserRecord, type Role, type UserType,
} from "@/lib/userMgmtApi";
import { transportApi, type ApiSite } from "@/lib/transportApi";

interface FormState {
  username: string;
  password: string;
  fullName: string;
  email: string;
  mobileNo: string;
  roleId: string;
  userTypeId: string;
  sites: string[];
  active: boolean;
}
const emptyForm: FormState = {
  username: "", password: "", fullName: "", email: "", mobileNo: "",
  roleId: "", userTypeId: "", sites: [], active: true,
};

function MultiSiteSelect({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: ApiSite[] }) {
  const [open, setOpen] = useState(false);
  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((s) => s !== code) : [...value, code]);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 h-10 px-3 rounded-lg border border-border bg-background hover:border-primary/40 text-sm w-full">
        <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
          {value.length === 0 ? "Select sites…" : `${value.length} site${value.length > 1 ? "s" : ""}`}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-elevated p-1.5 max-h-72 overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">No sites available</p>
            ) : options.map((s) => {
              const checked = value.includes(s.code);
              return (
                <button type="button" key={s.id} onClick={() => toggle(s.code)}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm", checked ? "bg-primary/10" : "hover:bg-muted")}>
                  <span className={cn("w-4 h-4 rounded border flex items-center justify-center", checked ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                    {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                  <span className="font-mono text-xs">{s.code}</span>
                  <span className="text-xs text-muted-foreground truncate">— {s.description}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [view, setView] = useState<"list" | "form">("list");
  const [rows, setRows] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [sites, setSites] = useState<ApiSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    try { setRows(await usersApi.list()); }
    catch (e: any) { toast.error(e.message || "Failed to load users"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    (async () => {
      try { const [r, t] = await Promise.all([rolesApi.list(), userTypesApi.list()]); setRoles(r); setUserTypes(t); }
      catch (e: any) { toast.error(e.message || "Failed to load dropdowns"); }
    })();
    (async () => {
      try { setSites(await transportApi.listSites()); } catch {}
    })();
  }, []);

  const selectedUserType = useMemo(
    () => userTypes.find((t) => t.userTypeId === form.userTypeId),
    [userTypes, form.userTypeId]
  );
  const isRoutePlanner = (name?: string) =>
    !!name && name.trim().toLowerCase() === "route planner";
  const requiresSites = isRoutePlanner(selectedUserType?.userTypeName);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.username?.toLowerCase().includes(s) ||
      r.fullName?.toLowerCase().includes(s) ||
      r.email?.toLowerCase().includes(s) ||
      r.mobileNo?.toLowerCase().includes(s)
    );
  }, [rows, search]);
  const sort = useSortable(filtered);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setView("form"); };
  const openEdit = (u: UserRecord) => {
    const role = roles.find((r) => r.roleName === u.role || r.roleId === u.roleId);
    const ut = userTypes.find((t) => t.userTypeName === u.userType || t.userTypeId === u.userTypeId);
    setEditingId(u.userId);
    setForm({
      username: u.username, password: "", fullName: u.fullName,
      email: u.email, mobileNo: u.mobileNo,
      roleId: role?.roleId ?? u.roleId ?? "",
      userTypeId: ut?.userTypeId ?? u.userTypeId ?? "",
      sites: u.sites ?? [], active: u.active,
    });
    setView("form");
  };

  const remove = async (u: UserRecord) => {
    if (!confirm(`Delete user "${u.username}"?`)) return;
    try { await usersApi.remove(u.userId); toast.success("Deleted"); await load(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  const save = async () => {
    if (!form.username.trim()) { toast.error("Username required"); return; }
    if (!editingId && !form.password.trim()) { toast.error("Password required"); return; }
    if (!form.fullName.trim()) { toast.error("Full name required"); return; }
    if (!form.roleId) { toast.error("Role required"); return; }
    if (!form.userTypeId) { toast.error("User type required"); return; }
    if (requiresSites && form.sites.length === 0) { toast.error("Select at least one site"); return; }
    setSaving(true);
    try {
      const base: Record<string, any> = {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        mobileNo: form.mobileNo.trim(),
        roleId: form.roleId,
        userTypeId: form.userTypeId,
        sites: requiresSites ? form.sites : [],
      };
      if (editingId) { await usersApi.update(editingId, base); toast.success("User updated"); }
      else { await usersApi.create({ ...base, password: form.password }); toast.success("User created"); }
      setView("list"); await load();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (view === "form") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("list")} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{editingId ? "Update User" : "New User"}</h1>
              <p className="text-xs text-muted-foreground">{editingId ? `Editing ${form.username}` : "Create a new user account"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView("list")} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="h-9 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-6 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Username *">
              <input value={form.username} onChange={(e) => upd("username", e.target.value)}
                disabled={!!editingId}
                className="form-input" placeholder="john" />
            </Field>
            {!editingId && (
              <Field label="Password *">
                <input type="password" value={form.password} onChange={(e) => upd("password", e.target.value)}
                  className="form-input" placeholder="••••••" />
              </Field>
            )}
            <Field label="Full Name *">
              <input value={form.fullName} onChange={(e) => upd("fullName", e.target.value)}
                className="form-input" placeholder="John Doe" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)}
                className="form-input" placeholder="john@example.com" />
            </Field>
            <Field label="Mobile Number">
              <input value={form.mobileNo} onChange={(e) => upd("mobileNo", e.target.value)}
                className="form-input" placeholder="9999999999" />
            </Field>
            <Field label="Role *">
              <select value={form.roleId} onChange={(e) => upd("roleId", e.target.value)} className="form-input">
                <option value="">— Select role —</option>
                {roles.map((r) => <option key={r.roleId} value={r.roleId}>{r.roleName}</option>)}
              </select>
            </Field>
            <Field label="User Type *">
              <select value={form.userTypeId} onChange={(e) => { upd("userTypeId", e.target.value); upd("sites", []); }} className="form-input">
                <option value="">— Select user type —</option>
                {userTypes.map((t) => <option key={t.userTypeId} value={t.userTypeId}>{t.userTypeName}</option>)}
              </select>
            </Field>
            {requiresSites && (
              <Field label="Assigned Sites *" className="md:col-span-2">
                <MultiSiteSelect value={form.sites} onChange={(v) => upd("sites", v)} options={sites} />
                {form.sites.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.sites.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono">
                        {s}
                        <button onClick={() => upd("sites", form.sites.filter((x) => x !== s))} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            )}
          </div>
        </div>

        <style>{`.form-input{height:2.5rem;padding:0 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.875rem;width:100%}.form-input:focus{outline:none;border-color:hsl(var(--primary)/0.4);box-shadow:0 0 0 2px hsl(var(--primary)/0.1)}.form-input:disabled{opacity:0.6}`}</style>
      </motion.div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage user accounts and assignments"
        actions={
          <>
            <button onClick={load} className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={openAdd} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 shadow-soft" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="data-table min-w-[1100px]">
          <thead>
            <tr>
              <SortableTh sortKey="username" sort={sort}>Username</SortableTh>
              <SortableTh sortKey="fullName" sort={sort}>Full Name</SortableTh>
              <SortableTh sortKey="email" sort={sort}>Email</SortableTh>
              <SortableTh sortKey="mobileNo" sort={sort}>Mobile</SortableTh>
              <SortableTh sortKey="role" sort={sort}>Role</SortableTh>
              <SortableTh sortKey="userType" sort={sort}>User Type</SortableTh>
              <th>Sites</th>
              <th className="w-24">Active</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sort.sorted.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12">
                <UsersIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No users</p>
              </td></tr>
            ) : sort.sorted.map((u, i) => (
              <motion.tr key={u.userId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <td className="font-medium">{u.username}</td>
                <td>{u.fullName}</td>
                <td className="text-sm text-muted-foreground">{u.email}</td>
                <td className="text-sm text-muted-foreground">{u.mobileNo}</td>
                <td><span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{u.role || "—"}</span></td>
                <td><span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{u.userType || "—"}</span></td>
                <td>
                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                    {(u.sites ?? []).slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>
                    ))}
                    {(u.sites?.length ?? 0) > 3 && <span className="text-[10px] text-muted-foreground">+{u.sites.length - 3}</span>}
                    {(!u.sites || u.sites.length === 0) && <span className="text-xs text-muted-foreground/60">—</span>}
                  </div>
                </td>
                <td>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${u.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-success" : "bg-muted-foreground/50"}`} />
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/8 hover:scale-110 transition-all" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(u)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/8 hover:scale-110 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
