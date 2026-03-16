import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Truck,
  Car,
  Users,
  Container,
  Link as LinkIcon,
  MapPin,
  Navigation,
  Radar,
  BarChart3,
  Settings,
  RefreshCw,
  Shield,
  Building2,
  UserCircle,
  Package,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Route,
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
    label: "Fleet Management",
    icon: Truck,
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
    label: "Operations",
    icon: Navigation,
    children: [
      { label: "Route Planner", icon: Route, path: "/operations/route-planner" },
      { label: "Live Tracking", icon: Radar, path: "/operations/live-tracking" },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      { label: "Driver Reports", icon: Users, path: "/reports/drivers" },
      { label: "Vehicle Reports", icon: Truck, path: "/reports/vehicles" },
    ],
  },
  {
    label: "Configuration",
    icon: Settings,
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
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Fleet Management", "Configuration"]);
  const location = useLocation();

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => path === location.pathname;
  const isChildActive = (children?: MenuItem["children"]) =>
    children?.some((c) => c.path === location.pathname);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Route className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-sidebar-accent-foreground">Route Planner</h1>
              <p className="text-[10px] text-sidebar-muted">for Sage X3</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center mx-auto">
            <Route className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {menuItems.map((item) => (
          <div key={item.label} className="mb-0.5">
            {item.path ? (
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                  isActive(item.path)
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => !collapsed && toggleMenu(item.label)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded text-sm w-full transition-colors",
                    isChildActive(item.children)
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 transition-transform",
                          expandedMenus.includes(item.label) && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>
                <AnimatePresence>
                  {!collapsed && expandedMenus.includes(item.label) && item.children && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 border-l border-sidebar-border pl-2 py-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-1.5 rounded text-sm transition-colors",
                              isActive(child.path)
                                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
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

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
