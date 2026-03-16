import { useState } from "react";
import { PageHeader } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { MapPin, Truck, Fuel, Clock, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

const sites = ["All Sites", "North Region", "South Region", "East Region", "West Region"];

const vehicles = [
  { id: "VH-2281", driver: "John Carter", status: "Moving", speed: "62 km/h", fuel: "78%", lastPing: "30s ago", lat: 30, lng: 40 },
  { id: "VH-1193", driver: "Sarah Miles", status: "Stopped", speed: "0 km/h", fuel: "45%", lastPing: "2m ago", lat: 50, lng: 60 },
  { id: "VH-3340", driver: "Mike Chen", status: "Moving", speed: "85 km/h", fuel: "62%", lastPing: "15s ago", lat: 35, lng: 55 },
  { id: "VH-0892", driver: "Lisa Brown", status: "Moving", speed: "70 km/h", fuel: "91%", lastPing: "45s ago", lat: 45, lng: 30 },
  { id: "VH-1567", driver: "Tom Wilson", status: "Idle", speed: "0 km/h", fuel: "33%", lastPing: "5m ago", lat: 25, lng: 70 },
];

export default function LiveTracking() {
  const [selectedSite, setSelectedSite] = useState("All Sites");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const selected = vehicles.find((v) => v.id === selectedVehicle);

  return (
    <div>
      <PageHeader title="Live Tracking" subtitle="Real-time vehicle monitoring" />

      <div className="flex items-center gap-3 mb-4">
        {sites.map((site) => (
          <Button
            key={site}
            variant={selectedSite === site ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSite(site)}
          >
            {site}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Vehicle List */}
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Vehicles</h3>
          </div>
          <div className="divide-y divide-border">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVehicle(v.id)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors",
                  selectedVehicle === v.id && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium text-foreground">{v.id}</span>
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    v.status === "Moving" ? "bg-success animate-pulse-dot" :
                    v.status === "Stopped" ? "bg-warning" : "bg-muted-foreground"
                  )} />
                </div>
                <p className="text-caption text-muted-foreground mt-0.5">{v.driver}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Map Area */}
        <div className="lg:col-span-2 bg-card border border-border rounded-md overflow-hidden relative min-h-[500px]">
          <div className="absolute inset-0 bg-secondary/30 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-primary/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Map Integration Area</p>
              <p className="text-caption text-muted-foreground">Mapbox / Google Maps</p>
            </div>
          </div>
          {/* Simulated vehicle markers */}
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicle(v.id)}
              className="absolute z-10"
              style={{ top: `${v.lat}%`, left: `${v.lng}%` }}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 border-card",
                v.status === "Moving" ? "bg-success" : v.status === "Stopped" ? "bg-warning" : "bg-muted-foreground",
                selectedVehicle === v.id && "ring-2 ring-primary ring-offset-2 ring-offset-card"
              )} />
            </button>
          ))}
        </div>

        {/* Vehicle Detail Panel */}
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Vehicle Details</h3>
            {selected && <button onClick={() => setSelectedVehicle(null)}><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
          {selected ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded bg-secondary/50">
                <Truck className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-mono text-sm font-medium text-foreground">{selected.id}</p>
                  <p className="text-caption text-muted-foreground">{selected.status}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-foreground">{selected.driver}</span></div>
                <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-foreground">Speed: <span className="font-mono">{selected.speed}</span></span></div>
                <div className="flex items-center gap-2"><Fuel className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-foreground">Fuel: <span className="font-mono">{selected.fuel}</span></span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-foreground">Last Ping: <span className="font-mono">{selected.lastPing}</span></span></div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Select a vehicle to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
