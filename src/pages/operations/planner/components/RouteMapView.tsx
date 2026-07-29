import React from "react";
import { Map as MapIcon, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RpSite } from "@/lib/routePlannerApi";
import type { Trip } from "../types";

// ═══════════════════════════════════════════════════════
// MAP VIEW
// ═══════════════════════════════════════════════════════
export function RouteMapView({ trip, site, sites = [] }: { trip: Trip | null; site?: RpSite | null; sites?: RpSite[] }) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const layerRef = React.useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // No trip → fall back to single-site preview
  const showTrip = !!trip;
  const fallbackLat = site && site.latitude != null ? Number(site.latitude) : null;
  const fallbackLng = site && site.longitude != null ? Number(site.longitude) : null;
  const hasContent = showTrip || (fallbackLat != null && fallbackLng != null && !(fallbackLat === 0 && fallbackLng === 0));

  // ── Fullscreen toggle ────────────────────────────────
  const toggleFullscreen = React.useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    const onFsChange = () => {
      const active = document.fullscreenElement === wrapperRef.current;
      setIsFullscreen(active);
      // Leaflet caches container size — force it to remeasure after the
      // fullscreen layout change, otherwise the map renders cut off /
      // mis-centered until the next pan/zoom.
      setTimeout(() => { mapRef.current?.invalidateSize(); }, 120);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);
      }
      const map = mapRef.current;

      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
      const group = L.layerGroup().addTo(map);
      layerRef.current = group;

      const pts: [number, number][] = [];

      const siteIcon = (label: string, color: string) => L.divIcon({
        className: "site-warehouse-marker",
        html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
            <div style="background:${color};color:#fff;border-radius:9999px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><rect width="12" height="12" x="6" y="10"/></svg>
            </div>
            <div style="margin-top:2px;background:white;border:1px solid #e5e7eb;border-radius:6px;padding:1px 6px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15)">${label}</div>
          </div>`,
        iconSize: [0, 0], iconAnchor: [0, 0],
      });

      const stopIcon = (n: number, type: "DROP" | "PICKUP") => {
        const color = type === "DROP" ? "#e11d48" : "#0284c7";
        return L.divIcon({
          className: "stop-marker",
          html: `<div style="background:${color};color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white">${n}</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13],
        });
      };

      if (showTrip && trip) {
        const depSite = sites.find(s => s.siteCode === trip.departSite);
        const arrSite = sites.find(s => s.siteCode === trip.arrivalSite);
        const addSite = (s: RpSite | undefined, label: string, color: string) => {
          if (!s || s.latitude == null || s.longitude == null) return;
          const lat = Number(s.latitude), lng = Number(s.longitude);
          if (!lat && !lng) return;
          L.marker([lat, lng], { icon: siteIcon(`${label}: ${s.siteCode}`, color) }).addTo(group);
          pts.push([lat, lng]);
        };
        addSite(depSite, "DEP", "#10b981");
        if (arrSite && arrSite.siteCode !== depSite?.siteCode) addSite(arrSite, "ARR", "#f59e0b");

        const stopPts: [number, number][] = [];
        trip.stops.forEach((s, i) => {
          const lat = Number(s.lat), lng = Number(s.lng);
          if (!lat || !lng) return;
          L.marker([lat, lng], { icon: stopIcon(i + 1, s.type) })
            .bindPopup(`<b>${i + 1}. ${s.type}</b><br/>${s.txn}<br/>${s.client}<br/>${s.address ?? ""}`)
            .addTo(group);
          stopPts.push([lat, lng]);
          pts.push([lat, lng]);
        });

        const linePts: [number, number][] = [];
        if (depSite?.latitude != null && depSite?.longitude != null) linePts.push([Number(depSite.latitude), Number(depSite.longitude)]);
        linePts.push(...stopPts);
        if (arrSite?.latitude != null && arrSite?.longitude != null) linePts.push([Number(arrSite.latitude), Number(arrSite.longitude)]);
        if (linePts.length > 1) {
          L.polyline(linePts, { color: "#6366f1", weight: 3, opacity: 0.7, dashArray: "6 4" }).addTo(group);
        }

        if (pts.length > 0) {
          map.fitBounds(L.latLngBounds(pts as any), { padding: [30, 30], maxZoom: 14 });
        } else {
          map.setView([0, 0], 2);
        }
      } else if (fallbackLat != null && fallbackLng != null && !(fallbackLat === 0 && fallbackLng === 0)) {
        L.marker([fallbackLat, fallbackLng], { icon: siteIcon(site?.siteCode ?? "Site", "hsl(var(--primary))") }).addTo(group);
        map.setView([fallbackLat, fallbackLng], 13);
      } else {
        map.setView([0, 0], 2);
      }

      // Kick a resize in case the container mounted at a stale size
      // (e.g. right after a fullscreen toggle).
      setTimeout(() => map.invalidateSize(), 0);
    })();
    return () => { cancelled = true; };
  }, [trip?.id, trip?.stops, site?.siteCode, sites, fallbackLat, fallbackLng, showTrip]);

  React.useEffect(() => {
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  const fullscreenBtn = (
    <button
      onClick={toggleFullscreen}
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      className="absolute top-3 right-3 z-[500] w-9 h-9 rounded-lg bg-white/95 backdrop-blur border border-border/60 shadow-md flex items-center justify-center hover:bg-white transition-colors"
    >
      {isFullscreen ? <Minimize2 className="w-4 h-4 text-slate-700" /> : <Maximize2 className="w-4 h-4 text-slate-700" />}
    </button>
  );

  if (!hasContent) {
    return (
      <div ref={wrapperRef} className={cn("relative flex-1 flex items-center justify-center bg-slate-50/50 min-h-[320px]", isFullscreen && "bg-white")}>
        {fullscreenBtn}
        <div className="text-center">
          <MapIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a trip or site to preview on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={cn("relative flex-1 min-h-[320px] bg-slate-50 overflow-hidden", isFullscreen && "bg-white")}>
      <div ref={containerRef} className="absolute inset-0" />
      {fullscreenBtn}
      {showTrip && trip && (
        <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur rounded-lg border border-border/60 px-3 py-2 text-xs flex items-center gap-4 pointer-events-none">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#10b981" }} /> Dep</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#f59e0b" }} /> Arr</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Drop</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" /> Pickup</span>
        </div>
      )}
    </div>
  );
}