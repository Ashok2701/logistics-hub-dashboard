import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Save, Shield, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import {
  rolesApi, modulesApi, roleModulesApi,
  type Role, type ModuleItem, type RolePermission,
} from "@/lib/userMgmtApi";

type PermKey = "canView" | "canCreate" | "canEdit" | "canDelete";
const PERMS: { key: PermKey; label: string }[] = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
];

export default function RoleModulesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [perms, setPerms] = useState<Record<string, RolePermission>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [r, m] = await Promise.all([rolesApi.list(), modulesApi.list()]);
        setRoles(r);
        setModules(m);
      } catch (e: any) { toast.error(e.message || "Failed to load"); }
    })();
  }, []);

  const loadPerms = async (roleId: string) => {
    setLoading(true);
    try {
      const existing = await roleModulesApi.get(roleId);
      const map: Record<string, RolePermission> = {};
      modules.forEach((m) => {
        const found = existing.find((p) => p.moduleId === m.moduleId);
        map[m.moduleId] = found ?? {
          moduleId: m.moduleId, moduleName: m.moduleName,
          canView: false, canCreate: false, canEdit: false, canDelete: false,
        };
      });
      setPerms(map);
    } catch (e: any) {
      toast.error(e.message || "Failed to load permissions");
      const map: Record<string, RolePermission> = {};
      modules.forEach((m) => {
        map[m.moduleId] = { moduleId: m.moduleId, moduleName: m.moduleName, canView: false, canCreate: false, canEdit: false, canDelete: false };
      });
      setPerms(map);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (selectedRole && modules.length) loadPerms(selectedRole); }, [selectedRole, modules.length]);

  const toggle = (moduleId: string, key: PermKey) =>
    setPerms((p) => ({ ...p, [moduleId]: { ...p[moduleId], [key]: !p[moduleId][key] } }));

  const toggleAllForModule = (moduleId: string, value: boolean) =>
    setPerms((p) => ({ ...p, [moduleId]: { ...p[moduleId], canView: value, canCreate: value, canEdit: value, canDelete: value } }));

  const toggleColumn = (key: PermKey, value: boolean) =>
    setPerms((p) => {
      const next = { ...p };
      Object.keys(next).forEach((k) => { next[k] = { ...next[k], [key]: value }; });
      return next;
    });

  const save = async () => {
    if (!selectedRole) { toast.error("Select a role"); return; }
    setSaving(true);
    try {
      const body: RolePermission[] = Object.values(perms).map((p) => ({
        moduleId: p.moduleId,
        canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete,
      }));
      await roleModulesApi.save(selectedRole, body);
      toast.success("Permissions saved");
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [modules]
  );

  return (
    <div>
      <PageHeader
        title="Role Permissions"
        subtitle="Assign module-level access for each role"
        actions={
          <button onClick={save} disabled={!selectedRole || saving}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Permissions
          </button>
        }
      />

      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium text-foreground">Select Role:</label>
          </div>
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
            className="h-9 px-3 rounded-lg bg-card border border-border text-sm min-w-[240px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10">
            <option value="">— Choose a role —</option>
            {roles.map((r) => <option key={r.roleId} value={r.roleId}>{r.roleName} ({r.roleCode})</option>)}
          </select>
          {selectedRole && (
            <button onClick={() => loadPerms(selectedRole)} className="h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center" title="Reload">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {!selectedRole ? (
          <div className="py-16 text-center">
            <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Select a role to configure permissions</p>
          </div>
        ) : loading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Module</th>
                {PERMS.map((p) => (
                  <th key={p.key} className="w-28 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span>{p.label}</span>
                      <label className="inline-flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                        <input type="checkbox"
                          checked={orderedModules.length > 0 && orderedModules.every((m) => perms[m.moduleId]?.[p.key])}
                          onChange={(e) => toggleColumn(p.key, e.target.checked)}
                          className="w-3 h-3 accent-primary" />
                        all
                      </label>
                    </div>
                  </th>
                ))}
                <th className="w-24 text-center">All</th>
              </tr>
            </thead>
            <tbody>
              {orderedModules.length === 0 ? (
                <tr><td colSpan={PERMS.length + 2} className="text-center py-12 text-sm text-muted-foreground">No modules configured</td></tr>
              ) : orderedModules.map((m) => {
                const p = perms[m.moduleId];
                if (!p) return null;
                const all = p.canView && p.canCreate && p.canEdit && p.canDelete;
                return (
                  <tr key={m.moduleId}>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{m.moduleName}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{m.moduleCode}</span>
                      </div>
                    </td>
                    {PERMS.map((perm) => (
                      <td key={perm.key} className="text-center">
                        <input type="checkbox" checked={!!p[perm.key]} onChange={() => toggle(m.moduleId, perm.key)}
                          className="w-4 h-4 accent-primary cursor-pointer" />
                      </td>
                    ))}
                    <td className="text-center">
                      <input type="checkbox" checked={all} onChange={(e) => toggleAllForModule(m.moduleId, e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
