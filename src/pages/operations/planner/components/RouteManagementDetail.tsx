import React, { useState, useEffect } from "react";
import {
  Truck, Users, CheckCheck, ChevronLeft, Loader2, Package,
  Route as RouteIcon, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { type Vehicle, type Driver, type Trip } from "../types";

// ═══════════════════════════════════════════════════════
// ROUTE MANAGEMENT DETAIL — full-screen trip detail page
// (Route Information / Schedule / Transactions / LVS workflow)
// ═══════════════════════════════════════════════════════
export function RouteManagementDetail({ trip, onBack, vrHeader, vrDetails, vrLoadStock, vrLoading, onLvsCreate, onLvsConfirm, onLvsLoadTruck }: { trip: Trip; onBack: () => void; vrHeader?: any; vrDetails?: any[]; vrLoadStock?: any[]; vrLoading?: boolean; onLvsCreate?: () => void | Promise<void>; onLvsConfirm?: (lvsNum: string) => void | Promise<void>; onLvsLoadTruck?: (lvsNum: string) => void | Promise<void> }) {
  // Tracks which action button (if any) currently has a backend call in
  // flight — shows a spinner + disables the button so clicking it gives
  // immediate visible feedback instead of a blank-feeling wait while the
  // SOAP call is out.
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [vehicleImgError, setVehicleImgError] = useState(false);

  // ── All display data is sourced from vrHeader / vrDetails / vrLoadStock ──
  const H  = (vrHeader ?? {}) as any;
  const rows = Array.isArray(vrDetails) ? vrDetails : [];
  const stock = Array.isArray(vrLoadStock) ? vrLoadStock : [];
  const stock0: any = stock[0] ?? null;
  const hasStock = stock.length > 0;

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = H[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };
  const dash = (v: any) => (v === undefined || v === null || v === "" ? "—" : String(v));
  const fmtDT = (d?: any, t?: any) => {
    // Uses fmtDateMDY (defined below) for the date part so this matches
    // the MM-DD-yyyy format used everywhere else on this page — was
    // previously just slicing the raw yyyy-mm-dd ISO string.
    const dd = d ? fmtDateMDY(d) : "";
    const tt = t ? String(t).slice(0, 5) : "";
    const s = [dd === "—" ? "" : dd, tt].filter(Boolean).join(" ");
    return s || "—";
  };

  // Route Information
  // Date formatter → MM-DD-YYYY
  const fmtDateMDY = (v: any) => {
    if (v === undefined || v === null || v === "") return "—";
    const s = String(v);
    // Try ISO / yyyy-mm-dd prefix
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[2]}-${iso[3]}-${iso[1]}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yy = d.getFullYear();
      return `${mm}-${dd}-${yy}`;
    }
    return s;
  };

  //const routeNum   = dash(hasStock ? (stock0.vcrnum ?? stock0.VCRNUM_0 ?? stock0.vrcode ?? pick("xnumpc","vcrnum")) : pick("xnumpc","vcrnum"));
  // Vehicle Load Stock → VCRNUM_0 from loadstk when it exists
  const routeNum = dash(pick("xnumpc","trip","seq"));
  const vlsCodeRaw = hasStock ? (stock0?.vcrnum ?? stock0?.VCRNUM_0 ?? stock0?.xnum ?? stock0?.lvsnum) : undefined;
  const vlsCode    = dash(vlsCodeRaw);
  // Status → "Validated" when loadstk data exists, otherwise "Locked"
  const statusVal  = hasStock ? "Validated" : "Locked";
  const depSite    = dash(pick("fcy","depfcy","fcy_0"));
  const arrSite    = dash(pick("arrfcy","fcy","fcy_0"));
  const carrier    = dash(pick("bptnum","carrier"));
  const vehClass   = dash(pick("vehclass","category","xcategory"));
  const vehicle    = dash(pick("codeyve","vehicle"));
  const vehicleImageUrl = pick("vehicleImage");
const hasVehicleImage = !!vehicleImageUrl && String(vehicleImageUrl).trim() !== "" && !vehicleImgError;
  const driverId   = dash(pick("driverid","driverId","cod_driver"));
  const driverName = dash(pick("drivername","driverName","driver"));
  const createDate = fmtDateMDY(pick("datexec","datcre","creationdate"));
  const createTime = dash(pick("creationtime","timcre","heucre"));
  const tripNum    = dash(pick("xroutnbr","xroutnbr","xroutnbr"));

  // Schedule
  const depDate = fmtDateMDY(pick("datexec","datcre","creationdate"));
  const depTime = String(pick("heudep","depTime") ?? "").slice(0, 5) || "—";
  const retDate = fmtDateMDY(pick("datret","datexec","creationdate"));
  const retTime = String(pick("heuarr","retTime") ?? "").slice(0, 5) || "—";

  // Totals derived from vrDetails
  // const totalKm  = rows.reduce((sum: number, r: any) => sum + (Number(r.fromprevdist ?? r.fromPrevDist ?? 0) || 0), 0);
  // const totalMin = rows.reduce((sum: number, r: any) => {
  //   const t = String(r.fromprevtra ?? r.fromprevtravel ?? r.fromPrevTravel ?? "0:0");
  //   const [h, m] = t.split(":").map((x: string) => Number(x) || 0);
  //   return sum + (h * 60 + m);
  // }, 0);
  // const totalH   = Math.floor(totalMin / 60);
  // const totalM   = totalMin % 60;
  // const travelCost = Math.round(totalKm * 0.045);
  // const distCost   = Math.round(totalKm * 1.5);
  // const totalCost  = travelCost + distCost;

  // Totals derived from trip (was: rows / vrLoadStock reduces)
  console.log("RouteManagementDetail: trip", trip);
  const stops = trip.stops ?? [];
  const dropStops    = stops.filter((s) => s.type === "DROP");
  const pickupStops  = stops.filter((s) => s.type !== "DROP");

  const dropWeight   = dropStops.reduce((s, x) => s + (Number(x.netweight) || 0), 0);
  const dropVolume   = dropStops.reduce((s, x) => s + (Number(x.vol) || 0), 0);
  const pickupWeight = pickupStops.reduce((s, x) => s + (Number(x.netweight) || 0), 0);
  const pickupVolume = pickupStops.reduce((s, x) => s + (Number(x.vol) || 0), 0);

  const totalKm  = Number(trip.distanceKm) || 0;
  const travelMin = Number(trip.travelTimeMin / 60) || 0;
  const travelH   = Math.floor(travelMin / 60);
  const travelM   = travelMin % 60;
  const totalMin = Number(trip.totalTime / 60) || 0;
  const totalH   = Math.floor(totalMin / 60);
  const totalM   = totalMin % 60;
  const travelCost = Number(totalKm * 0.045).toFixed(2);
  const distCost   = Number(totalKm * 1.5).toFixed(2);
  const totalCost  = (Number(travelCost) + Number(distCost)).toFixed(2);

  useEffect(() => {
  setVehicleImgError(false);
}, [H]);

  return (
    <div className="flex flex-col bg-background min-h-screen" style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: "11px" }}>
      <div className="flex-1 overflow-y-auto">

        {/* ── Minimal header: Back (left) + Workflow steps (right) ── */}
        <div
          className="relative px-5 py-3 sticky top-0 z-10 shadow-md border-b border-slate-900/10"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Back button */}
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary-foreground/90 hover:text-primary-foreground bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-md transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Planner
            </button>

            {/* Workflow steps (right) */}
            {(() => {
              // Stage index derived from trip status:
              //   Locked     → 0 (LVS Create is active)
              //   Validated  → 1 (LVS Confirm is active; LVS Create is done)
              //   Loaded     → 2 (Load Truck done; Unload active)
              //   Unloaded   → 3 (all done)
              const status = String((trip as any).optiStatus ?? trip.status ?? "").toLowerCase();
              const stage =
                status === "unloaded" ? 3 :
                status === "loaded"   ? 2 :
                status === "validated"? 1 :
                status === "locked"   ? 0 : -1;

              const steps = [
                { key: "lvs-create",  label: "LVS Create",  icon: RouteIcon, onClick: async () => {
                  setActionBusy("lvs-create");
                  try { await onLvsCreate?.(); } finally { setActionBusy(null); }
                } },
                { key: "lvs-confirm", label: "LVS Confirm", icon: CheckCheck,onClick: async () => {
                  if (!vlsCodeRaw) {
                    toast({ title: "LVS Confirm unavailable", description: "No LVS number found for this trip yet.", variant: "destructive" });
                    return;
                  }
                  setActionBusy("lvs-confirm");
                  try { await onLvsConfirm?.(String(vlsCodeRaw)); } finally { setActionBusy(null); }
                } },
                { key: "load",        label: "Load Truck",  icon: Truck,     onClick: async () => {
                  if (!vlsCodeRaw) {
                    toast({ title: "Load Truck unavailable", description: "No LVS number found for this trip yet.", variant: "destructive" });
                    return;
                  }
                  setActionBusy("load");
                  try { await onLvsLoadTruck?.(String(vlsCodeRaw)); } finally { setActionBusy(null); }
                } },
                { key: "unload",      label: "Unload Truck",icon: Package,   onClick: () => toast({ title: "Unload Truck",description: `Trip ${trip.tripCode ?? trip.id}` }) },
              ];

              return (
                <div className="flex items-center gap-1.5">
                  {steps.map((s, i) => {
                    const Icon = s.icon;
                    const isDone   = stage >= 0 && i < stage;
                    const isActive = stage >= 0 && i === stage;
                    const isFuture = !isDone && !isActive;
                    const isBusy   = actionBusy === s.key;
                    const disabled = isDone || isFuture || (!!actionBusy && !isBusy);
                    return (
                      <React.Fragment key={s.key}>
                        <button
                          disabled={disabled}
                          onClick={disabled ? undefined : s.onClick}
                          title={
                            isBusy   ? `${s.label} — working…` :
                            isDone   ? `${s.label} — completed` :
                            isActive ? s.label :
                                       `${s.label} — not yet available`
                          }
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap border",
                            isDone   && "bg-emerald-500 text-white border-emerald-400 cursor-not-allowed shadow-sm",
                            isActive && !isBusy && "bg-white text-primary border-white ring-2 ring-white/60 shadow-sm hover:bg-white/90 cursor-pointer",
                            isBusy   && "bg-white text-primary border-white ring-2 ring-white/60 shadow-sm cursor-wait opacity-90",
                            isFuture && "bg-white/10 text-primary-foreground/50 border-white/10 cursor-not-allowed opacity-70",
                          )}
                        >
                          {isBusy
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : isDone
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : <Icon className="w-3.5 h-3.5" />}
                          {isBusy ? "Working…" : s.label}
                        </button>
                        {i < steps.length - 1 && (
                          <div className={cn(
                            "w-6 h-[2px] rounded-full",
                            i < stage ? "bg-emerald-400" : "bg-white/25"
                          )} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="p-5 space-y-4 bg-muted/40 min-h-full">

          {/* ── Route info card ── */}
          <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
              <span className="w-1 h-4 rounded-full bg-primary" />
              <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Route Information</h3>
            </div>
            <div className="p-4 grid grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 text-[11px]">
              {[
                { label: "Route Num",            value: routeNum,   highlight: true },
                { label: "Vehicle Load Stock",   value: vlsCode },
                { label: "Status",               value: statusVal,  highlight: true },
                { label: "Departure Site",       value: depSite },
                { label: "Arrival Site",         value: arrSite },
                { label: "Carrier",              value: carrier },
                { label: "Vehicle Category",        value: vehClass },
                { label: "Vehicle",              value: vehicle,    highlight: true },
                { label: "Route Type",           value: "Scheduled" },
                { label: "Driver ID",            value: driverId },
                { label: "Driver",               value: driverName, highlight: true },
                { label: "Creation Date",        value: createDate },
                { label: "Creation Time",        value: createTime },
                { label: "Trip",                 value: tripNum },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wider font-semibold">{label}</p>
                  <p className={cn("font-bold", highlight ? "text-primary" : "text-foreground")}>{value}</p>
                </div>
              ))}
            </div>
          </section>






          {/* ── Planning / Actual + Photos ── */}
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
                <span className="w-1 h-4 rounded-full bg-primary" />
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Schedule</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Planning
                  </p>
                  <div className="grid grid-cols-4 gap-4 text-[11px]">
                    {[
                      { label: "Departure Date", value: depDate },
                      { label: "Departure Time", value: depTime },
                      { label: "Return Date",    value: retDate },
                      { label: "Return Time",    value: retTime },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                        <p className="font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <p className="text-[10px] font-bold text-[hsl(var(--success))] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" />
                    Actual
                  </p>
                  <div className="grid grid-cols-4 gap-4 text-[11px]">
                    {["Departure Date","Departure Time","Return Date","Return Time"].map((label) => (
                      <div key={label}>
                        <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-muted-foreground/60">—</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Vehicle + Driver photos */}
            <div className="flex gap-3 flex-shrink-0">
<div className="rounded-xl bg-card border border-border shadow-sm p-3 text-center flex flex-col items-center justify-center min-w-[7.5rem]">
  <div className="w-16 h-14 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-1.5 overflow-hidden">
    {hasVehicleImage ? (
      <img
        src={String(vehicleImageUrl)}
        alt="Vehicle"
        className="w-full h-full object-cover"
        onError={() => setVehicleImgError(true)}
      />
    ) : (
      <Truck className="w-8 h-8 text-primary" />
    )}
  </div>
  <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider">Vehicle</p>
  <p className="text-[11px] font-bold text-foreground">{vehicle}</p>
</div>
              <div className="rounded-xl bg-card border border-border shadow-sm p-3 text-center flex flex-col items-center justify-center min-w-[7.5rem]">
                <div className="w-16 h-14 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-1.5">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider">Driver</p>
                <p className="text-[11px] font-bold text-foreground">{driverId}</p>
              </div>
            </div>

          </div>

          {/* ── Transactions card ── */}
          <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2 bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-primary" />
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Transactions</h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{rows.length} record{rows.length === 1 ? "" : "s"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: "11px" }}>
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Seq","Document Number","Delivery Number","Site","Status","Arrival Date/Time","Departure Date/Time","Service Time","Address","Client Code","Client","City","From Previous Distance","From Previous Travel","Waiting Time"].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wider whitespace-nowrap text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any, i: number) => {
                    const seq  = r.sequence ?? r.seq ?? i + 1;
                    const doc  = r.sdhnum ?? r.docnum ?? r.documentnumber ?? "—";
                    const del  = r.deliverynumber ?? r.delnum ?? "—";
                    const site = r.xdocsite ?? r.fcy ?? "—";
                    const arr  = fmtDT(r.arrivedate ?? r.arrivalDate, r.arrivetime ?? r.arrivalTime);
                    const dep  = fmtDT(r.departdate ?? r.departureDate, r.departtime ?? r.departureTime);
                    const svc  = r.servicetime ?? r.serviceTime ?? "—";
                    const addr = r.address ?? r.bpaadd1 ?? "—";
                    const bp   = r.bpcode ?? r.bpnum ?? r.bpcnum ?? "—";
                    const cli  = r.client ?? r.bpcnam ?? r.clientname ?? "—";
                    const city = r.city ?? r.bpacity ?? "—";
                    const fpd  = r.fromprevdist ?? r.fromPrevDistance ?? "—";
                    const fpt  = r.fromprevtra ?? r.fromprevtravel ?? r.fromPrevTravel ?? "—";
                    const wait = r.waittime ?? r.waitingTime ?? "—";
                    return (
                    <tr key={r.id ?? doc ?? i} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-2 py-2 font-mono font-bold text-center text-foreground">{seq}</td>
                      <td className="px-2 py-2 font-mono text-primary font-semibold">{doc}</td>
                      <td className="px-2 py-2 text-muted-foreground">{del}</td>
                      <td className="px-2 py-2 font-mono text-foreground">{site}</td>
                      <td className="px-2 py-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]">Scheduled</span>
                      </td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{arr}</td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{dep}</td>
                      <td className="px-2 py-2 font-mono text-foreground">{svc}</td>
                      <td className="px-2 py-2 text-muted-foreground truncate max-w-[100px]">{addr}</td>
                      <td className="px-2 py-2 font-mono text-foreground">{bp}</td>
                      <td className="px-2 py-2 font-medium text-foreground truncate max-w-[100px]">{cli}</td>
                      <td className="px-2 py-2 text-muted-foreground">{city}</td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{fpd}</td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{fpt}</td>
                      <td className="px-2 py-2 font-mono text-muted-foreground">{wait}</td>
                    </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={15} className="px-3 py-6 text-center text-xs text-muted-foreground">No transactions on this trip</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Totals ── */}
          {/* <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
              Total Drops
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Total Drops</h4>
                </div>
                <div className="p-4 space-y-1.5">
                  {(() => {
                    const dropWeight = stock.reduce((s: number, x: any) => s + (Number(x.xcapacities ?? x.xcapacities ?? 0) || 0), 0);
                    const dropVolume = stock.reduce((s: number, x: any) => s + (Number(x.volume ?? x.vol ?? 0) || 0), 0);
                    const vehMass = Number(pick("vehmass","vehiclemass") ?? 60000) || 60000;
                    const vehVol  = Number(pick("vehvol","vehiclevolume") ?? 50000) || 50000;
                    return (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span className="font-mono font-semibold text-foreground">{dropWeight.toFixed(2)} LB</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Mass</span><span className="font-mono text-foreground">{vehMass.toFixed(2)} LB</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Loading Mass(%)</span><span className="font-mono text-foreground">{dropWeight ? ((dropWeight / vehMass) * 100).toFixed(2) : "0.00"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Drops Volume</span><span className="font-mono text-foreground">{dropVolume.toFixed(2)} GAL</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Volume</span><span className="font-mono text-foreground">{vehVol} GAL</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Loading Vol(%)</span><span className="font-mono text-foreground">{dropVolume ? ((dropVolume / vehVol) * 100).toFixed(2) : "0.00"}</span></div>
                      </>
                    );
                  })()}
                </div>
              </div>
              Total Pickups
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Total Pickups</h4>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pickup Weight</span><span className="font-mono font-semibold text-foreground">0 LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Avail Weight</span><span className="font-mono text-foreground">60000 LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pickup Volume</span><span className="font-mono text-foreground">0.00 GAL</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Avail Volume</span><span className="font-mono text-foreground">50000 GAL</span></div>
                </div>
              </div>
              Summary Totals — themed
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-primary/10">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Summary Totals</h4>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Distance</span><span className="font-mono font-semibold text-foreground">{totalKm ? `${totalKm} Miles` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Travel Time</span><span className="font-mono text-foreground">{totalMin ? `${String(totalH).padStart(2,"0")}:${String(totalM).padStart(2,"0")} HH:MM` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Order Count</span><span className="font-mono text-foreground">{rows.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Time</span><span className="font-mono text-foreground">{totalMin ? `${String(totalH + 1).padStart(2,"0")}:${String((totalM + 15) % 60).padStart(2,"0")} HH:MM` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Travel Time Cost</span><span className="font-mono text-foreground">{travelCost ? `${travelCost} USD` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Distance Cost</span><span className="font-mono text-foreground">{distCost ? `${distCost} USD` : "—"}</span></div>
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1.5"><span className="font-bold text-foreground">Total Cost</span><span className="font-mono font-black text-base text-primary">{totalCost ? `${totalCost} USD` : "—"}</span></div>
                </div>
              </div>
            </div>
          </section> */}

          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
              {/* Total Drops */}
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Total Drops</h4>
                </div>
                <div className="p-4 space-y-1.5">
                  {(() => {
                    const vehMass = Number(trip.vehicle?.capacity) || 60000;
                    const vehVol  = Number(trip.vehicle?.vol) || 50000;
                    return (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span className="font-mono font-semibold text-foreground">{dropWeight.toFixed(2)} LB</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Mass</span><span className="font-mono text-foreground">{vehMass.toFixed(2)} LB</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Loading Mass(%)</span><span className="font-mono text-foreground">{dropWeight ? ((dropWeight / vehMass) * 100).toFixed(2) : "0.00"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Drops Volume</span><span className="font-mono text-foreground">{dropVolume.toFixed(2)} GAL</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Volume</span><span className="font-mono text-foreground">{vehVol} GAL</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Loading Vol(%)</span><span className="font-mono text-foreground">{dropVolume ? ((dropVolume / vehVol) * 100).toFixed(2) : "0.00"}</span></div>
                      </>
                    );
                  })()}
                </div>
              </div>
              {/* Total Pickups */}
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/50">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Total Pickups</h4>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pickup Weight</span><span className="font-mono font-semibold text-foreground">{pickupWeight.toFixed(2)} LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Avail Weight</span><span className="font-mono text-foreground">{(Number(trip.vehicle?.capacity) || 60000).toFixed(2)} LB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pickup Volume</span><span className="font-mono text-foreground">{pickupVolume.toFixed(2)} GAL</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Avail Volume</span><span className="font-mono text-foreground">{Number(trip.vehicle?.vol) || 50000} GAL</span></div>
                </div>
              </div>
              {/* Summary Totals — themed */}
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-primary/10">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider">Summary Totals</h4>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Distance</span><span className="font-mono font-semibold text-foreground">{totalKm ? `${totalKm} Miles` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Travel Time</span><span className="font-mono text-foreground">{travelMin ? `${String(travelH).padStart(2,"0")}:${String(travelM).padStart(2,"0")} HH:MM` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Order Count</span><span className="font-mono text-foreground">{stops.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Time</span><span className="font-mono text-foreground">{totalMin ? `${String(totalH).padStart(2,"0")}:${String(totalM).padStart(2,"0")} HH:MM` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Travel Time Cost</span><span className="font-mono text-foreground">{travelCost ? `${travelCost} USD` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Distance Cost</span><span className="font-mono text-foreground">{distCost ? `${distCost} USD` : "—"}</span></div>
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1.5"><span className="font-bold text-foreground">Total Cost</span><span className="font-mono font-black text-base text-primary">{totalCost ? `${totalCost} USD` : "—"}</span></div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RESIZABLE SPLIT PANEL
// ═══════════════════════════════════════════════════════
