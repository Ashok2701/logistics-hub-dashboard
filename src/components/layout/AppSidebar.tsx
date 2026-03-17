import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Truck, Car, Users, Container,
  Link as LinkIcon, Navigation, Radar, BarChart3, Settings,
  RefreshCw, Shield, Building2, UserCircle, Package, FileText,
  ChevronDown, ChevronLeft, ChevronRight, Route, type LucideIcon,
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
    label: "Fleet Management", icon: Truck,
    children: [
      { label: "Vehicle Categories", icon: Car, path: "/fleet/categories" },
      { label: "Vehicles", icon: Truck, path: "/fleet/vehicles" },
      { label: "Drivers", icon: Users, path: "/fleet/drivers" },
      { label: "Trailers", icon: Container, path: "/fleet/trailers" },
      { label: "Vehicle-Driver", icon: LinkIcon, path: "/fleet/vehicle-driver" },
      { label: "Vehicle-Trailer", icon: LinkIcon, path: "/fleet/vehicle-trailer" },
    ],
  },
  {
    label: "Operations", icon: Navigation,
    children: [
      { label: "Route Planner", icon: Route, path: "/operations/route-planner" },
      { label: "Live Tracking", icon: Radar, path: "/operations/live-tracking" },
    ],
  },
  {
    label: "Reports", icon: BarChart3,
    children: [
      { label: "Driver Reports", icon: Users, path: "/reports/drivers" },
      { label: "Vehicle Reports", icon: Truck, path: "/reports/vehicles" },
    ],
  },
  {
    label: "Configuration", icon: Settings,
    children: [
      { label: "Sync Center", icon: RefreshCw, path: "/config/sync-center" },
      { label: "Roles & Permissions", icon: Shield, path: "/config/roles" },
      { label: "Site Management", icon: Building2, path: "/config/sites" },
      { label: "Customer", icon: UserCircle, path: "/config/customers" },
      { label: "Supplier", icon: UserCircle, path: "/config/suppliers" },
      { label: "Product", icon: Package, path: "/config/products" },
      { label: "Document Config", icon: FileText, path: "/config/documents" },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Fleet Management"]);
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
      className="flex flex-col h-screen flex-shrink-0 relative overflow-hidden bg-card border-r border-border"
    >
      {/* Logo */}
      <div className="flex items-center h-[60px] px-4 border-b border-border">
        {!collapsed ? (
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Route className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-semibold text-foreground leading-tight">Route Planner</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">for Sage Intacct</p>
            </div>
          </motion.div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Route className="w-4 h-4 text-primary-foreground" />
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
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative",
                  isActive(item.path)
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive(item.path) && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive(item.path) ? "text-primary" : "text-muted-foreground")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => !collapsed && toggleMenu(item.label)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium w-full transition-all duration-150 group",
                    isChildActive(item.children)
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isChildActive(item.children) ? "text-foreground" : "text-muted-foreground")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <motion.div animate={{ rotate: expandedMenus.includes(item.label) ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
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
                      <div className="ml-[18px] pl-4 border-l border-border py-1 space-y-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-150 relative",
                              isActive(child.path)
                                ? "text-primary font-medium bg-primary/6"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            <child.icon className={cn("w-4 h-4 flex-shrink-0", isActive(child.path) ? "text-primary" : "text-muted-foreground/70")} />
                            <span>{child.label}</span>
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

      {/* User info + collapse */}
      <div className="border-t border-border p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-medium text-foreground leading-tight truncate">Logged in as</p>
              <p className="text-[11px] text-muted-foreground leading-tight truncate capitalize">{user.username}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
