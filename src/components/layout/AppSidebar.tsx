import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Truck, Car, Users,
  Link as LinkIcon, Navigation, Radar, BarChart3, Settings,
  RefreshCw, Shield, Building2, UserCircle, Package, FileText, Calendar,
  ChevronDown, ChevronLeft, ChevronRight, Route, UserCog, KeyRound, LayoutGrid,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string;
  icon: LucideIcon;
  path?: string;
  children?: { label: string; icon: LucideIcon; path: string }[];
}

const menuItems: MenuItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  {
    label: "Configuration", icon: Settings,
    children: [
      { label: "Sync Center",    icon: RefreshCw,  path: "/config/sync-center" },
      { label: "Site",           icon: Building2,  path: "/config/sites" },
      { label: "Customer",       icon: UserCircle, path: "/config/customers" },
      { label: "Product",        icon: Package,    path: "/config/products" },
      { label: "Document Config",icon: FileText,   path: "/config/documents" },
    ],
  },
  {
    label: "User Management", icon: Users,
    children: [
      { label: "Roles",        icon: Shield,      path: "/user-management/roles" },
      { label: "Modules",      icon: LayoutGrid,  path: "/user-management/modules" },
      { label: "Role-Modules", icon: KeyRound,    path: "/user-management/role-modules" },
      { label: "User Types",   icon: UserCog,     path: "/user-management/user-types" },
      { label: "Users",        icon: Users,       path: "/user-management/users" },
    ],
  },
  {
    label: "Fleet Management", icon: Truck,
    children: [
      { label: "Vehicle Categories",  icon: Car,     path: "/fleet/categories" },
      { label: "Vehicles",            icon: Truck,   path: "/fleet/vehicles" },
      { label: "Drivers",             icon: Users,   path: "/fleet/drivers" },
      { label: "Vehicle-Driver",      icon: LinkIcon,path: "/fleet/vehicle-driver" },
    ],
  },
  {
    // ─────────────────────────────────────────────────────────────────────
    // INSIDE OPERATIONS — contains Planner + existing Route Planner
    // ─────────────────────────────────────────────────────────────────────
    label: "Inside Operations", icon: Navigation,
    children: [
      { label: "Planner",       icon: ClipboardList, path: "/operations/planner" },
      // { label: "Route Planner", icon: Route, path: "/operations/route-planner" }, // hidden — use Planner instead
    ],
  },
  {
    label: "Reports", icon: BarChart3,
    children: [
      { label: "Live Tracking",      icon: Radar,     path: "/operations/live-tracking" },
      { label: "Driver Reports",     icon: Users,     path: "/reports/drivers" },
      { label: "Vehicle Reports",    icon: Truck,     path: "/reports/vehicles" },
      { label: "POD Tracking",       icon: FileText,  path: "/reports/pod-tracking" },
      { label: "Order Calendar",     icon: Calendar,  path: "/reports/calendar" },
      { label: "Route List",         icon: Route,     path: "/reports/route-list" },
      { label: "KPI Transportation", icon: BarChart3, path: "/reports/kpi-transportation" },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Inside Operations"]);
  const location = useLocation();
  const { user } = useAuth();

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => path === location.pathname;
  const isChildActive = (children?: MenuItem["children"]) =>
    children?.some((c) => c.path === location.pathname);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-screen flex-shrink-0 relative overflow-hidden bg-gradient-sidebar shadow-[inset_-1px_0_0_rgb(255_255_255/0.06),2px_0_12px_-4px_rgb(0_0_0/0.2)]"
    >
      {/* Accent glows */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute bottom-0 -right-20 w-64 h-64 rounded-full opacity-25 blur-3xl"
        style={{ background: `radial-gradient(circle, hsl(var(--gradient-end) / 0.6), transparent 70%)` }}
      />

      {/* Logo */}
      <div className="flex items-center h-[60px] px-4 border-b border-white/8">
        {!collapsed ? (
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20">
              <Route className="w-4 h-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-semibold text-white leading-tight">Route Planner</h1>
              <p className="text-[10px] text-white/40 leading-tight">Universal ERP Edition</p>
            </div>
          </motion.div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center mx-auto shadow-lg shadow-black/20">
            <Route className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {menuItems.map((item, idx) => (
          <div key={item.label} className={idx > 0 ? "mt-0.5" : ""}>
            {item.path ? (
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group relative",
                  isActive(item.path)
                    ? "bg-white/12 text-white"
                    : "text-white/50 hover:bg-white/8 hover:text-white/80"
                )}
              >
                {isActive(item.path) && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    style={{
                      background: `linear-gradient(180deg, hsl(var(--gradient-start)), hsl(var(--gradient-end)))`,
                      boxShadow: "0 0 10px hsl(var(--gradient-start) / 0.6)",
                    }}
                  />
                )}
                <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive(item.path) ? "text-white" : "text-white/50")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => !collapsed && toggleMenu(item.label)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium w-full transition-all duration-200 group",
                    isChildActive(item.children) ? "text-white" : "text-white/50 hover:bg-white/8 hover:text-white/80"
                  )}
                >
                  <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isChildActive(item.children) ? "text-white" : "text-white/50")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <motion.div animate={{ rotate: expandedMenus.includes(item.label) ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                      </motion.div>
                    </>
                  )}
                </button>
                <AnimatePresence>
                  {!collapsed && expandedMenus.includes(item.label) && item.children && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-[18px] pl-4 border-l border-white/10 py-1 space-y-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-200 relative",
                              isActive(child.path)
                                ? "text-white font-medium bg-white/12 shadow-sm"
                                : "text-white/45 hover:text-white/75 hover:bg-white/6"
                            )}
                          >
                            <child.icon className={cn("w-4 h-4 flex-shrink-0", isActive(child.path) ? "text-white" : "text-white/40")} />
                            <span>{child.label}</span>
                            {/* Highlight new Planner item */}
                            {child.path === "/operations/planner" && !isActive(child.path) && (
                              <span className="ml-auto text-[9px] bg-primary/30 text-primary px-1 rounded font-semibold">NEW</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        ))}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-white/8 p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white/60" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-medium text-white/80 leading-tight truncate">Logged in as</p>
              <p className="text-[11px] text-white/40 leading-tight truncate capitalize">{user.username}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full h-8 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-all duration-150"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
