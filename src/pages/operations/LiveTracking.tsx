import { useState } from "react";
import { PageHeader } from "@/components/shared/MetricCard";
import { MapPin, Truck, Fuel, Clock, User, X, Gauge } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const sites = ["All Sites", "North Region", "South Region", "East Region", "West Region"];

const vehicles = [
  { id: "VH-2281", driver: "John Carter", status: "Moving", speed: "62 km/h", fuel: "78%", lastPing: "30s ago", top: 25, left: 30 },
  { id: "VH-1193", driver: "Sarah Miles", status: "Stopped", speed: "0 km/h", fuel: "45%", lastPing: "2m ago", top: 50, left: 60 },
  { id: "VH-3340", driver: "Mike Chen", status: "Moving", speed: "85 km/h", fuel: "62%", lastPing: "15s ago", top: 35, left: 55 },
  { id: "VH-0892", driver: "Lisa Brown", status: "Moving", speed: "70 km/h", fuel: "91%", lastPing: "45s ago", top: 65, left: 40 },
  { id: "VH-1567", driver: "Tom Wilson", status: "Idle", speed: "0 km/h", fuel: "33%", lastPing: "5m ago", top: 45, left: 75 },
];

export default function LiveTracking() {
  const [selectedSite, setSelectedSite] = useState("All Sites");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const selected = vehicles.find((v) => v.id === selectedVehicle);

  return (
    <div>
      <PageHeader title="Live Tracking" subtitle="Real-time vehicle monitoring" />

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {sites.map((site) => (
          <button
            key={site}
            onClick={() => setSelectedSite(site)}
            className={`h-9 px-3.5 rounded-lg text-xs font-medium transition-all ${
              selectedSite === site
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {site}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Vehicle List */}
        <motion.div
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="px-4 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Vehicles</h3>
            <p className="text-[11px] text-muted-foreground">{vehicles.length} tracked</p>
          </div>
          <div className="divide-y divide-border/50">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVehicle(selectedVehicle === v.id ? null : v.id)}
                className={cn(
                  "w-full text-left px-4 py-3 transition-all duration-200",
                  selectedVehicle === v.id
                    ? "bg-primary/5 border-l-[3px] border-l-primary"
                    : "hover:bg-secondary/50 border-l-[3px] border-l-transparent"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-foreground">{v.id}</span>
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    v.status === "Moving" ? "bg-success animate-pulse-dot" :
                    v.status === "Stopped" ? "bg-warning" : "bg-muted-foreground/50"
                  )} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{v.driver} · {v.status}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Map */}
        <motion.div
          className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card overflow-hidden relative min-h-[520px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="absolute inset-0 bg-secondary/20">
            <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="trackgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#trackgrid)" />
            </svg>
          </div>

          {vehicles.map((v) => (
            <motion.button
              key={v.id}
              onClick={() => setSelectedVehicle(v.id)}
              className="absolute z-10 group"
              style={{ top: `${v.top}%`, left: `${v.left}%` }}
              whileHover={{ scale: 1.3 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + vehicles.indexOf(v) * 0.08, type: "spring", bounce: 0.4 }}
            >
              <div className="relative">
                <div className={cn(
                  "w-4 h-4 rounded-full ring-[3px] ring-card shadow-lg transition-all",
                  v.status === "Moving" ? "bg-success" : v.status === "Stopped" ? "bg-warning" : "bg-muted-foreground/60",
                  selectedVehicle === v.id && "ring-primary/50 scale-125"
                )} />
                {v.status === "Moving" && <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-20" />}
              </div>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-card border border-border rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-elevated pointer-events-none">
                <span className="text-[10px] font-mono font-semibold text-foreground">{v.id}</span>
              </div>
            </motion.button>
          ))}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center opacity-30">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-[10px] text-muted-foreground mt-1">Mapbox Integration</p>
            </div>
          </div>
        </motion.div>

        {/* Detail Panel */}
        <motion.div
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Details</h3>
            {selected && <button onClick={() => setSelectedVehicle(null)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/50 gradient-border">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Truck className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="font-mono text-sm font-bold text-foreground">{selected.id}</p>
                    <p className="text-[11px] text-muted-foreground">{selected.status}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: User, label: "Driver", value: selected.driver },
                    { icon: Gauge, label: "Speed", value: selected.speed },
                    { icon: Fuel, label: "Fuel", value: selected.fuel },
                    { icon: Clock, label: "Last Ping", value: selected.lastPing },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><item.icon className="w-4 h-4 text-muted-foreground" /></div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium text-foreground font-mono">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
                <div className="w-14 h-14 rounded-xl bg-secondary mx-auto mb-3 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground">Select a vehicle</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Click on map or list</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
