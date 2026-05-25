import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/shared/MetricCard";
import { RowActions } from "@/components/shared/RowActions";
import { SortableTableHead } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Search, UserPlus, Route, CalendarClock, Radar,
  Map, BarChart3, Truck, Users, ArrowLeft, Loader2,
  Home, MapPin, LayoutGrid, Building2, Plus, Trash2, Check, ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { userApi, mapApiUser, buildApiPayload } from "@/lib/userApi";
import { transportApi, type ApiSite } from "@/lib/transportApi";
import { getRoles, getRoleById, getUserRoleId, setUserRoleId, subscribeRoles, type Role } from "@/lib/rolesStore";

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

const FALLBACK_SITES: ApiSite[] = [
  { id: "HQ", code: "HQ", name: "HQ", description: "Primary distribution center" },
  { id: "NORTH", code: "NORTH", name: "NORTH", description: "Northern regional hub" },
  { id: "SOUTH", code: "SOUTH", name: "SOUTH", description: "Southern operations" },
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
  roleId: "" as string,
};

type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;
type ViewMode = "list" | "form";
type TabKey = "home" | "address" | "sites";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "address", label: "Address Detail", icon: MapPin },
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
  const [siteOptions, setSiteOptions] = useState<ApiSite[]>(FALLBACK_SITES);

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

  useEffect(() => {
    (async () => {
      try {
        const list = await transportApi.listSites();
        if (list.length) setSiteOptions(list);
      } catch (e: any) {
        toast({ title: "Failed to load sites", description: e.message, variant: "destructive" });
      }
    })();
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });
  const sort = useSortable(filtered);
  const sorted = sort.sorted;

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
      roleId: getUserRoleId(u.username) ?? "",
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

  const addEmptyRow = () =>
    setForm((f) => ({ ...f, sites: [...f.sites, ""] }));

  const setSiteAt = (index: number, siteName: string) =>
    setForm((f) => {
      // prevent duplicates
      if (siteName && f.sites.some((s, i) => i !== index && s === siteName)) {
        toast({ title: "Site already added", variant: "destructive" });
        return f;
      }
      const next = [...f.sites];
      const prev = next[index];
      next[index] = siteName;
      const newDefault =
        f.defaultSite === prev ? siteName : f.defaultSite || siteName;
      return { ...f, sites: next, defaultSite: newDefault };
    });

  const removeSiteAt = (index: number) =>
    setForm((f) => {
      const removed = f.sites[index];
      const next = f.sites.filter((_, i) => i !== index);
      const newDefault =
        f.defaultSite === removed
          ? next.find((s) => s) ?? ""
          : f.defaultSite;
      return { ...f, sites: next, defaultSite: newDefault };
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
          addEmptyRow={addEmptyRow}
          setSiteAt={setSiteAt}
          removeSiteAt={removeSiteAt}
          siteOptions={siteOptions}
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
              <SortableTableHead sortKey="username" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Username</SortableTableHead>
              <SortableTableHead sortKey="fullName" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Full Name</SortableTableHead>
              <SortableTableHead sortKey="email" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Email</SortableTableHead>
              <SortableTableHead sortKey="mobile" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Mobile</SortableTableHead>
              <SortableTableHead sortKey="status" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Status</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden xl:table-cell">Modules</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Sites</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((u, i) => (
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
            {sorted.length === 0 && (
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

// ─── FormSections: stacked sections with sticky scroll-spy tabs ───
interface FormSectionsProps {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  tabErrorCount: Record<TabKey, number>;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: FormErrors;
  editingId: string | null;
  toggleModule: (k: string) => void;
  addEmptyRow: () => void;
  setSiteAt: (index: number, s: string) => void;
  removeSiteAt: (index: number) => void;
  siteOptions: ApiSite[];
}

function FormSections({
  tab, setTab, tabErrorCount, form, setForm, errors, editingId,
  toggleModule, addEmptyRow, setSiteAt, removeSiteAt, siteOptions,
}: FormSectionsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<TabKey, HTMLElement | null>>({
    home: null, address: null, modules: null, sites: null,
  });
  const isProgrammaticScroll = useRef(false);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;
        // pick the entry closest to the top edge that is intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const key = (visible[0].target as HTMLElement).dataset.tabKey as TabKey;
          if (key) setTab(key);
        }
      },
      { root, rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [setTab]);

  const scrollToTab = (key: TabKey) => {
    const el = sectionRefs.current[key];
    const root = scrollRef.current;
    if (!el || !root) return;
    isProgrammaticScroll.current = true;
    setTab(key);
    const top = el.offsetTop - 8;
    root.scrollTo({ top, behavior: "smooth" });
    window.setTimeout(() => { isProgrammaticScroll.current = false; }, 600);
  };

  const registerRef = (key: TabKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 180px)" }}>
      {/* Sticky tab bar */}
      <div className="flex items-center gap-1 px-2 sm:px-4 border-b border-border bg-card overflow-x-auto flex-shrink-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          const errCount = tabErrorCount[t.key];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => scrollToTab(t.key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
              {errCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
              {active && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Scrollable stacked sections */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 scroll-smooth">
        <div className="divide-y divide-border">
          {/* HOME */}
          <section ref={registerRef("home")} data-tab-key="home" className="p-6 space-y-6 scroll-mt-4">
            <SectionHeader title="Home" subtitle="Account & preferences" />
            <Section title="Account">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="User ID" error={errors.username} required>
                  <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="e.g. E100" className="h-9" disabled={!!editingId} />
                </Field>
                <Field label="Full Name">
                  <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="e.g. John Smith" className="h-9" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@company.com" className="h-9" />
                </Field>
                <Field label="Password" error={errors.password} required={!editingId}>
                  <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editingId ? "Leave blank to keep" : "Min 4 chars"} className="h-9" />
                </Field>
                <Field label="Confirm Password" error={errors.confirmPassword}>
                  <Input type="password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} placeholder="Re-enter" className="h-9" />
                </Field>
                <Field label="Mobile">
                  <Input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="+1 555-0100" className="h-9" />
                </Field>
              </div>
            </Section>
            <Section title="Preferences">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Primary Language" required>
                  <Select value={form.primaryLanguage} onValueChange={(v) => setForm((f) => ({ ...f, primaryLanguage: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Second Language">
                  <Select value={form.secondaryLanguage || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, secondaryLanguage: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <div className="flex items-center gap-3 h-9 px-3 rounded-md border border-border bg-secondary/30">
                    <Switch checked={form.status} onCheckedChange={(v) => setForm((f) => ({ ...f, status: v }))} />
                    <span className="text-sm">{form.status ? "Active" : "Inactive"}</span>
                  </div>
                </Field>
              </div>
            </Section>
          </section>

          {/* ADDRESS */}
          <section ref={registerRef("address")} data-tab-key="address" className="p-6 space-y-6 scroll-mt-4">
            <SectionHeader title="Address Detail" subtitle="Postal address and contact" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Address Line 1">
                <Input value={form.addressLine1} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} className="h-9" />
              </Field>
              <Field label="Address Line 2">
                <Input value={form.addressLine2} onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))} className="h-9" />
              </Field>
              <Field label="Country">
                <Select value={form.country || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, country: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Postal Code" required error={errors.postalCode}>
                <Input value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} className="h-9" />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="h-9" />
              </Field>
              <Field label="Region / State">
                <Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} className="h-9" />
              </Field>
              <Field label="Telephone" required error={errors.telephone}>
                <Input value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} className="h-9" />
              </Field>
            </div>
          </section>

          {/* MODULES */}
          <section ref={registerRef("modules")} data-tab-key="modules" className="p-6 space-y-6 scroll-mt-4">
            <SectionHeader title="Modules" subtitle="Select which modules this user can access" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {MODULES.map((m) => {
                const selected = form.modules.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleModule(m.key)}
                    className={cn(
                      "group relative flex items-center gap-3 px-3.5 py-3 rounded-lg border text-left transition-all duration-150",
                      selected ? "border-primary/40 bg-primary/[0.06] shadow-sm" : "border-border hover:border-border/80 hover:bg-secondary/40"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                      selected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                    )}>
                      <m.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium flex-1 truncate">{m.label}</span>
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                      selected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    )}>
                      {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SITES */}
          <section ref={registerRef("sites")} data-tab-key="sites" className="p-6 space-y-6 scroll-mt-4">
            <div className="flex items-start justify-between gap-3">
              <SectionHeader title="User Assigned Sites" subtitle="Assign sites and pick one default" error={errors.sites} />
              <button
                type="button"
                onClick={addEmptyRow}
                className="btn-gradient h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-1.5 flex-shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Site
              </button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 w-[260px]">Site ID</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">Description</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 text-center w-[100px]">Default</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 text-right w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.sites.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground">
                        No sites assigned. Click <span className="font-medium text-foreground">Add Site</span> to begin.
                      </TableCell>
                    </TableRow>
                  )}
                  {form.sites.map((siteName, index) => {
                    const meta = siteOptions.find((s) => s.name === siteName);
                    const isDefault = !!siteName && form.defaultSite === siteName;
                    const takenElsewhere = new Set(form.sites.filter((_, i) => i !== index));
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <SiteCombobox
                            value={siteName}
                            disabledValues={takenElsewhere}
                            onChange={(v) => setSiteAt(index, v)}
                            options={siteOptions}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{meta?.description ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            disabled={!siteName}
                            onClick={() => siteName && setForm((f) => ({ ...f, defaultSite: siteName }))}
                            className={cn(
                              "inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors",
                              isDefault ? "border-primary" : "border-muted-foreground/40 hover:border-primary/60",
                              !siteName && "opacity-30 cursor-not-allowed"
                            )}
                            aria-label="Set default"
                          >
                            {isDefault && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => removeSiteAt(index)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* spacer so last section can scroll fully under tab bar */}
            <div className="h-32" />
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, error }: { title: string; subtitle?: string; error?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ─── SiteCombobox: searchable Site ID picker ──────────────────────
function SiteCombobox({
  value,
  disabledValues,
  onChange,
  options,
}: {
  value: string;
  disabledValues: Set<string>;
  onChange: (v: string) => void;
  options: ApiSite[];
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((s) => s.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-9 w-full inline-flex items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm transition-colors",
            value ? "border-border" : "border-dashed border-primary/40 text-muted-foreground",
            "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        >
          <span className={cn("truncate", !value && "italic")}>
            {selected ? `${selected.name}${selected.description ? ` - ${selected.description}` : ""}` : "Select site…"}
          </span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search site…" className="h-9" />
          <CommandList>
            <CommandEmpty>No site found.</CommandEmpty>
            <CommandGroup>
              {options.map((s) => {
                const isDisabled = disabledValues.has(s.name);
                const isSelected = value === s.name;
                return (
                  <CommandItem
                    key={s.id}
                    value={`${s.name} ${s.description}`}
                    disabled={isDisabled}
                    onSelect={() => {
                      onChange(s.name);
                      setOpen(false);
                    }}
                    className={cn(isDisabled && "opacity-40")}
                  >
                    <Check className={cn("w-4 h-4 mr-2", isSelected ? "opacity-100" : "opacity-0")} />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-medium truncate">{s.name}</span>
                      {s.description && <span className="text-sm text-muted-foreground truncate">- {s.description}</span>}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
