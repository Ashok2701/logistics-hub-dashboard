import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Truck, Users, Car } from "lucide-react";
import { PageHeader } from "@/components/shared/MetricCard";
import { cn } from "@/lib/utils";
import { BulkImportPanel } from "@/components/shared/BulkImportDialog";
import {
  vehicleImportConfig, driverImportConfig, vehicleCategoryImportConfig,
} from "@/lib/bulkImportConfigs";
import {
  vehicleApi, driverApi, vehicleCategoryApi,
  type Vehicle, type Driver, type VehicleCategory,
} from "@/lib/fleetApi";

type Tab = "vehicle" | "driver" | "category";

const TABS: { key: Tab; label: string; icon: typeof Truck }[] = [
  { key: "vehicle",  label: "Vehicle",         icon: Truck },
  { key: "driver",   label: "Driver",          icon: Users },
  { key: "category", label: "Vehicle Category", icon: Car },
];

export default function BulkActivity() {
  const [tab, setTab] = useState<Tab>("vehicle");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [v, d, c] = await Promise.all([
        vehicleApi.list().catch(() => [] as Vehicle[]),
        driverApi.list().catch(() => [] as Driver[]),
        vehicleCategoryApi.list().catch(() => [] as VehicleCategory[]),
      ]);
      setVehicles(v || []);
      setDrivers(d || []);
      setCategories(c || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load reference data");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  const vehicleConfig = useMemo(() => vehicleImportConfig(vehicles, categories), [vehicles, categories]);
  const driverConfig = useMemo(() => driverImportConfig(drivers), [drivers]);
  const categoryConfig = useMemo(() => vehicleCategoryImportConfig(categories), [categories]);

  return (
    <div className="w-full">
      <PageHeader
        title="Bulk Activity"
        subtitle="Upload CSV or Excel files to load Vehicles, Drivers, or Vehicle Categories in bulk"
      />

      <div className="flex items-center gap-1 mb-5 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4" /> {t.label}
              {loading && active && <span className="text-xs text-muted-foreground">(loading…)</span>}
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        {tab === "vehicle" && (
          <BulkImportPanel<Vehicle>
            {...vehicleConfig}
            onImported={loadAll}
          />
        )}
        {tab === "driver" && (
          <BulkImportPanel<Driver>
            {...driverConfig}
            onImported={loadAll}
          />
        )}
        {tab === "category" && (
          <BulkImportPanel<VehicleCategory>
            {...categoryConfig}
            onImported={loadAll}
          />
        )}
      </div>
    </div>
  );
}
