import React, { useMemo, useState, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Users, Play, X, CheckCheck, Loader2, Package, Warehouse,
  AlertCircle, Info, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { callVroom, secToHHMM, hhmmToSec, type VroomStep } from "@/lib/vroomApi";
import { tripApi } from "@/lib/tripApi";
import { type Vehicle, type Driver, type Stop, type Trip, stopQty } from "../types";

// ═══════════════════════════════════════════════════════
// ACTIVE TOUR PANEL — new design per wireframe:
//   Left 70%: header row (vehicle | driver | dep | arv | stops | weight | vol | qty | travel)
//   Right 30%: timeline — stop bubbles 1,2,3,4,5...
//   Click timeline bubble → show stop detail inline (no separate zone 3)
// ═══════════════════════════════════════════════════════
export type ActiveTourPanelProps = {
  vehicle: Vehicle | null; driver: Driver | null; stops: Stop[];
  dropZoneActive: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDriverDrop: (e: React.DragEvent) => void;
  onClearVehicle: () => void;
  onClearDriver: () => void;
  onRemoveStop: (id: string) => void;
  onClear: () => void;
  onConfirm: () => void;
  selectedTripStatus?: string | null;
  tripLocked?: boolean;
  // Trip-level identity
  tripDepSite?: string | null;
  tripArrSite?: string | null;
  tripDistanceKm?: number | null;
  tripStartTime?: string | null;
  tripEndTime?: string | null;
  // Optimisation context
  siteLat?: number;
  siteLng?: number;
  activeTripId?: number | null;
  activeTripCode?: string | null;
  planDate?: string;
  onTripOptimised?: (tripId: number, stopResults: any[], totals: { distanceKm: number; travelTime: string; endTime: string }) => void;
};

function genTimes(count: number): string[] {
  let mins = 7 * 60 + 30;
  return Array.from({ length: count }, () => {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    mins += 18 + Math.round(Math.random() * 10);
    return `${h}:${m}`;
  });
}

export function ActiveTourPanel({
  vehicle, driver, stops,
  dropZoneActive, onDragOver, onDragLeave, onDrop, onDriverDrop,
  onClearVehicle, onClearDriver, onRemoveStop, onClear, onConfirm,
  selectedTripStatus,
  tripLocked = false,
  tripDepSite = null, tripArrSite = null, tripDistanceKm = null, tripStartTime = null, tripEndTime = null,
  siteLat = 0, siteLng = 0, activeTripId = null, activeTripCode = null, planDate = "",
  onTripOptimised,
}: ActiveTourPanelProps) {
  const [selectedStop,  setSelectedStop]  = useState<number | null>(null);
  const [showOptModal,  setShowOptModal]  = useState(false);
  const [showOptConfirm, setShowOptConfirm] = useState(false);
  const [optOrder,      setOptOrder]      = useState<"fixed"|"auto">("fixed");
  const [optStartDate,  setOptStartDate]  = useState(() => new Date().toISOString().slice(0, 10));
  const [optStartTime,  setOptStartTime]  = useState("07:30");
  const [optRunning,    setOptRunning]    = useState(false);
  const [optResult,     setOptResult]     = useState<{
    endDate: string; endTime: string; duration: string; distance: string; cost: string; arrival: string;
  } | null>(null);
  const [optError, setOptError] = useState<{ title: string; detail: string } | null>(null);
  const fallbackTimes = useMemo(() => genTimes(stops.length), [stops.length]);
  const times = useMemo(
    () => stops.map((s, i) => s.arrivalTime || fallbackTimes[i]),
    [stops, fallbackTimes]
  );
  const hasOptTimes = stops.some((s) => !!s.arrivalTime);
  const startLabel = tripStartTime || (hasOptTimes ? "07:30" : "");
  const endLabel = tripEndTime || (hasOptTimes && stops.length ? (stops[stops.length - 1].departureTime || "") : "");

  const totalWeight = stops.reduce((n, s) => n + s.netweight, 0);
  const totalVol    = stops.reduce((n, s) => n + s.vol, 0);
  const totalQty    = stops.reduce((n, s) => n + stopQty(s), 0);
  const weightUnit  = stops.find((s) => s.weightUnit)?.weightUnit || "KG";
  const dropCount   = stops.filter((s) => s.type === "DROP").length;
  const pickCount   = stops.filter((s) => s.type === "PICKUP").length;
  const travelMins  = stops.length * 18;
  const isOptimized = selectedTripStatus === "Optimised" || selectedTripStatus === "Optimized";
  const travelStr   = (stops.length && isOptimized)
    ? `${String(Math.floor(travelMins / 60)).padStart(2,"0")}:${String(travelMins % 60).padStart(2,"0")}`
    : "—";

  const capPct = vehicle ? Math.min(100, Math.round((totalWeight / vehicle.capacity) * 100)) : 0;
  const capColor = capPct > 90 ? "bg-rose-500" : capPct > 70 ? "bg-amber-500" : "bg-emerald-500";
  const hasAssignment = !!(vehicle || driver || stops.length);

  const selectedStopData = selectedStop !== null ? stops[selectedStop] : null;

  // Chip component — small inline field
  function Chip({ label, value, onClick, filled }: { label: string; value: string; onClick?: () => void; filled?: boolean }) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "flex flex-col min-w-[60px] px-2 py-1 rounded border text-center flex-shrink-0",
          filled ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 cursor-pointer" :
          onClick ? "border-dashed border-border/50 bg-muted/10 cursor-pointer hover:border-primary/40" :
          "border-border/30 bg-muted/20"
        )}
      >
        <span className="text-[8px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">{label}</span>
        <span className={cn("text-[11px] font-semibold leading-none truncate", filled ? "text-emerald-700" : "text-foreground")}>
          {value || <span className="text-muted-foreground/40 italic text-[9px]">—</span>}
        </span>
      </div>
    );
  }

  return (
    <>
    <div
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={cn(
        "rounded-lg overflow-hidden transition-all",
        dropZoneActive ? "ring-2 ring-primary/40 bg-primary/2" : ""
      )}
      style={{ border: "1px solid hsl(var(--border) / 0.4)" }}
    >
      {/* ── HEADER ROW — full width single line ────────── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 flex-shrink-0" style={{ background: "linear-gradient(135deg, #5b6b8c, #3d4a63)" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center">
            <Play className="w-4 h-4 text-white flex-shrink-0" />
          </div>
          <span className="text-[11px] font-semibold text-white tracking-wide">Active Trip</span>
          {dropZoneActive && <span className="text-[9px] text-primary animate-pulse ml-1">Drop here…</span>}
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const isEmpty = !vehicle && !driver && stops.length === 0;
            const editable = !selectedTripStatus
              || selectedTripStatus === "Open"
              || selectedTripStatus === "Optimised"
              || selectedTripStatus === "Optimized";
            const showConfirm = !isEmpty && editable;
            const canConfirm = !!vehicle && !!driver && stops.length >= 1;
            const showOptimise = !!selectedTripStatus && editable;
            return (
              <>
                {showConfirm && (
                  <Button size="sm"
                    className="h-7 text-[9px] gap-1 bg-emerald-500 hover:bg-emerald-400 text-white border-0 px-2.5 rounded-lg shadow-sm disabled:opacity-50"
                    disabled={!canConfirm || tripLocked}
                    title={tripLocked ? "Trip is locked — unlock to confirm" : !canConfirm ? "Assign vehicle, driver and at least one stop" : "Confirm"}
                    onClick={onConfirm}>
                    <CheckCheck className="w-4 h-4" /> Confirm
                  </Button>
                )}
                {showOptimise && (
                  <Button size="sm"
                    className="h-7 text-[9px] gap-1 px-2.5 border-0 rounded-lg shadow-sm"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#0f172a" }}
                    disabled={tripLocked}
                    title={tripLocked ? "Trip is locked — unlock to optimise" : "Optimise"}
                    onClick={() => {
                      if (selectedTripStatus === "Open") setShowOptConfirm(true);
                      else setShowOptModal(true);
                    }}>
                    <Zap className="w-4 h-4" /> Optimise
                  </Button>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── MAIN ROW: 70% chips | 30% timeline ─────────── */}
      <div className="flex items-stretch bg-card" style={{ minHeight: 64 }}>

        {/* LEFT 70% — chips in one row */}
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap" style={{ width: "70%" }}>

          {/* Vehicle chip */}
          <div
            onClick={() => !vehicle && undefined}
            className={cn(
              "flex flex-col min-w-[72px] px-2 py-1 rounded border flex-shrink-0",
              vehicle
                ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"
                : "border-dashed border-border/50 bg-muted/10"
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] uppercase tracking-wide text-muted-foreground leading-none">Vehicle</span>
              {vehicle && <button onClick={onClearVehicle} className="w-4 h-4 flex items-center justify-center rounded-full text-emerald-700/50 hover:text-rose-600 hover:bg-rose-100 transition-colors"><X className="w-3.5 h-3.5" /></button>}
            </div>
            <span className={cn("text-[11px] font-mono font-bold leading-none mt-0.5 truncate", vehicle ? "text-emerald-700" : "text-muted-foreground/30 italic text-[9px]")}>
              {vehicle ? vehicle.code : "—"}
            </span>
          </div>

          {/* Driver chip */}
          <div
            onDragOver={(e) => e.preventDefault()} onDrop={onDriverDrop}
            className={cn(
              "flex flex-col min-w-[80px] px-2 py-1 rounded border flex-shrink-0",
              driver
                ? "border-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/20"
                : "border-dashed border-border/50 bg-muted/10"
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] uppercase tracking-wide text-muted-foreground leading-none">Driver</span>
              {driver && <button onClick={onClearDriver} className="w-4 h-4 flex items-center justify-center rounded-full text-indigo-700/50 hover:text-rose-600 hover:bg-rose-100 transition-colors"><X className="w-3.5 h-3.5" /></button>}
            </div>
            <span className={cn("text-[11px] font-semibold leading-none mt-0.5 truncate", driver ? "text-indigo-700" : "text-muted-foreground/30 italic text-[9px]")}>
              {driver ? driver.name : "—"}
            </span>
          </div>

          {/* Separator */}
          <div className="w-px self-stretch bg-border/30 mx-0.5" />

          {/* Stat chips */}
          {([
            { label: "Dep Site",  value: tripDepSite || vehicle?.departureSite || "—" },
            { label: "Arv Site",  value: tripArrSite || vehicle?.arrivalSite   || "—" },
            { label: "Stops",     value: String(stops.length) },
            { label: "Drops",     value: String(dropCount) },
            { label: "Pickups",   value: String(pickCount) },
            { label: "Weight",    value: `${totalWeight || 0}${weightUnit}` },
            { label: "Volume",    value: `${totalVol || 0}m³` },
            { label: "Qty",       value: `${totalQty || 0} UN` },
            { label: "Travel",    value: travelStr },
            ...(selectedTripStatus && selectedTripStatus !== "Open" && tripDistanceKm != null
              ? [{ label: "Distance", value: `${Number(tripDistanceKm).toFixed(1)} km` }]
              : []),
          ] as { label: string; value: string }[]).map(({ label, value }) => (
            <div key={label} className="flex flex-col min-w-[44px] px-1.5 py-1 rounded border border-border/30 bg-muted/20 flex-shrink-0 text-center">
              <span className="text-[8px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">{label}</span>
              <span className="text-[11px] font-semibold leading-none text-foreground">{value}</span>
            </div>
          ))}

          {/* Capacity bar */}
          {vehicle && stops.length > 0 && (
            <div className="flex items-center gap-1 min-w-[60px] flex-shrink-0">
              <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full", capColor)} style={{ width: `${capPct}%` }} />
              </div>
              <span className={cn("text-[9px] font-bold", capPct > 90 ? "text-rose-600" : "text-emerald-600")}>{capPct}%</span>
            </div>
          )}
        </div>

        {/* RIGHT 30% — road timeline ──────────────────────── */}
        <div
          className="flex items-center border-l border-border/30 bg-muted/10 px-3 overflow-hidden"
          style={{ width: "30%" }}
        >
          {stops.length === 0 ? (
            <div className="flex items-center w-full gap-1 opacity-30">
              <div className="w-2 h-2 rounded-full border-2 border-border bg-card flex-shrink-0" />
              <div className="flex-1 h-px border-t-2 border-dashed border-border/50" />
              <div className="w-2 h-2 rounded-full border-2 border-border bg-card flex-shrink-0" />
            </div>
          ) : (
            <div
              className="flex items-center w-full overflow-x-auto py-1 pb-3"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#cbd5e1 transparent",
              }}
            >
              <div className="flex items-center min-w-full">
                {/* Departure site node */}
                <div className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    {stops.length <= 8 && (
                      <span className="text-[7px] text-muted-foreground leading-none mb-0.5 font-mono">
                        {startLabel || "—"}
                      </span>
                    )}
                    <div
                      title={`Depart ${tripDepSite ?? ""}`}
                      className="w-7 h-7 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0"
                    >
                      <Warehouse className="w-3.5 h-3.5" />
                    </div>
                    {stops.length <= 6 && (
                      <span className="text-[7px] text-muted-foreground leading-none mt-0.5 max-w-[40px] truncate text-center">
                        {tripDepSite ?? "Site"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center flex-shrink-0 mx-0.5" style={{ width: stops.length <= 4 ? 32 : stops.length <= 8 ? 20 : 12 }}>
                    <div className="w-full flex items-center gap-px">
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-border to-border/60" />
                      <div className="w-1 h-1 rounded-full bg-border/60 flex-shrink-0" />
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-border/60 to-border" />
                    </div>
                  </div>
                </div>
                {stops.map((s, i) => {
                  const isSelected = selectedStop === i;
                  const dotSize = stops.length <= 5 ? "w-7 h-7 text-[9px]"
                                : stops.length <= 10 ? "w-6 h-6 text-[8px]"
                                : "w-5 h-5 text-[7px]";
                  return (
                    <div key={s.id} className="flex items-center flex-shrink-0">
                      {/* Stop node */}
                      <div className="flex flex-col items-center">
                        {/* Time above */}
                        {stops.length <= 8 && (
                          <span className="text-[7px] text-muted-foreground leading-none mb-0.5 font-mono">
                            {times[i] || "—"}
                          </span>
                        )}
                        {/* Circle */}
                        <button
                          onClick={() => setSelectedStop(isSelected ? null : i)}
                          title={`${s.txn} · ${s.client}${s.arrivalTime ? ` · arr ${s.arrivalTime}` : ""}`}
                          className={cn(
                            "rounded-full border-2 flex items-center justify-center font-bold transition-all flex-shrink-0",
                            dotSize,
                            isSelected
                              ? s.type === "DROP"
                                ? "bg-rose-600 border-rose-600 text-white scale-110 shadow-md"
                                : "bg-sky-600 border-sky-600 text-white scale-110 shadow-md"
                              : s.type === "DROP"
                                ? "bg-white border-rose-400 text-rose-600 hover:bg-rose-50 hover:scale-105"
                                : "bg-white border-sky-400 text-sky-600 hover:bg-sky-50 hover:scale-105"
                          )}
                        >
                          {i + 1}
                        </button>
                        {/* Stop label below */}
                        {stops.length <= 6 && (
                          <span className="text-[7px] text-muted-foreground leading-none mt-0.5 max-w-[40px] truncate text-center">
                            {s.client.split(" ")[0]}
                          </span>
                        )}
                      </div>
                      {/* Road connector to next node (stop or arrival site) */}
                      <div className="flex items-center flex-shrink-0 mx-0.5"
                        style={{ width: stops.length <= 4 ? 32 : stops.length <= 8 ? 20 : 12 }}>
                        <div className="w-full flex items-center gap-px">
                          <div className="flex-1 h-0.5 bg-gradient-to-r from-border to-border/60" />
                          <div className="w-1 h-1 rounded-full bg-border/60 flex-shrink-0" />
                          <div className="flex-1 h-0.5 bg-gradient-to-r from-border/60 to-border" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Arrival site node */}
                <div className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    {stops.length <= 8 && (
                      <span className="text-[7px] text-muted-foreground leading-none mb-0.5 font-mono">
                        {endLabel || "—"}
                      </span>
                    )}
                    <div
                      title={`Arrive ${tripArrSite ?? ""}`}
                      className="w-7 h-7 rounded-full border-2 border-indigo-500 bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0"
                    >
                      <Warehouse className="w-3.5 h-3.5" />
                    </div>
                    {stops.length <= 6 && (
                      <span className="text-[7px] text-muted-foreground leading-none mt-0.5 max-w-[40px] truncate text-center">
                        {tripArrSite ?? "Site"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* ── SELECTED STOP DETAIL — inline, no border ──── */}
      <AnimatePresence>
        {selectedStopData && (
          <motion.div
            key={selectedStop}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-border/20 bg-muted/10"
          >
            <div className="flex items-start gap-4 px-3 py-1.5">
              {/* Stop type badge */}
              <span className={cn(
                "text-[9px] px-2 py-0.5 rounded font-bold flex-shrink-0 mt-0.5",
                selectedStopData.type === "DROP" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"
              )}>
                #{(selectedStop ?? 0) + 1} {selectedStopData.type}
              </span>
              <div className="grid grid-cols-6 gap-x-4 gap-y-0.5 flex-1 text-[10px]">
                <div><span className="text-muted-foreground">Doc:</span> <span className="font-mono text-primary font-semibold">{selectedStopData.txn}</span></div>
                <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{selectedStopData.client}</span></div>
                <div><span className="text-muted-foreground">Code:</span> <span className="font-mono">{selectedStopData.bpcode}</span></div>
                <div><span className="text-muted-foreground">City:</span> <span>{selectedStopData.city}</span></div>
                <div><span className="text-muted-foreground">Time:</span> <span className="font-mono">{times[selectedStop ?? 0]}</span></div>
                <div><span className="text-muted-foreground">Priority:</span>
                  <span className={cn("ml-1 text-[9px] px-1 rounded font-bold",
                    selectedStopData.priority === "URGENT" ? "bg-rose-100 text-rose-700" :
                    selectedStopData.priority === "LOW" ? "bg-slate-100 text-slate-600" : "bg-green-100 text-green-700"
                  )}>{selectedStopData.priority}</span>
                </div>
                <div><span className="text-muted-foreground">Address:</span> <span>{selectedStopData.address}</span></div>
                <div><span className="text-muted-foreground">Postal:</span> <span>{selectedStopData.postalCity}</span></div>
                <div><span className="text-muted-foreground">Qty:</span> <span className="font-mono">{stopQty(selectedStopData)} UN</span></div>
                <div><span className="text-muted-foreground">Weight:</span> <span className="font-mono">{selectedStopData.netweight}{selectedStopData.weightUnit || "KG"}</span></div>
                <div><span className="text-muted-foreground">Vol:</span> <span className="font-mono">{selectedStopData.vol}m³</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* empty state */}
      {!hasAssignment && (
        <div className="flex items-center justify-center gap-4 py-3 text-muted-foreground/40 text-[11px] bg-card">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-200"><Truck className="w-5 h-5" /> Vehicle</span>
          <span>+</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-200"><Users className="w-5 h-5" /> Driver</span>
          <span>+</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-200"><Package className="w-5 h-5" /> Stops</span>
          <span>→</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/50 border border-dashed border-emerald-200 text-emerald-600"><CheckCheck className="w-5 h-5" /> Confirm</span>
        </div>
      )}
    </div>

    {/* ── OPTIMISE MODAL ────────────────────────────────── */}
    <AnimatePresence>
      {showOptModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1200] flex items-center justify-start pl-8"
          style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(2px)" }}
          onClick={() => !optRunning && setShowOptModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: 400, fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"
              style={{ background: "linear-gradient(135deg,#1e40af,#1d4ed8)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 3px 10px rgba(245,158,11,.4)" }}>
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white leading-tight">Optimise Trip</p>
                  {vehicle && <p className="text-[10px] text-blue-200 mt-0.5">{vehicle.code} · {driver?.name ?? "No driver"} · {stops.length} stop{stops.length !== 1 ? "s" : ""}</p>}
                </div>
              </div>
              {!optRunning && (
                <button onClick={() => setShowOptModal(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">

              {/* Trip info block — always visible */}
              <div>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Trip Info</p>
                <div className="rounded-xl border border-gray-100 overflow-hidden" style={{ background: "#f8fafc" }}>
                  <div className="grid grid-cols-3 divide-x divide-gray-100">
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Trip No</p>
                      <p className="text-[12px] font-bold text-gray-800 font-mono mt-0.5 break-words">{activeTripCode ?? (vehicle ? `DRAFT-${vehicle.code}` : "DRAFT")}</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Vehicle</p>
                      <p className="text-[12px] font-bold text-emerald-700 font-mono mt-0.5 truncate">{vehicle?.code ?? "—"}</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Driver</p>
                      <p className="text-[12px] font-bold text-indigo-700 mt-0.5 break-words">{driver?.name ?? "—"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Start Date</p>
                      <p className="text-[12px] font-bold text-gray-800 font-mono mt-0.5">{optStartDate}</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">No of Stops</p>
                      <p className="text-[12px] font-bold text-gray-800 mt-0.5">{stops.length}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Departure</p>
                      <p className="text-[12px] font-bold text-gray-800 font-mono mt-0.5">{optStartTime}</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Arrival</p>
                      <p className="text-[12px] font-bold text-gray-800 font-mono mt-0.5">{optResult?.arrival ?? "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optimisation result — visible after optimisation */}
              {optResult && (
                <div>
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Optimisation Result
                  </p>
                  <div className="rounded-xl border border-emerald-100 overflow-hidden" style={{ background: "#f0fdf4" }}>
                    <div className="grid grid-cols-2 divide-x divide-emerald-100">
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">End Date</p>
                        <p className="text-[12px] font-bold text-emerald-900 font-mono mt-0.5">{optResult.endDate}</p>
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">End Time</p>
                        <p className="text-[12px] font-bold text-emerald-900 font-mono mt-0.5">{optResult.endTime}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-emerald-100 border-t border-emerald-100">
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">Duration</p>
                        <p className="text-[12px] font-bold text-emerald-900 mt-0.5">{optResult.duration}</p>
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">Distance</p>
                        <p className="text-[12px] font-bold text-emerald-900 mt-0.5">{optResult.distance}</p>
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-[9px] text-emerald-700/70 uppercase tracking-wide font-semibold">Cost</p>
                        <p className="text-[12px] font-bold text-emerald-900 mt-0.5">{optResult.cost}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}



              {/* Order toggle */}
              <div>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Stop Order</p>
                <div className="flex border-2 rounded-xl overflow-hidden" style={{ borderColor: "#dbeafe" }}>
                  {(["fixed","auto"] as const).map((mode) => (
                    <button key={mode} onClick={() => setOptOrder(mode)}
                      className="flex-1 py-2.5 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={{
                        background: optOrder === mode ? "#1e40af" : "#fff",
                        color: optOrder === mode ? "#fff" : "#94a3b8",
                      }}>
                      {mode === "fixed" ? <><span>📌</span> Fixed Order</> : <><span>🔀</span> Auto Route</>}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {optOrder === "fixed" ? "Stops stay in their current sequence" : "System finds the fastest possible route"}
                </p>
              </div>

              {/* Start date + time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Start Date</p>
                  <input type="date" value={optStartDate}
                    onChange={(e) => setOptStartDate(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-100 px-3 py-2.5 text-[12px] font-bold text-gray-800 focus:outline-none focus:border-blue-400"
                    style={{ fontFamily: "Inter, monospace" }}
                  />
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Start Time</p>
                  <input type="time" value={optStartTime}
                    onChange={(e) => setOptStartTime(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-100 px-3 py-2.5 text-[12px] font-bold text-gray-800 focus:outline-none focus:border-blue-400"
                    style={{ fontFamily: "Inter, monospace" }}
                  />
                </div>
              </div>



              {/* Run button */}
              <button
                disabled={optRunning}
                onClick={async () => {
                  if (!stops.length) return;
                  const depLat = siteLat;
                  const depLng = siteLng;
                  if (!depLat || !depLng) {
                    setOptError({ title: "Missing Site Coordinates", detail: "This site has no latitude/longitude. Go to Configuration → Customers → select the site address and set lat/lng." });
                    return;
                  }
                  const missing = stops.filter(s => !s.lat || !s.lng);
                  if (missing.length) {
                    setOptError({ title: "Missing Stop Coordinates", detail: `${missing.length} stop(s) are missing lat/lng coordinates:\n${missing.map(s => `• ${s.txn} — ${s.client}`).join("\n")}\n\nGo to Configuration → Customers → update each address with coordinates.` });
                    return;
                  }
                  setOptRunning(true);
                  try {
                    const startSec = hhmmToSec(optStartTime);
                    const capGrams = Math.round((vehicle?.capacity ?? 60000) * 1000);

                    const vroomVehicle = {
                      id: 1,
                      description: vehicle?.code ?? "VEH",
                      start: [depLng, depLat] as [number,number],
                      end:   [depLng, depLat] as [number,number],
                      capacity: [capGrams] as [number],
                      time_window: [startSec, hhmmToSec("23:59")] as [number,number],
                      max_tasks: 999,
                    };

                    const vroomJobs = stops.map((s, i) => ({
                      id: i + 1,
                      description: s.txn,
                      location: [s.lng, s.lat] as [number,number],
                      service: 1800,  // 30 min default
                      ...(s.type === "DROP"
                        ? { delivery: [Math.round((s.netweight || 1) * 1000)] as [number] }
                        : { pickup:   [Math.round((s.netweight || 1) * 1000)] as [number] }),
                      priority: s.priority === "URGENT" ? 10 : s.priority === "LOW" ? 1 : 5,
                    }));

                    const result = await callVroom([vroomVehicle], vroomJobs);
                    if (!result.routes?.length) throw new Error("VROOM returned no routes");

                    const route   = result.routes[0];
                    const jobSteps = route.steps.filter((st: VroomStep) => st.type === "job");
                    const endStep  = route.steps.find((st: VroomStep)  => st.type === "end");
                    const endTime  = secToHHMM(endStep ? endStep.arrival : startSec + route.duration);
                    const totalDistKm = (route.distance / 1000).toFixed(1);
                    const travelHHMM  = secToHHMM(route.duration);

                    const stopResults = jobSteps.map((st: VroomStep, i: number) => ({
                      seq: i + 1,
                      docNum: st.description ?? "",
                      arrivalDate:   planDate,
                      arrivalTime:   secToHHMM(st.arrival),
                      departureDate: planDate,
                      departureTime: secToHHMM(st.arrival + st.service),
                      fromPrevDistance:    ((st.distance ?? 0) / 1000).toFixed(1),
                      fromPrevTravelTime:  secToHHMM(st.duration),
                      serviceTime: secToHHMM(st.service),
                      waitingTime: secToHHMM(st.waiting_time ?? 0),
                    }));

                    setOptResult({
                      endDate: planDate, endTime,
                      arrival: endTime,
                      duration: travelHHMM,
                      distance: `${totalDistKm} km`,
                      cost: "",
                    });

                    // Persist to backend if tripCode available
                    if (activeTripCode) {
                      const { optimiseTrip } = await import("@/lib/tripApi");
                      await optimiseTrip(activeTripCode, {
                        orderMode: optOrder, startTime: optStartTime, endTime,
                        travelTime: travelHHMM, totalTime: travelHHMM,
                        totalDistance: totalDistKm, uomDistance: "km",
                        totalCost: "", distanceCost: "", fixedCost: "", serviceCost: "",
                        stopResults,
                      });
                      if (activeTripId != null) onTripOptimised?.(activeTripId, stopResults, { distanceKm: Number(totalDistKm), travelTime: travelHHMM, endTime });
                    }

                    toast({ title: "Optimisation complete ✓",
                      description: `${jobSteps.length} stops · ${totalDistKm} km · end ${endTime}` });
                    setShowOptModal(false);
                  } catch(err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    setOptError({ title: "Optimisation Failed", detail: msg });
                  } finally { setOptRunning(false); }
                }}
                className="w-full py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: optRunning ? "#f1f5f9" : "linear-gradient(135deg,#1e40af,#1d4ed8)",
                  color: optRunning ? "#94a3b8" : "#fff",
                  boxShadow: optRunning ? "none" : "0 4px 16px rgba(30,64,175,.3)",
                  cursor: optRunning ? "not-allowed" : "pointer",
                }}
              >
                {optRunning
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Running Optimisation…</>
                  : <><Zap className="w-4 h-4" style={{ color: "#f59e0b" }} /> Run Optimisation</>
                }
              </button>

            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── Error popup (VROOM / validation errors) ──────── */}
      {optError && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1300] flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setOptError(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: 380, fontFamily: "Inter, system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4"
              style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-[13px] font-bold text-white flex-1">{optError.title}</p>
              <button onClick={() => setOptError(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12px] text-gray-700 whitespace-pre-line leading-relaxed">
                {optError.detail}
              </p>
            </div>
            <div className="px-5 pb-4 flex justify-end">
              <button onClick={() => setOptError(null)}
                className="px-5 py-2 rounded-lg text-[12px] font-bold bg-red-600 hover:bg-red-700 text-white transition-colors">
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <AlertDialog open={showOptConfirm} onOpenChange={setShowOptConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Optimise Trip?</AlertDialogTitle>
          <AlertDialogDescription>
            The trip is currently in <b>Open</b> status. Do you want to optimise it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowOptConfirm(false); setShowOptModal(true); }}>
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// ROUTE MANAGEMENT DETAIL — full screen page
// Shown when (i) is clicked on a trip row
// Back button returns to planner without reloading data
// ═══════════════════════════════════════════════════════
