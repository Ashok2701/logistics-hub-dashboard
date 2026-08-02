import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Save, Shield, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import {
  rolesApi, modulesApi, roleModulesApi,
  type Role, type ModuleItem, type RolePermission,
} from "@/lib/userMgmtApi";

// Renamed from "Role Permissions" -> "Assign Modules to Roles", and
// simplified from 4 separate View/Create/Edit/Delete checkboxes down to
// a single "Active" toggle per module, per instruction. The underlying
// RolePermission shape (canView/canCreate/canEdit/canDelete) is left
// alone for backend compatibility — toggling "Active" just sets all
// four to the same value together, so the module is either fully
// assigned to the role or not at all.

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

  // Single "Active" toggle per module — sets all four underlying
  // permission flags together instead of exposing them individually.
  const isActive = (moduleId: string) => {
    const p = perms[moduleId];
    return !!p && p.canView && p.canCreate && p.canEdit && p.canDelete;
  };

  const toggleActive = (moduleId: string, value: boolean) =>
    setPerms((p) => ({
      ...p,
      [moduleId]: { ...p[moduleId], canView: value, canCreate: value, canEdit: value, canDelete: value },
    }));

  const toggleAllActive = (value: boolean) =>
    setPerms((p) => {
      const next = { ...p };
      Object.keys(next).forEach((k) => {
        next[k] = { ...next[k], canView: value, canCreate: value, canEdit: value, canDelete: value };
      });
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
      toast.success("Modules saved for role");
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [modules]
  );

  const allActive = orderedModules.length > 0 && orderedModules.every((m) => isActive(m.moduleId));

  return (
    <div>
      <PageHeader
        title="Assign Modules to Roles"
        subtitle="Choose which modules each role can access"
        actions={
          <button onClick={save} disabled={!selectedRole || saving}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
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
            <p className="text-sm text-muted-foreground">Select a role to assign modules</p>
          </div>
        ) : loading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Module</th>
                <th className="w-28 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>Active</span>
                    <label className="inline-flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                      <input type="checkbox"
                        checked={allActive}
                        onChange={(e) => toggleAllActive(e.target.checked)}
                        className="w-3 h-3 accent-primary" />
                      all
                    </label>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {orderedModules.length === 0 ? (
                <tr><td colSpan={2} className="text-center py-12 text-sm text-muted-foreground">No modules configured</td></tr>
              ) : orderedModules.map((m) => (
                <tr key={m.moduleId}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{m.moduleName}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{m.moduleCode}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <input type="checkbox" checked={isActive(m.moduleId)} onChange={(e) => toggleActive(m.moduleId, e.target.checked)}
                      className="w-4 h-4 accent-primary cursor-pointer" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
