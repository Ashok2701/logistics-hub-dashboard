import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import VehicleCategories from "@/pages/fleet/VehicleCategories";
import Vehicles from "@/pages/fleet/Vehicles";
import Drivers from "@/pages/fleet/Drivers";
import Trailers from "@/pages/fleet/Trailers";
import VehicleDriverAssignment from "@/pages/fleet/VehicleDriverAssignment";
import VehicleTrailerAssignment from "@/pages/fleet/VehicleTrailerAssignment";
import RoutePlanner from "@/pages/operations/RoutePlanner";
import LiveTracking from "@/pages/operations/LiveTracking";
import DriverReports from "@/pages/reports/DriverReports";
import VehicleReports from "@/pages/reports/VehicleReports";
import SyncCenter from "@/pages/configuration/SyncCenter";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="fleet/categories" element={<VehicleCategories />} />
        <Route path="fleet/vehicles" element={<Vehicles />} />
        <Route path="fleet/drivers" element={<Drivers />} />
        <Route path="fleet/trailers" element={<Trailers />} />
        <Route path="fleet/vehicle-driver" element={<VehicleDriverAssignment />} />
        <Route path="fleet/vehicle-trailer" element={<VehicleTrailerAssignment />} />
        <Route path="operations/route-planner" element={<RoutePlanner />} />
        <Route path="operations/live-tracking" element={<LiveTracking />} />
        <Route path="reports/drivers" element={<DriverReports />} />
        <Route path="reports/vehicles" element={<VehicleReports />} />
        <Route path="config/sync-center" element={<SyncCenter />} />
        <Route path="config/roles" element={<PlaceholderPage title="Roles & Permissions" subtitle="Manage user roles and access control" />} />
        <Route path="config/sites" element={<PlaceholderPage title="Site Management" subtitle="Manage operational sites and warehouses" />} />
        <Route path="config/customers" element={<PlaceholderPage title="Customers" subtitle="Customer master data" />} />
        <Route path="config/suppliers" element={<PlaceholderPage title="Suppliers" subtitle="Supplier master data" />} />
        <Route path="config/products" element={<PlaceholderPage title="Products" subtitle="Product catalog management" />} />
        <Route path="config/documents" element={<PlaceholderPage title="Document Configuration" subtitle="Configure document templates" />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
