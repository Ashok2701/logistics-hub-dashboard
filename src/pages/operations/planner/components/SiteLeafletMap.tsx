import React from "react";
import type { RpSite } from "@/lib/routePlannerApi";

export function SiteLeafletMap({ lat, lng, site }: { lat: number; lng: number; site?: RpSite | null }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // leaflet css imported at top of Planner.tsx
      if (cancelled || !containerRef.current) return;
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 13);
        return;
      }
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView([lat, lng], 13);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const label = site?.siteName ?? site?.siteCode ?? "Site";
      const icon = L.divIcon({
        className: "site-warehouse-marker",
        html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
            <div style="background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-radius:9999px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>
            </div>
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid hsl(var(--primary));margin-top:-1px"></div>
            <div style="margin-top:2px;background:white;border:1px solid hsl(var(--border));border-radius:6px;padding:1px 6px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15)">${label}</div>
          </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([lat, lng], { icon }).addTo(map);
    })();
    return () => { cancelled = true; };
  }, [lat, lng, site?.siteCode, site?.siteName]);

  React.useEffect(() => {
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  return (
    <div className="relative flex-1 min-h-[320px] bg-slate-50 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] shadow pointer-events-none">
        <span className="font-semibold text-primary">{site?.siteCode}</span>
        <span className="text-muted-foreground ml-1.5">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
    </div>
  );
}
