import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/shared/MetricCard";
import { RowActions } from "@/components/shared/RowActions";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, UserPlus, Route, CalendarClock, Radar,
  Map, BarChart3, Truck, Users, ArrowLeft, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { userApi, mapApiUser } from "@/lib/userApi";

// ─── Types ────────────────────────────────────────────────────────
interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  mobile: string;
  status: "active" | "inactive";
  modules: string[];
  sites: string[];
  defaultSite: string;
  primaryLanguage: string;
  secondaryLanguage: string;
}

const MODULES = [
  { key: "route_planner", label: "Route Planner", icon: Route },
  { key: "scheduling", label: "Scheduling", icon: CalendarClock },
  { key: "tracking", label: "Tracking", icon: Radar },
  { key: "map", label: "Map", icon: Map },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "fleet", label: "Fleet", icon: Truck },
  { key: "user_mgmt", label: "User Management", icon: Users },
];

const SITES = [
  "HQ Warehouse", "North Distribution", "South Hub",
  "East Logistics Park", "West Terminal",
];

const LANGUAGES = [
  "English", "Arabic", "French", "Spanish", "Hindi", "German",
];

// ─── Seed data ────────────────────────────────────────────────────
const seedUsers: User[] = [
  {
    id: "1", username: "jthompson", fullName: "James Thompson",
    email: "james.t@fleet.io", mobile: "+1 555-0142",
    status: "active", modules: ["route_planner", "tracking", "fleet"],
    sites: ["HQ Warehouse", "North Distribution"], defaultSite: "HQ Warehouse",
    primaryLanguage: "English", secondaryLanguage: "Arabic",
  },
  {
    id: "2", username: "snguyen", fullName: "Sarah Nguyen",
    email: "sarah.n@fleet.io", mobile: "+1 555-0198",
    status: "active", modules: ["reports", "fleet", "scheduling"],
    sites: ["South Hub"], defaultSite: "South Hub",
    primaryLanguage: "English", secondaryLanguage: "",
  },
  {
    id: "3", username: "mrobinson", fullName: "Marcus Robinson",
    email: "marcus.r@fleet.io", mobile: "+1 555-0271",
    status: "inactive", modules: ["map", "tracking"],
    sites: ["East Logistics Park", "West Terminal"], defaultSite: "East Logistics Park",
    primaryLanguage: "English", secondaryLanguage: "Spanish",
  },
  {
    id: "4", username: "apatel", fullName: "Anita Patel",
    email: "anita.p@fleet.io", mobile: "+1 555-0334",
    status: "active", modules: ["route_planner", "scheduling", "reports", "user_mgmt"],
    sites: ["HQ Warehouse", "South Hub", "North Distribution"], defaultSite: "HQ Warehouse",
    primaryLanguage: "English", secondaryLanguage: "Hindi",
  },
];

// ─── Form state ───────────────────────────────────────────────────
const emptyForm = {
  username: "", fullName: "", password: "", confirmPassword: "",
  email: "", mobile: "", primaryLanguage: "English", secondaryLanguage: "",
  modules: [] as string[], sites: [] as string[], defaultSite: "", status: true,
};

type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;

type ViewMode = "list" | "form";

// ─── Component ────────────────────────────────────────────────────
export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      let raw: any;
      try { raw = await userApi.list(); }
      catch { raw = await userApi.getUsers(); }
      const arr: any[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.users ?? [];
      setUsers(arr.map(mapApiUser) as User[]);
    } catch (e: any) {
      toast({ title: "Failed to load users", description: e.message, variant: "destructive" });
      setUsers(seedUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  // ── Helpers ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setView("form");
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      username: u.username, fullName: u.fullName, password: "", confirmPassword: "",
      email: u.email, mobile: u.mobile, primaryLanguage: u.primaryLanguage,
      secondaryLanguage: u.secondaryLanguage, modules: [...u.modules],
      sites: [...u.sites], defaultSite: u.defaultSite, status: u.status === "active",
    });
    setErrors({});
    setView("form");
  };

  const goBack = () => setView("list");

  const handleDelete = async (u: User) => {
    try {
      await userApi.remove(u.username);
      toast({ title: "User removed" });
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.username.trim()) e.username = "Username is required";
    else if (!editingId && users.some((u) => u.username === form.username.trim()))
      e.username = "Username already exists";
    if (!editingId && form.password.length < 6) e.password = "Min 6 characters";
    if (form.password && form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (form.sites.length === 0) e.sites = "Select at least one site";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    username: form.username.trim(),
    fullName: form.fullName,
    email: form.email,
    mobile: form.mobile,
    ...(form.password ? { password: form.password } : {}),
    primaryLanguage: form.primaryLanguage,
    secondaryLanguage: form.secondaryLanguage,
    modules: form.modules,
    sites: form.sites,
    defaultSite: form.defaultSite,
    status: form.status ? "active" : "inactive",
    xact: form.status,
  });

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        const target = users.find((u) => u.id === editingId);
        await userApi.update(target?.username || form.username.trim(), buildPayload());
        toast({ title: "User updated" });
      } else {
        await userApi.create(buildPayload());
        toast({ title: "User created" });
      }
      setView("list");
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (key: string) =>
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(key) ? f.modules.filter((m) => m !== key) : [...f.modules, key],
    }));

  const toggleSite = (site: string) =>
    setForm((f) => {
      const next = f.sites.includes(site) ? f.sites.filter((s) => s !== site) : [...f.sites, site];
      return { ...f, sites: next, defaultSite: next.includes(f.defaultSite) ? f.defaultSite : next[0] ?? "" };
    });

  const moduleIcon = (key: string) => {
    const m = MODULES.find((mod) => mod.key === key);
    return m ? <m.icon className="w-3.5 h-3.5" /> : null;
  };

  // ── Render ───────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Back + Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors duration-150"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{editingId ? "Edit User" : "Add User"}</h1>
              <p className="text-xs text-muted-foreground">{editingId ? "Update user details and permissions" : "Create a new system user"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors duration-150">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium">
              {editingId ? "Save Changes" : "Create User"}
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl border border-border shadow-card">
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <Section title="Basic Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Username" error={errors.username} required>
                  <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="e.g. jsmith" className="h-9" />
                </Field>
                <Field label="Full Name">
                  <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="e.g. John Smith" className="h-9" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@company.com" className="h-9" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Password" error={errors.password}>
                  <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editingId ? "Leave blank" : "Min 6 chars"} className="h-9" />
                </Field>
                <Field label="Confirm Password" error={errors.confirmPassword}>
                  <Input type="password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} placeholder="Re-enter" className="h-9" />
                </Field>
                <Field label="Mobile">
                  <Input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="+1 555-0100" className="h-9" />
                </Field>
              </div>
            </Section>

            {/* Language */}
            <Section title="Language">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Primary Language">
                  <Select value={form.primaryLanguage} onValueChange={(v) => setForm((f) => ({ ...f, primaryLanguage: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Secondary Language">
                  <Select value={form.secondaryLanguage || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, secondaryLanguage: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <div className="flex items-center gap-3 h-9">
                    <Switch checked={form.status} onCheckedChange={(v) => setForm((f) => ({ ...f, status: v }))} />
                    <span className="text-sm">{form.status ? "Active" : "Inactive"}</span>
                  </div>
                </Field>
              </div>
            </Section>

            {/* Modules */}
            <Section title="Modules">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {MODULES.map((m) => (
                  <label
                    key={m.key}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150",
                      form.modules.includes(m.key)
                        ? "border-primary/30 bg-primary/[0.05]"
                        : "border-border hover:border-border/80 hover:bg-secondary/30"
                    )}
                  >
                    <Checkbox
                      checked={form.modules.includes(m.key)}
                      onCheckedChange={() => toggleModule(m.key)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <m.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{m.label}</span>
                  </label>
                ))}
              </div>
            </Section>

            {/* Sites */}
            <Section title="Sites" error={errors.sites}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SITES.map((site) => (
                  <label
                    key={site}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150",
                      form.sites.includes(site)
                        ? "border-primary/30 bg-primary/[0.05]"
                        : "border-border hover:border-border/80 hover:bg-secondary/30"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={form.sites.includes(site)}
                        onCheckedChange={() => toggleSite(site)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-sm">{site}</span>
                    </div>
                    {form.sites.includes(site) && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setForm((f) => ({ ...f, defaultSite: site })); }}
                        className={cn(
                          "text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors",
                          form.defaultSite === site
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        {form.defaultSite === site ? "Default" : "Set default"}
                      </button>
                    )}
                  </label>
                ))}
              </div>
            </Section>

          </div>

        </div>
      </motion.div>
    );
  }

  // ── List View ───────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="User & Roles" subtitle="Manage system users and access control" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm focus-visible:ring-primary/30"
          />
        </div>
        <button onClick={openAdd} className="btn-gradient h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 flex-shrink-0">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Table */}
      <motion.div
        className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Username</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Full Name</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Email</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Mobile</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden xl:table-cell">Modules</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Sites</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u, i) => (
              <TableRow
                key={u.id}
                className={cn(
                  "transition-colors duration-150",
                  i % 2 === 1 && "bg-secondary/20",
                  "hover:bg-primary/[0.03]"
                )}
              >
                <TableCell className="font-medium text-sm">{u.username}</TableCell>
                <TableCell className="text-sm">{u.fullName}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{u.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{u.mobile}</TableCell>
                <TableCell>
                  <StatusBadge status={u.status === "active" ? "Active" : "Inactive"} variant={u.status === "active" ? "success" : "muted"} />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <div className="flex items-center gap-1 flex-wrap">
                    {u.modules.slice(0, 3).map((m) => (
                      <span key={m} className="w-7 h-7 rounded-lg bg-primary/8 text-primary flex items-center justify-center" title={MODULES.find((mod) => mod.key === m)?.label}>
                        {moduleIcon(m)}
                      </span>
                    ))}
                    {u.modules.length > 3 && (
                      <span className="text-[11px] text-muted-foreground font-medium">+{u.modules.length - 3}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground tabular-nums">{u.sites.length} site{u.sites.length !== 1 ? "s" : ""}</span>
                </TableCell>
                <TableCell>
                  <RowActions onEdit={() => openEdit(u)} onDelete={() => handleDelete(u.id)} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────
function Section({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {error && <span className="text-[11px] text-destructive">{error}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
