import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar stays in dark theme always */}
      <AppSidebar />
      {/* Main area forced to light theme */}
      <div className="flex-1 flex flex-col min-w-0 bg-[hsl(220,20%,97%)]">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
