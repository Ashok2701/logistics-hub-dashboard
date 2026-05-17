import { useEffect, useRef, useState } from "react";
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
  Home, MapPin, LayoutGrid, Building2, Plus, Trash2, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { userApi, mapApiUser, buildApiPayload } from "@/lib/userApi";

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
  addressLine1: string;
  addressLine2: string;
  country: string;
  postalCode: string;
  city: string;
  region: string;
  telephone: string;
}

const MODULES = [
  { key: "route_planner", label: "Route Planner", icon: Route },
  { key: "scheduler", label: "Scheduler", icon: CalendarClock },
  { key: "calendar", label: "Calendar", icon: CalendarClock },
  { key: "map_view", label: "Map View", icon: Map },
  { key: "fleet_mgmt", label: "Fleet Management", icon: Truck },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "user_mgmt", label: "User Management", icon: Users },
  { key: "add_pick_ticket", label: "Add Pick Ticket", icon: Radar },
  { key: "remove_pick_ticket", label: "Remove Pick Ticket", icon: Radar },
];

const SITES = [
  { id: "HQ", name: "HQ Warehouse", description: "Primary distribution center" },
  { id: "NORTH", name: "North Distribution", description: "Northern regional hub" },
  { id: "SOUTH", name: "South Hub", description: "Southern operations" },
  { id: "EAST", name: "East Logistics Park", description: "East coast facility" },
  { id: "WEST", name: "West Terminal", description: "West coast terminal" },
];

const COUNTRIES = ["United States of America", "Canada", "Mexico", "United Kingdom", "Germany", "France", "India", "United Arab Emirates"];
const LANGUAGES = ["English", "Arabic", "French", "Spanish", "Hindi", "German"];

// ─── Form state ───────────────────────────────────────────────────
const emptyForm = {
  username: "", fullName: "", password: "", confirmPassword: "",
  email: "", mobile: "", primaryLanguage: "English", secondaryLanguage: "",
  modules: [] as string[], sites: [] as string[], defaultSite: "", status: true,
  addressLine1: "", addressLine2: "", country: "", postalCode: "",
  city: "", region: "", telephone: "",
};

type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;
type ViewMode = "list" | "form";
type TabKey = "home" | "address" | "modules" | "sites";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "address", label: "Address Detail", icon: MapPin },
  { key: "modules", label: "Modules", icon: LayoutGrid },
  { key: "sites", label: "User Assigned Sites", icon: Building2 },
];

// ─── Component ────────────────────────────────────────────────────
export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [tab, setTab] = useState<TabKey>("home");
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
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setTab("home");
    setView("form");
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      username: u.username, fullName: u.fullName, password: "", confirmPassword: "",
      email: u.email, mobile: u.mobile, primaryLanguage: u.primaryLanguage,
      secondaryLanguage: u.secondaryLanguage, modules: [...u.modules],
      sites: [...u.sites], defaultSite: u.defaultSite, status: u.status === "active",
      addressLine1: u.addressLine1, addressLine2: u.addressLine2, country: u.country,
      postalCode: u.postalCode, city: u.city, region: u.region, telephone: u.telephone,
    });
    setErrors({});
    setTab("home");
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
    if (!form.username.trim()) e.username = "Required";
    else if (!editingId && users.some((u) => u.username === form.username.trim()))
      e.username = "Already exists";
    if (!editingId && form.password.length < 4) e.password = "Min 4 characters";
    if (form.password && form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (!form.postalCode.trim()) e.postalCode = "Required";
    if (!form.telephone.trim()) e.telephone = "Required";
    if (form.sites.length === 0) e.sites = "Select at least one site";
    setErrors(e);
    // jump to first tab containing an error
    if (e.username || e.password || e.confirmPassword) setTab("home");
    else if (e.postalCode || e.telephone) setTab("address");
    else if (e.sites) setTab("sites");
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildApiPayload({ ...form });
      if (editingId) {
        const target = users.find((u) => u.id === editingId);
        await userApi.update(target?.username || form.username.trim(), payload);
        toast({ title: "User updated" });
      } else {
        await userApi.create(payload);
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

  const addSite = (siteName: string) =>
    setForm((f) => {
      if (f.sites.includes(siteName)) return f;
      const next = [...f.sites, siteName];
      return { ...f, sites: next, defaultSite: f.defaultSite || siteName };
    });

  const removeSite = (siteName: string) =>
    setForm((f) => {
      const next = f.sites.filter((s) => s !== siteName);
      return { ...f, sites: next, defaultSite: f.defaultSite === siteName ? (next[0] ?? "") : f.defaultSite };
    });

  const moduleIcon = (key: string) => {
    const m = MODULES.find((mod) => mod.key === key);
    return m ? <m.icon className="w-3.5 h-3.5" /> : null;
  };

  // ── Form View ─────────────────────────────────────────────────────
  if (view === "form") {
    const tabErrorCount: Record<TabKey, number> = {
      home: ["username", "password", "confirmPassword"].filter((k) => errors[k as keyof FormErrors]).length,
      address: ["postalCode", "telephone"].filter((k) => errors[k as keyof FormErrors]).length,
      modules: 0,
      sites: errors.sites ? 1 : 0,
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {editingId ? "Update User" : "New User"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {editingId ? `Editing ${form.username}` : "Create a new system user"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goBack} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-gradient h-9 px-5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </div>

        {/* Card with sticky tabs + stacked scroll-spy sections */}
        <FormSections
          tab={tab}
          setTab={setTab}
          tabErrorCount={tabErrorCount}
          form={form}
          setForm={setForm}
          errors={errors}
          editingId={editingId}
          toggleModule={toggleModule}
          addSite={addSite}
          removeSite={removeSite}
        />
      </motion.div>
    );
  }

  // ── List View ───────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Users" subtitle="Manage system users and access control" />

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
                className={cn("transition-colors duration-150", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.03]")}
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
                  <RowActions onEdit={() => openEdit(u)} onDelete={() => handleDelete(u)} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  {loading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading users…</span>
                  ) : "No users found"}
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
function Section({
  title, subtitle, error, action, children,
}: { title: string; subtitle?: string; error?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
        </div>
        {action}
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
