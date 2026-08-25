import React, { useMemo, useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Users, Calendar as CalIcon, Building2, Search,
  MapPin, Route as RouteIcon, ArrowDownToLine, ArrowUpFromLine,
  CheckCheck, X, Play, Map as MapIcon, List, GripVertical,
  Loader2, Trash2, Lock, Unlock, RefreshCw, ChevronDown,
  Package, AlertCircle, Info, Eye, Zap, Filter,
  Wand2, GitMerge, ShieldCheck, ChevronLeft, Warehouse, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fetchTmsSites, loadPlannerData, type RpSite, type RpVehicle, type RpDriver, type RpStop, type RpStopProduct } from "@/lib/routePlannerApi";
import { vehicleDriverAssignmentApi, type VehicleDriverAssignment } from "@/lib/fleetApi";
import { callVroom, secToHHMM, hhmmToSec, type VroomStep } from "@/lib/vroomApi";
import { tripApi, type TripResponseDTO, type OptiStatus } from "@/lib/tripApi";
import { transportApi } from "@/lib/transportApi";
import {
  type Vehicle, type Driver, type Stop, type TripStatus, type Trip,
  mapVehicle, mapDriver, mapStop, statusColor, tripFromApi,
} from "./planner/types";
import {
  ToolbarBtn, SiteSelect, KpiCard, StopRow, RouteMapView,
  TripStopListView, ActiveTourPanel, RouteManagementDetail, ResizableSplit,
  ProductDetailsDialog,
} from "./planner/components";

// ── Capacity checks applied when manually adding stops to the active
// trip (drag or "Add to Trip") ──────────────────────────────────────
// Add, remove, or comment out entries here to change which dimensions
// get validated. Each check independently compares (existing draft
// total + incoming) against the vehicle's capacity for that dimension.
// Any that are exceeded get combined into a single confirmation prompt
// — no extra wiring needed when you add a new one.
type CapacityCheck = {
  key: string;
  label: string;                              // used in the confirmation message, e.g. "weight"
  unit: string;
  getVehicleCapacity: (v: Vehicle) => number;
  getStopAmount: (s: Stop) => number;
};

const CAPACITY_CHECKS: CapacityCheck[] = [
  {
    key: "weight",
    label: "weight",
    unit: "kg",
    getVehicleCapacity: (v) => Number(v.capacityWeight) || 0,
    getStopAmount: (s) => s.netWeight || 0,
  },
  // {
  //   key: "volume",
  //   label: "volume",
  //   unit: "m³",
  //   getVehicleCapacity: (v) => Number(v.capacityVolume) || 0,
  //   getStopAmount: (s) => s.volume || 0,
  // },
];

export default function Planner() {
  // ── Sites from API ────────────────────────────────────
  const [sites, setSites]           = useState<RpSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);

  // ── Toolbar state ─────────────────────────────────────
  const [site, setSite]         = useState("");
  const [date, setDate]         = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading]   = useState(false);
  // Shown as a blocking overlay while a Lock action is in flight — Lock
  // can now take up to 20s (waiting on the X3 push, see setTripStatus),
  // and without a clear "this is working" indicator users were clicking
  // elsewhere assuming the app had frozen.
  const [lockingInfo, setLockingInfo] = useState<{ tripCode: string } | null>(null);
  const [loaded, setLoaded]     = useState(false);
  const [loadStats, setLoadStats] = useState<{vehicles:number;drivers:number;drops:number;pickups:number}|null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [routeCode, setRouteCode]   = useState("");

  // ── API data ──────────────────────────────────────────
  const [apiVehicles, setApiVehicles] = useState<Vehicle[]>([]);
  const [apiDrivers,  setApiDrivers]  = useState<Driver[]>([]);
  const [allStops,    setAllStops]    = useState<Stop[]>([]);
  // Vehicle-Driver Assignment records (Fleet > Vehicle-Driver) — used to
  // show/auto-apply which driver is assigned to a vehicle for the
  // currently selected date.
  const [vehicleAssignments, setVehicleAssignments] = useState<VehicleDriverAssignment[]>([]);

  // ── Search strings ────────────────────────────────────
  const [vehSearch, setVehSearch]   = useState("");
  const [drvSearch, setDrvSearch]   = useState("");
  const [dropSearch, setDropSearch] = useState("");
  const [pickSearch, setPickSearch] = useState("");
  const [tripSearch, setTripSearch] = useState("");

  // ── Active draft ──────────────────────────────────────
  const [draftVehicle, setDraftVehicle] = useState<Vehicle | null>(null);
  const [draftDriver,  setDraftDriver]  = useState<Driver  | null>(null);
  const [draftStopIds, setDraftStopIds] = useState<string[]>([]);

  // ── Drag state ────────────────────────────────────────
  const [dragStopIds, setDragStopIds] = useState<string[]>([]);  // stops being dragged
  const [dropZoneActive, setDropZoneActive] = useState(false);

  // ── Confirmed trips ───────────────────────────────────
  const [trips, setTrips]                   = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set());
  const [groupBusy, setGroupBusy] = useState<null | { kind: "optimise" | "lock" | "unlock" | "validate" | "delete"; done: number; total: number }>(null);
  // 'planner' = main view | 'detail' = trip detail full screen
  const [view, setView]               = useState<"planner" | "detail">("planner");
  const [detailTripId, setDetailTripId] = useState<string | null>(null);
  const [vrHeader,    setVrHeader]    = useState<any | null>(null);
  const [vrDetails,   setVrDetails]   = useState<any[]>([]);
  const [vrLoadStock, setVrLoadStock] = useState<any[]>([]);
  const [vrLoading,   setVrLoading]   = useState(false);

  // Optimisation slide panel

  const [tripView, setTripView]             = useState<"map" | "list">("map");

  // Confirmation dialog (vehicle/driver reassign etc.)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    confirmLabel?: string; onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Track the loaded trip baseline so stop add/remove on a selected persisted trip
  // can be auto-synced to the backend.
  const loadedTripRef = useRef<{ tripId: number; stopIds: string[] } | null>(null);
  const stopSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Filters ───────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stopTypeTab, setStopTypeTab]   = useState<"drops" | "pickups">("drops");
  const [fleetTab, setFleetTab]         = useState<"vehicles" | "drivers">("vehicles");
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(new Set()); // multi-select in tables
  const [toPlanOnly, setToPlanOnly] = useState<boolean>(false);

  // ── Auto Trip Generation modal ────────────────────────
  const [showAutoGen, setShowAutoGen]   = useState(false);
  // Which stop's product-details popup is open (Document panel / List View
  // — clicking the underlined document/drop/pickup number).
  const [productDetailsStop, setProductDetailsStop] = useState<Stop | null>(null);
  const [agTab, setAgTab]               = useState<"vehicles" | "drivers">("vehicles");
  const [agDocTab, setAgDocTab]         = useState<"deliveries" | "pickups">("deliveries");
  const [agVehSel, setAgVehSel]         = useState<Set<string>>(new Set());
  const [agDrvSel, setAgDrvSel]         = useState<Set<string>>(new Set());
  const [agDropSel, setAgDropSel]       = useState<Set<string>>(new Set());
  const [agPickSel, setAgPickSel]       = useState<Set<string>>(new Set());
  const [agVehClass, setAgVehClass]     = useState<string>("");
  const [agRouteCode, setAgRouteCode]   = useState<string>("");
  const [agStartDate, setAgStartDate]   = useState<string>(date);
  const [agEndDate, setAgEndDate]       = useState<string>(date);
  const [agVehSearch, setAgVehSearch]   = useState("");
  const [agExcludeScheduled, setAgExcludeScheduled] = useState(false);
  const [agDocSearch, setAgDocSearch]   = useState("");
  const [agSubmitting, setAgSubmitting] = useState(false);
  const [vroomError, setVroomError] = useState<{ title: string; detail: string } | null>(null);

  const openAutoGen = useCallback(() => {
    setAgVehSel(new Set()); setAgDrvSel(new Set());
    setAgDropSel(new Set()); setAgPickSel(new Set());
    setAgVehClass(""); setAgRouteCode("");
    setAgStartDate(date); setAgEndDate(date);
    setAgVehSearch(""); setAgDocSearch("");
    setAgTab("vehicles"); setAgDocTab("deliveries");
    setAgExcludeScheduled(false);
    setShowAutoGen(true);
  }, [date]);

  const agVehicleClasses = useMemo(
    () => Array.from(new Set(apiVehicles.map(v => v.category).filter(Boolean))).sort(),
    [apiVehicles]
  );
  const agPlannedVehicleCodes = useMemo(
    () => new Set(trips.map(t => t.vehicle?.code).filter(Boolean) as string[]),
    [trips]
  );
  const agFilteredVehicles = useMemo(() =>
    apiVehicles.filter(v =>
      (!agVehClass || v.category === agVehClass) &&
      (!agExcludeScheduled || !agPlannedVehicleCodes.has(v.code)) &&
      (!agVehSearch || `${v.code} ${v.vehicleNo} ${v.category} ${v.driverName}`.toLowerCase().includes(agVehSearch.toLowerCase()))
    ), [apiVehicles, agVehClass, agVehSearch, agExcludeScheduled, agPlannedVehicleCodes]);
  const agFilteredDrivers = useMemo(() =>
    apiDrivers.filter(d =>
      !agVehSearch || `${d.id} ${d.name} ${d.license}`.toLowerCase().includes(agVehSearch.toLowerCase())
    ), [apiDrivers, agVehSearch]);
  const agUsedStopIds = useMemo(() => new Set(trips.flatMap((t) => t.stops.map((s) => s.id))), [trips]);
  const agFilteredDocs = useMemo(() => {
    const type = agDocTab === "deliveries" ? "DROP" : "PICKUP";
    return allStops.filter(s =>
      s.type === type &&
      // Only show documents NOT already assigned to a trip (To Plan only)
      (s.routeStatus === "To Plan" || !s.routeStatus || s.routeStatus.trim() === "") &&
      // Exclude stops already in a confirmed trip (usedStopIds)
      !agUsedStopIds.has(s.id) &&
      // Exclude stops already in the current draft
      !draftStopIds.includes(s.id) &&
      (!agRouteCode || s.routeCode === agRouteCode) &&
      (!agDocSearch || `${s.txn} ${s.client} ${s.bpcode} ${s.routeCode}`.toLowerCase().includes(agDocSearch.toLowerCase()))
    );
  }, [allStops, agDocTab, agRouteCode, agDocSearch, agUsedStopIds, draftStopIds]);

  const agDateInvalid = !!(agStartDate && agEndDate && agStartDate > agEndDate);

    // Vehicle -> driver assigned to it (Fleet > Vehicle-Driver) for the
  // currently selected planner date, if any. Only considers active
  // assignments whose [startDate, endDate] window includes `date`.
  const assignedDriverByVehicle = useMemo(() => {
    const map = new Map<string, VehicleDriverAssignment>();
    if (!date) return map;
    for (const a of vehicleAssignments) {
      if (!a.active) continue;
      if (a.startDate && a.startDate > date) continue;
      if (a.endDate && a.endDate < date) continue;
      map.set(a.vehicleCode, a);
    }
    return map;
  }, [vehicleAssignments, date]);

    const agVehiclesNeedingDriver = useMemo(
  () => Array.from(agVehSel).filter(code => !assignedDriverByVehicle.has(code)),
  [agVehSel, assignedDriverByVehicle]
);

const agCanSubmit =
  agVehSel.size >= 1 &&
  (agDropSel.size + agPickSel.size) >= 1 &&
  !agDateInvalid &&
  agVehiclesNeedingDriver.length <= agDrvSel.size;


  function agToggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  }
  function agToggleAll(ids: string[], set: Set<string>, setter: (s: Set<string>) => void) {
    const allOn = ids.length > 0 && ids.every(id => set.has(id));
    const next = new Set(set);
    ids.forEach(id => allOn ? next.delete(id) : next.add(id));
    setter(next);
  }
  function agClear() {
    setAgVehSel(new Set()); setAgDrvSel(new Set());
    setAgDropSel(new Set()); setAgPickSel(new Set());
  }
  async function agSubmit() {
    if (!agCanSubmit) return;
    const depLat = currentSiteObj?.latitude  ? Number(currentSiteObj.latitude)  : 0;
    const depLng = currentSiteObj?.longitude ? Number(currentSiteObj.longitude) : 0;
    if (!depLat || !depLng) {
      setVroomError({ title: "Missing Site Coordinates", detail: "This site has no latitude/longitude.\nGo to Configuration → Customers → select the site address and set lat/lng." });
      return;
    }

    setAgSubmitting(true);
    try {
      // ── Build selected vehicles ──────────────────────────────
      const selVehicles = apiVehicles.filter(v => agVehSel.has(v.code));
      const vroomVehicles = selVehicles.map((v, i) => {
        const startSec = hhmmToSec((v as any).earliestStartTime ?? "07:00");
        return {
          id: i + 1,
          description: v.code,
          start: [depLng, depLat] as [number,number],
          end:   [depLng, depLat] as [number,number],
          capacity: [Math.round(Number(v.capacityWeight ?? 60000) * 1000)] as [number],
          time_window: [startSec, hhmmToSec("23:59")] as [number,number],
          max_tasks: 999,
        };
      });

      // ── Build selected jobs ──────────────────────────────────
      const selDocs = allStops.filter(s =>
        (s.type === "DROP"   && agDropSel.has(s.id)) ||
        (s.type === "PICKUP" && agPickSel.has(s.id))
      );

      const missingCoords = selDocs.filter(s => !s.lat || !s.lng);
      if (missingCoords.length) {
        setVroomError({ title: "Missing Stop Coordinates", detail: `${missingCoords.length} stop(s) missing lat/lng:\n${missingCoords.map(s => `• ${s.txn} — ${s.client}`).join("\n")}` });
        setAgSubmitting(false); return;
      }

      const vroomJobs = selDocs.map((s, i) => ({
        id: i + 1,
        description: s.txn,
        location: [s.lng, s.lat] as [number,number],
        // service: Number(s.serviceTime ?? 0),
        service: s.serviceTime ? hhmmToSec(s.serviceTime) : 0,
        ...(s.type === "DROP"
          ? { delivery: [Math.round((s.netWeight || 1) * 1000)] as [number] }
          : { pickup:   [Math.round((s.netWeight || 1) * 1000)] as [number] }),
        priority: s.priority === "URGENT" ? 10 : s.priority === "LOW" ? 1 : 5,
      }));

      // ── Call VROOM ────────────────────────────────────────────
      const result = await callVroom(vroomVehicles, vroomJobs);

      if (!result.routes?.length) {
        setVroomError({ title: "No Routes Generated", detail: "VROOM could not assign any stops to vehicles.\n\nPossible reasons:\n• Vehicle capacity too small for the selected stops\n• Stops too far from site location\n• Invalid coordinates" });
        return;
      }

      // ── Build trips from VROOM routes ─────────────────────────
      const { createTrip } = await import("@/lib/tripApi");
      let createdCount = 0;

      const manualDriverQueue = Array.from(agDrvSel);
let manualIdx = 0;

      for (const route of result.routes) {
        const vehCode  = route.description;
        const vehObj   = selVehicles.find(v => v.code === vehCode);
  const assignment = assignedDriverByVehicle.get(vehCode);
  let driverId: string;
  let driverObj: Driver | undefined;

  if (assignment) {
    driverObj = apiDrivers.find(d => d.id === assignment.driverId);
    driverId  = driverObj?.id ?? assignment.driverId;
  } else {
    driverId  = manualDriverQueue[manualIdx] ?? "";
    driverObj = apiDrivers.find(d => d.id === driverId);
    manualIdx++;
  }

        const jobSteps = route.steps.filter((st: VroomStep) => st.type === "job");
        if (!jobSteps.length) continue;

        const endStep  = route.steps.find((st: VroomStep) => st.type === "end");
        const endTime  = secToHHMM(endStep ? endStep.arrival : 0);
        const startTime = secToHHMM(route.steps[0]?.arrival ?? hhmmToSec("07:00"));
        const totalDistKm = (route.distance / 1000).toFixed(1);
        const travelHHMM  = secToHHMM(route.duration);

        const routeStops = jobSteps.map((st: VroomStep) =>
          selDocs.find(s => s.txn === st.description)
        ).filter(Boolean) as typeof selDocs;

        const drops   = routeStops.filter(s => s.type === "DROP").length;
        const pickups = routeStops.filter(s => s.type === "PICKUP").length;
        const totalWt = routeStops.reduce((n, s) => n + (s.netWeight || 0), 0);
        const totalVl = routeStops.reduce((n, s) => n + (s.volume || 0), 0);

        const stopResults = jobSteps.map((st: VroomStep, i: number) => ({
          seq: i + 1,
          docNum: st.description ?? "",
          arrivalDate: date, arrivalTime: secToHHMM(st.arrival),
          departureDate: date, departureTime: secToHHMM(st.arrival + st.service),
          fromPrevDistance: ((st.distance ?? 0) / 1000).toFixed(1),
          fromPrevTravelTime: secToHHMM(st.duration),
          serviceTime: secToHHMM(st.service),
          waitingTime: secToHHMM(st.waiting_time ?? 0),
        }));

        try {
          const tripResp = await createTrip({
            // Using || rather than ?? here deliberately: an empty
            // string from vehObj.site/departureSite/arrivalSite should
            // ALSO fall back to the planner's selected site, not just
            // null/undefined — see the mapVehicle() fix in types.ts for
            // the bug this guards against.
            site: vehObj?.site || site, docDate: date,
            driverId, driverName: driverObj?.name ?? driverId,
            vehicleCode: vehCode,
            depSite: vehObj?.departureSite || vehObj?.site || site,
            arrSite: vehObj?.arrivalSite    || vehObj?.site || site,
            drops, pickups,
            noOfPackages: routeStops.reduce((n, s) => n + (s.qty || 0), 0),
            startTime, endTime,
            travelTime: travelHHMM, totalTime: travelHHMM,
            totalWeight: String(totalWt.toFixed(2)),
            totalVolume: String(totalVl.toFixed(2)),
            capacity:    String(vehObj?.capacityWeight ?? 60000),
            uomCapacity: "KG", uomVolume: "M3", uomDistance: "km",
            weightPct: vehObj?.capacityWeight ? totalWt / Number(vehObj.capacityWeight) * 100 : 0,
            volumePct: 0,
            totalDistance: totalDistKm,
            totalCost: "", distanceCost: "", fixedCost: "", serviceCost: "",
            notes: "Auto generated by VROOM",
            generatedBy: "AUTO",
            userCode: "SYSTEM",
            stopObjects: routeStops as any,
            vehicleObject: (vehObj ?? null) as any,
            totalObject: { stopResults },
          });

          // Persist optimisation results — response includes Optimised status,
          // per-stop arrivalTime/departureTime/serviceTime/waitingTime, totals.
          const { optimiseTrip } = await import("@/lib/tripApi");
          const optResp = await optimiseTrip(tripResp.tripCode, {
            orderMode: "auto", startTime, endTime,
            travelTime: travelHHMM, totalTime: travelHHMM,
            totalDistance: totalDistKm, uomDistance: "km",
            totalCost: "", distanceCost: "", fixedCost: "", serviceCost: "",
            stopResults,
          });

          // Merge stopResults into the persisted stops so the local trip carries
          // arrivalTime, departureTime, seq etc. even if the API response omits them.
          const byDoc = new Map(stopResults.map((r) => [r.docNum, r]));
          const created = tripFromApi(optResp);
          created.stops = created.stops.map((s) => {
            const r = byDoc.get((s as any).docNum ?? s.txn);
            return r ? {
              ...s,
              seq: r.seq,
              arrivalDate: r.arrivalDate, arrivalTime: r.arrivalTime,
              departureDate: r.departureDate, departureTime: r.departureTime,
              fromPrevDistance: r.fromPrevDistance,
              fromPrevTravelTime: r.fromPrevTravelTime,
              serviceTime: r.serviceTime, waitingTime: r.waitingTime,
            } : s;
          }).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
          created.status = "Optimised";
          created.optiStatus = "Optimised";
          created.distanceKm = Number(totalDistKm) || created.distanceKm;
          created.startTime = startTime;
          created.endTime = endTime;

          setTrips(prev => [...prev, created]);
          createdCount++;
        } catch(e) {
          console.error("Failed to create trip for vehicle", vehCode, e);
        }
      }

      toast({
        title: `${createdCount} trip(s) generated ✓`,
        description: `${result.unassigned?.length ?? 0} unassigned stops`,
      });
    } catch(err) {
      const msg = err instanceof Error ? err.message : "VROOM error. Check that all stops and site have valid coordinates.";
      setVroomError({ title: "Auto Generation Failed", detail: msg });
    } finally {
      setShowAutoGen(false);
      setAgSubmitting(false);
    }
  }

  // ── Load sites on mount ──────────────────────────────
  useEffect(() => {
    setSitesLoading(true);
    fetchTmsSites()
      .then((data) => {
        setSites(data);
        if (data.length > 0) setSite(data[0].siteCode);
      })
      .catch(() => {})
      .finally(() => setSitesLoading(false));
  }, []);

  // ── Auto-load planner data on site / date / refresh change
  useEffect(() => {
    if (!site || !date) return;
    setLoading(true);
    setLoaded(false);
    setLoadStats(null);
    setApiVehicles([]); setApiDrivers([]); setAllStops([]);
    setDraftVehicle(null); setDraftDriver(null); setDraftStopIds([]);
    setSelectedStopIds(new Set());
    setSelectedTripId(null);

    loadPlannerData(site, date)
      .then((data) => {
        setApiVehicles((data.vehicles ?? []).map(mapVehicle));
        setApiDrivers((data.drivers  ?? []).map(mapDriver));
        setAllStops([
          ...(data.drops   ?? []).map(mapStop),
          ...(data.pickups ?? []).map(mapStop),
        ]);
        setLoaded(true);
        setLoadStats({
          vehicles: data.vehicleCount ?? 0,
          drivers:  data.driverCount ?? 0,
          drops:    data.dropCount ?? 0,
          pickups:  data.pickupCount ?? 0,
        });
      })
      .catch((e: any) => {
        toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));

    // Vehicle-Driver Assignment records — best-effort, independent of the
    // main planner load above. Used to show/auto-apply the assigned
    // driver for each vehicle on the selected date; if this fails, the
    // planner still works exactly as before, just without that feature.
    vehicleDriverAssignmentApi.list()
      .then((data) => setVehicleAssignments(data ?? []))
      .catch(() => setVehicleAssignments([]));

    // Load existing trips for the selected site + date from backend.
    // Replace persisted trips with API response; preserve any local-only (unsaved) trips.
    tripApi.loadTrips(site, date)
      .then((apiTrips) => {
        const mapped = (apiTrips ?? []).map((r) => tripFromApi(r));
        setTrips((prev) => {
          const apiCodes = new Set(mapped.map((t) => t.tripCode).filter(Boolean));
          // Keep local-only (no tripId) trips, and drop any prev persisted trips
          // that are also in the API response to avoid duplicates.
          const localOnly = prev.filter((t) => t.tripId == null && !(t.tripCode && apiCodes.has(t.tripCode)));
          const merged = [...mapped, ...localOnly];
          // Final dedupe by tripCode as a safety net.
          const seen = new Set<string>();
          const deduped = merged.filter((t) => {
            const key = t.tripCode ?? t.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return deduped.map((t, i) => ({ ...t, seq: i + 1 }));
        });
      })
      .catch(() => {
        // Endpoint may be empty / offline — drop persisted trips from previous site/date.
        setTrips((prev) => prev.filter((t) => t.tripId == null).map((t, i) => ({ ...t, seq: i + 1 })));
      });
  }, [site, date, refreshKey]);

  // ── Derived datasets ───────────────────────────────────
  const usedStopIds = useMemo(() => new Set(trips.flatMap((t) => t.stops.map((s) => s.id))), [trips]);

  const vehicles = useMemo(() =>
    apiVehicles.filter((v) =>
      (!vehSearch || `${v.code} ${v.vehicleNo} ${v.category} ${v.departureSite} ${v.arrivalSite} ${v.driverName} ${v.capacityWeight} ${v.capacityVolume} ${v.startTime}`.toLowerCase().includes(vehSearch.toLowerCase()))
    ), [apiVehicles, vehSearch]);

  const drivers = useMemo(() =>
    apiDrivers.filter((d) =>
      !drvSearch || `${d.id} ${d.name} ${d.license} ${d.status} ${d.hoursToday}`.toLowerCase().includes(drvSearch.toLowerCase())
    ), [apiDrivers, drvSearch]);

  const availableStops = useMemo(() =>
    allStops.filter((s) => !usedStopIds.has(s.id)),
    [allStops, usedStopIds]);

  const drops = useMemo(() =>
    allStops.filter((s) =>
      s.type === "DROP" &&
      (!toPlanOnly || (!usedStopIds.has(s.id) && !draftStopIds.includes(s.id) && (s.routeStatus === "To Plan" || !s.routeStatus))) &&
      (!dropSearch || `${s.txn} ${s.prepList} ${s.pairedDoc} ${s.doctype} ${s.client} ${s.bpcode} ${s.address} ${s.city} ${s.postalCity} ${s.routeCode} ${s.priority} ${s.qty} ${s.netWeight} ${s.volume} ${s.dlvyStatus}`.toLowerCase().includes(dropSearch.toLowerCase()))
    ), [allStops, dropSearch, toPlanOnly, usedStopIds, draftStopIds]);

  const pickups = useMemo(() =>
    allStops.filter((s) =>
      s.type === "PICKUP" &&
      (!toPlanOnly || (!usedStopIds.has(s.id) && !draftStopIds.includes(s.id) && (s.routeStatus === "To Plan" || !s.routeStatus))) &&
      (!pickSearch || `${s.txn} ${s.prepList} ${s.pairedDoc} ${s.doctype} ${s.client} ${s.bpcode} ${s.address} ${s.city} ${s.postalCity} ${s.routeCode} ${s.priority} ${s.qty} ${s.netWeight} ${s.volume} ${s.dlvyStatus}`.toLowerCase().includes(pickSearch.toLowerCase()))
    ), [allStops, pickSearch, toPlanOnly, usedStopIds, draftStopIds]);

  const draftStops = useMemo(() => {
    const selTrip = trips.find((t) => t.id === selectedTripId);
    const tripStopMap = new Map(selTrip?.stops.map((s) => [s.id, s]) ?? []);
    const base = allStops.filter((s) => draftStopIds.includes(s.id));
    // Overlay optimisation output (arrivalTime, departureTime, seq, …) from the selected trip.
    const merged = base.map((s) => {
      const t = tripStopMap.get(s.id);
      return t ? { ...s, ...t } : s;
    });
    // If the selected trip is optimised, honour its seq ordering.
    if (selTrip && merged.some((s) => s.seq != null)) {
      merged.sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999));
    }
    return merged;
  }, [allStops, draftStopIds, trips, selectedTripId]);

  const routeCodes = useMemo(() => {
    const codes = allStops.map(s => s.routeCode).filter(Boolean);
    return Array.from(new Set(codes)).sort();
  }, [allStops]);

  const filteredTrips = useMemo(() => {
    const norm = (s: any) => (s === "Optimized" ? "Optimised" : s);
    const q = tripSearch.toLowerCase();
    return trips.filter((t) =>
      (statusFilter === "all" || norm(t.status) === norm(statusFilter) || norm((t as any).optiStatus) === norm(statusFilter)) &&
      (!q || `${t.id} ${t.routeCode ?? ""} ${t.vehicle?.code ?? ""} ${t.driver?.name ?? ""} ${(t as any).tripCode ?? ""}`.toLowerCase().includes(q))
    );
  }, [trips, statusFilter, tripSearch]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;
  const detailTrip   = trips.find((t) => t.id === detailTripId)   ?? null;

  // site object for depot lat/lng
  const currentSiteObj = sites.find(s => s.siteCode === site) ?? null;

  // Sum a stop's product-line qtyOrdered values (a stop can have several
  // product lines on the same document).
  function sumQtyOrdered(s: Stop): number {
    return (s.products ?? []).reduce((pn, p) => pn + (Number(p.qtyOrdered) || 0), 0);
  }

  // KPIs
  const kpis = useMemo(() => ({
    vehicles: vehicles.length,
    trips: trips.length,
    assignedDocs: trips.reduce((n, t) => n + t.stops.length, 0),
    unassignedDocs: availableStops.length,
    // These sum each stop's product-line qtyOrdered. Bucketed by s.type
    // ("DROP"/"PICKUP" — the same business-bucket field the Deliveries/
    // Pickups panel counts use), NOT doctype ("DLV"/"PICK") — a previous
    // attempt bucketed by doctype, which showed a nonzero Pickup Qty even
    // when the Pickups panel itself showed 0 items (pick tickets are a
    // business-bucket "Drop", so they were being counted as pickups here
    // while sitting in the Deliveries panel — inconsistent with what's
    // on screen). Now both numbers match their respective panel exactly.
    totalDeliveryQty: allStops.reduce((n, s) => s.type === "DROP"   ? n + sumQtyOrdered(s) : n, 0),
    totalPickupQty:   allStops.reduce((n, s) => s.type === "PICKUP" ? n + sumQtyOrdered(s) : n, 0),
  }), [vehicles, trips, availableStops, allStops]);

  // ── Draft actions ──────────────────────────────────────

  // Does the actual mutation — locked/validated guard only. Capacity
  // checking lives in addStopsToDraft below, so both the direct
  // (under-capacity) path and the "confirmed anyway" path from the
  // capacity dialog funnel through this same place.
  const doAddStopsToDraft = useCallback((ids: string[]): boolean => {
    const loaded = loadedTripRef.current;
    if (loaded) {
      const t = trips.find((x) => x.tripId === loaded.tripId);
      if (t && (t.locked || t.status === "Validated")) {
        setVroomError({
          title: "Cannot Add Documents",
          detail: `Trip ${t.tripCode ?? t.id} is ${t.status}. Unlock it first to add more stops.`,
        });
        return false;
      }
    }
    setDraftStopIds((prev) => {
      const next = [...prev];
      ids.forEach((id) => { if (!next.includes(id)) next.push(id); });
      return next;
    });
    setAllStops((prev) => prev.map((s) => ids.includes(s.id) ? { ...s, routeStatus: "Planned" } : s));
    return true;
  }, [trips]);

  // Public entry point used by both drag-drop (onActivePanelDrop) and the
  // "Add N to Trip" button (addSelectedStopsToDraft). Runs every entry in
  // CAPACITY_CHECKS against (existing draft total + incoming) vs the
  // assigned vehicle's capacity for that dimension; if any are exceeded,
  // combines them into one confirmation prompt instead of adding silently.
  //
  // onAdded fires only once the stops are actually in the draft — either
  // immediately (all checks pass / no vehicle yet) or after the user
  // confirms the over-capacity dialog — so callers can safely defer their
  // success toast / selection-clearing to it instead of assuming a
  // synchronous add.
  const addStopsToDraft = useCallback((ids: string[], onAdded?: () => void): boolean => {
    if (draftVehicle) {
      const incoming = ids
        .map((id) => allStops.find((x) => x.id === id))
        .filter(Boolean) as Stop[];

      const violations = CAPACITY_CHECKS
        .map((check) => {
          const capacity = check.getVehicleCapacity(draftVehicle);
          if (capacity <= 0) return null; // no capacity configured for this dimension — skip

          const existing = draftStopIds.reduce((n, id) => {
            const s = allStops.find((x) => x.id === id);
            return n + (s ? check.getStopAmount(s) : 0);
          }, 0);
          const adding = incoming.reduce((n, s) => n + check.getStopAmount(s), 0);
          const total = existing + adding;

          if (total <= capacity) return null;
          return `${check.label} would reach ${total.toFixed(2)} ${check.unit} (capacity ${capacity.toFixed(2)} ${check.unit})`;
        })
        .filter(Boolean) as string[];

      if (violations.length) {
        setConfirmDialog({
          open: true,
          title: "Vehicle Capacity Exceeded",
          description: `Adding ${ids.length === 1 ? "this document" : `these ${ids.length} documents`} to vehicle ${draftVehicle.code} exceeds its capacity — ${violations.join("; ")}. Do you still want to add it to the trip?`,
          confirmLabel: "Yes, add anyway",
          onConfirm: () => {
            if (doAddStopsToDraft(ids)) onAdded?.();
          },
        });
        return false;
      }
    }

    const ok = doAddStopsToDraft(ids);
    if (ok) onAdded?.();
    return ok;
  }, [draftVehicle, draftStopIds, allStops, doAddStopsToDraft]);

  const toggleSelectedStop = useCallback((id: string) => {
    setSelectedStopIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAllStops = useCallback((stops: Stop[]) => {
    setSelectedStopIds((prev) => {
      const allIds = stops.map((s) => s.id);
      const allSelected = allIds.every((id) => prev.has(id));
      const next = new Set(prev);
      allIds.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }, []);

  // Drag from table
  function onStopsDragStart(e: DragEvent, stopIds: string[]) {
    setDragStopIds(stopIds);
    e.dataTransfer.setData("text/stop-ids", JSON.stringify(stopIds));
    e.dataTransfer.effectAllowed = "copy";
  }

  // Drag vehicle row
  function onVehicleDragStart(e: DragEvent, v: Vehicle) {
    e.dataTransfer.setData("text/vehicle-code", v.code);
    e.dataTransfer.effectAllowed = "move";
  }

  // Drag driver row
  function onDriverDragStart(e: DragEvent, d: Driver) {
    e.dataTransfer.setData("text/driver-id", d.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onActivePanelDrop(e: DragEvent) {
    e.preventDefault();
    setDropZoneActive(false);

    const vehicleCode = e.dataTransfer.getData("text/vehicle-code");
    const driverId    = e.dataTransfer.getData("text/driver-id");
    const stopIdsRaw  = e.dataTransfer.getData("text/stop-ids");

    if (vehicleCode) {
      const v = apiVehicles.find((x) => x.code === vehicleCode);
      if (v) {
        setDraftVehicle(v);
        // Vehicle-Driver Assignment: if this vehicle has an assigned
        // driver for the current date and no driver has been manually
        // dropped in this same action, auto-apply that driver too —
        // matching the assignment shown in the vehicle list's Assigned
        // Driver column.
        if (!driverId) {
          const assignment = assignedDriverByVehicle.get(vehicleCode);
          if (assignment) {
            const assignedDriver = apiDrivers.find((x) => x.id === assignment.driverId);
            if (assignedDriver && assignedDriver.status === "Available") setDraftDriver(assignedDriver);
          }
        }
      }
    }
    if (driverId) {
      const d = apiDrivers.find((x) => x.id === driverId);
      if (d) {
        if (d.status !== "Available") { toast({ title: "Driver unavailable", description: `${d.name} is on a trip.` }); return; }

        // If the vehicle in play (just dropped, or already on the draft)
        // has a DIFFERENT driver assigned to it via Vehicle-Driver
        // Assignment, confirm before overriding that assignment with
        // this manual pick.
        const activeVehicleCode = vehicleCode || draftVehicle?.code;
        const assignment = activeVehicleCode ? assignedDriverByVehicle.get(activeVehicleCode) : undefined;
        if (assignment && assignment.driverId !== d.id) {
          setConfirmDialog({
            open: true,
            title: "Replace assigned driver?",
            description: `${assignment.driverName} is already assigned to this vehicle for this period. Replace with ${d.name}?`,
            confirmLabel: "Yes, replace",
            onConfirm: () => setDraftDriver(d),
          });
        } else {
          setDraftDriver(d);
        }
      }
    }
    if (stopIdsRaw) {
      try { addStopsToDraft(JSON.parse(stopIdsRaw)); } catch {}
    }
    setDragStopIds([]);
  }

  function clearDraft() {
    setDraftVehicle(null); setDraftDriver(null); setDraftStopIds([]);
    loadedTripRef.current = null;
  }

  // Mirrors addStopsToDraft's guard — a document can't be removed from a
  // trip that's already locked or validated either, same as it can't be
  // added to one. This was previously wired straight to setDraftStopIds
  // with no guard at all.
  const removeStopFromDraft = useCallback((id: string) => {
    const loaded = loadedTripRef.current;
    if (loaded) {
      const t = trips.find((x) => x.tripId === loaded.tripId);
      if (t && (t.locked || t.status === "Validated" || t.tmsValidated)) {
        setVroomError({
          title: "Cannot Remove Document",
          detail: `Trip ${t.tripCode ?? t.id} is ${t.status}. Unlock it first to remove stops.`,
        });
        return;
      }
    }
    setDraftStopIds((prev) => prev.filter((x) => x !== id));
  }, [trips]);

  function addSelectedStopsToDraft() {
    const count = selectedStopIds.size;
    const ids = Array.from(selectedStopIds);
    addStopsToDraft(ids, () => {
      setSelectedStopIds(new Set());
      toast({ title: `${count} stop(s) added to active trip` });
    });
  }

  // Build the FULL trip payload — used for both create and update.
  // For updates, pass `tripCode` so the backend distinguishes the update path.
  function buildTripPayload(
    vehicle: Vehicle,
    driver: Driver,
    stops: Stop[],
    extra?: { tripCode?: string }
  ) {
    const totalWeight = stops.reduce((n, s) => n + s.netWeight, 0);
    const totalVol    = stops.reduce((n, s) => n + s.volume, 0);
    const totalQty    = stops.reduce((n, s) => n + s.qty, 0);
    const deliveries  = stops.filter((s) => s.type === "DROP").length;
    const pickupCount = stops.filter((s) => s.type === "PICKUP").length;
    const capacity    = Number(vehicle.capacityWeight) || 0;
    const capVol      = Number(vehicle.capacityVolume) || 0;

    return {
      ...(extra?.tripCode ? { tripCode: extra.tripCode } : {}),
      site,
      docDate: date,
      driverId: driver.id,
      driverName: driver.name,
      vehicleCode: vehicle.code,
      depSite: (vehicle as any).departureSite || site,
      arrSite: (vehicle as any).arrivalSite || site,
      drops: deliveries,
      pickups: pickupCount,
      noOfPackages: totalQty,
      startTime: vehicle.startTime || "07:30",
      endTime: "",
      totalWeight: String(totalWeight),
      totalVolume: String(totalVol),
      capacity: String(capacity),
      uomCapacity: (vehicle as any).weightUnit || "KG",
      uomVolume: (vehicle as any).volumeUnit || "M3",
      uomDistance: "mi",
      weightPct: capacity > 0 ? Number(((totalWeight / capacity) * 100).toFixed(4)) : 0,
      volumePct: capVol > 0 ? Number(((totalVol / capVol) * 100).toFixed(4)) : 0,
      travelTime: "",
      totalTime: "",
      totalDistance: "",
      totalCost: "",
      distanceCost: "",
      fixedCost: "",
      serviceCost: "",
      notes: "",
      generatedBy: "PLANNER",
      userCode: "SYSTEM",
      stopObjects: stops as any,
      vehicleObject: vehicle as any,
      totalObject: null as any,
    };
  }

  async function confirmTrip() {
    if (!draftVehicle) return toast({ title: "Select a vehicle", description: "Click a vehicle row to assign." });
    if (!draftDriver)  return toast({ title: "Assign a driver",  description: "Drag a driver or click a driver row." });
    if (!draftStopIds.length) return toast({ title: "Add stops", description: "Select drops/pickups and add to trip." });

    // BUG FIX: "Confirm" was always calling createTrip(), even when the
    // draft was actually an existing, already-persisted trip loaded via
    // selectTrip() for editing (e.g. adding a stop to a trip you already
    // confirmed earlier). loadedTripRef is set by selectTrip() whenever
    // that happens — if it's populated, this is an update, not a new trip.
    const loaded = loadedTripRef.current;
    const existingTrip = loaded ? trips.find((t) => t.tripId === loaded.tripId) : undefined;

    if (existingTrip && existingTrip.tripCode) {
      await pushTripUpdate(existingTrip, draftVehicle, draftDriver, draftStops, "Trip updated");
      clearDraft();
      setRefreshKey((k) => k + 1);
      return;
    }

    const totalWeight = draftStops.reduce((n, s) => n + s.netWeight, 0);
    const deliveries  = draftStops.filter((s) => s.type === "DROP").length;
    const pickupCount = draftStops.filter((s) => s.type === "PICKUP").length;
    const totalVol    = draftStops.reduce((n, s) => n + s.volume, 0);
    const totalQty    = draftStops.reduce((n, s) => n + s.qty, 0);
    const distanceKm  = Math.round(40 + draftStops.length * 12 + Math.random() * 30);
    const travelMin   = Math.round(60 + draftStops.length * 18);
    const fallbackId  = `XVR-${date.replace(/-/g, "")}-${site}-${String(trips.length + 1).padStart(3, "0")}`;

    const payload = buildTripPayload(draftVehicle, draftDriver, draftStops);

    const fallback: Trip = {
      id: fallbackId,
      routeCode: `Route code ${trips.length + 1}`,
      seq: trips.length + 1,
      vehicle: draftVehicle, driver: draftDriver, stops: draftStops,
      distanceKm, travelTimeMin: travelMin,
      totalWeight, totalVol, totalQty, deliveries, pickups: pickupCount,
      status: "Open", locked: false, tmsValidated: false,
      createdAt: new Date().toLocaleTimeString(),
      departSite: site, arrivalSite: site,
    };

    try {
      const resp = await tripApi.createTrip(payload);
      const trip = tripFromApi(resp, fallback);
      trip.seq = trips.length + 1;
      setTrips((prev) => [...prev, trip]);
      setSelectedTripId(trip.id);
      clearDraft();
      toast({ title: "Trip confirmed", description: `${resp.tripCode} · ${draftStops.length} stops · ${totalWeight} kg` });
      // Refetch trips for the current site + date so the list reflects backend state.
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast({ title: "Failed to confirm trip", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  // Push the full trip payload to backend for an existing trip.
  async function pushTripUpdate(
    trip: Trip,
    vehicle: Vehicle,
    driver: Driver,
    stops: Stop[],
    successMsg?: string,
  ) {
    if (trip.tripId == null || !trip.tripCode) return;
    try {
      const payload = buildTripPayload(vehicle, driver, stops, { tripCode: trip.tripCode });
      const resp = await tripApi.updateTrip(trip.tripCode, payload);
      setTrips((prev) => prev.map((x) => x.id === trip.id ? tripFromApi(resp, x) : x));
      if (successMsg) toast({ title: successMsg, description: trip.tripCode });
      // refresh baseline for stop-sync detection
      loadedTripRef.current = { tripId: trip.tripId, stopIds: stops.map((s) => s.id) };
    } catch (e: any) {
      toast({ title: "Trip update failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  // ── Trip row actions ───────────────────────────────────
  function selectTrip(t: Trip) {
    setSelectedTripId(t.id);
    // load trip stops back into active panel for viewing
    setDraftVehicle(t.vehicle);
    setDraftDriver(t.driver);
    setDraftStopIds(t.stops.map((s) => s.id));
    loadedTripRef.current = t.tripId != null
      ? { tripId: t.tripId, stopIds: t.stops.map((s) => s.id) }
      : null;
  }

//   function reorderTripStops(trip: Trip, newStops: Stop[]) {
//   // Update state immediately — draftStops will re-sort by the new seq automatically
//   setTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, stops: newStops } : t)));

//   // Persist to backend if this trip already exists server-side
//   if (trip.tripId != null && trip.tripCode) {
//     pushTripUpdate(trip, trip.vehicle, trip.driver, newStops, "Stop order updated");
//   }
// }
function reorderTripStops(trip: Trip, newStops: Stop[]) {
  if (!canEditTrip(trip)) {
    toast({
      title: "Cannot reorder stops",
      description: `Trip ${trip.tripCode ?? trip.id} is ${(trip as any).optiStatus ?? trip.status}. Unlock the trip to make changes.`,
      variant: "destructive",
    });
    return;
  }
  const wasOptimised = trip.optiStatus === "Optimised";
  setTrips((prev) => prev.map((t) => (t.id === trip.id
    ? { ...t, stops: newStops, ...(wasOptimised ? { optiStatus: "Open" as any, status: "Open" as any } : {}) }
    : t)));
  if (trip.tripId != null && trip.tripCode) {
    pushTripUpdate(trip, trip.vehicle, trip.driver, newStops, "Stop order updated");
  }
}

// Delete a single drop/pickup from a trip via the List View — only
// allowed when the trip is Open or Optimised (same rule as reordering);
// asks for confirmation, then removes the stop, pushes the update, and
// unconditionally brings the trip back to Open (removing a stop
// invalidates whatever plan/optimisation was there, same reasoning as
// vehicle reassignment and stop reordering above).
function handleDeleteStopFromListView(trip: Trip, docNum: string) {
  if (!canEditTrip(trip)) {
    setVroomError({
      title: "Cannot Remove Stop",
      detail: `Trip ${trip.tripCode ?? trip.id} is ${(trip as any).optiStatus ?? trip.status}. Unlock it first to remove stops.`,
    });
    return;
  }
  const stop = trip.stops.find((s) => s.id === docNum);
  setConfirmDialog({
    open: true,
    title: "Remove this stop?",
    description: `Remove ${stop?.type === "PICKUP" ? "pickup" : "drop"} ${docNum}${stop?.client ? ` (${stop.client})` : ""} from trip ${trip.tripCode ?? trip.id}?`,
    confirmLabel: "Yes, remove",
    onConfirm: async () => {
      const newStops = trip.stops.filter((s) => s.id !== docNum);
      setTrips((prev) => prev.map((t) => (t.id === trip.id
        ? { ...t, stops: newStops, optiStatus: "Open" as any, status: "Open" as any }
        : t)));
      // Free the stop back up in the Deliveries/Pickups panel so it can
      // be added to another trip.
      setAllStops((prev) => prev.map((s) => (s.id === docNum ? { ...s, routeStatus: "To Plan" } : s)));
      // BUG FIX: this trip's stops are ALSO mirrored into the Active
      // Trip panel's own state (draftStopIds/draftStops) whenever it's
      // the currently loaded/selected trip there — that's a separate
      // copy from trips[].stops above. Without updating it here too,
      // the panel kept showing (and would re-push, via a subsequent
      // Confirm click) the OLD stop list including the one just
      // removed — undoing this deletion the moment Confirm was clicked
      // afterward, exactly as reported.
      if (loadedTripRef.current?.tripId === trip.tripId) {
        const newStopIds = newStops.map((s) => s.id);
        setDraftStopIds(newStopIds);
        loadedTripRef.current = { tripId: trip.tripId!, stopIds: newStopIds };
      }
      if (trip.tripId != null && trip.tripCode) {
        await pushTripUpdate(trip, trip.vehicle, trip.driver, newStops, "Stop removed");
      }
    },
  });
}

  // Full trip status lifecycle, in order: Open -> Optimised -> Locked ->
  // To Allocate -> Confirmed -> Loaded -> Checked-In -> Checked-Out.
  // Mirrors the backend's TripLockService.isAtLeastToAllocate() — true
  // once a trip has an LVS record (from "To Allocate" onward). "Validated"
  // kept for backward compatibility with any trip that reached that
  // status before the backend rename to "To Allocate".
  function isAtLeastToAllocate(status: string | undefined | null): boolean {
    const s = String(status ?? "");
    return ["To Allocate", "Validated", "Confirmed", "Loaded", "Checked-In", "Checked-Out"].includes(s);
  }

  // Reassign vehicle/driver on a persisted trip — with confirmation + backend sync.
  // Only allowed when trip is in Open or Optimised status.
  function canEditTrip(trip: Trip | undefined): boolean {
    if (!trip) return true;
    const s = String((trip as any).optiStatus ?? trip.status ?? "").toLowerCase();
    return s === "open" || s === "optimised" || s === "optimized" || s === "";
  }

  async function reassignVehicle(v: Vehicle | null) {
    const trip = trips.find((x) => x.id === selectedTripId);
    if (!trip || trip.tripId == null) {
      setDraftVehicle(v);
      // Same auto-assign as drag-drop (onActivePanelDrop) — only for a
      // fresh/local draft, not a persisted trip (that path below already
      // has its own confirm-and-push flow; changing driver there isn't
      // part of this action).
      if (v) {
        const assignment = assignedDriverByVehicle.get(v.code);
        if (assignment) {
          const assignedDriver = apiDrivers.find((x) => x.id === assignment.driverId);
          if (assignedDriver && assignedDriver.status === "Available") setDraftDriver(assignedDriver);
        }
      }
      return;
    }
    if (!canEditTrip(trip)) {
      toast({
        title: "Cannot change vehicle",
        description: `Trip ${trip.tripCode ?? trip.id} is ${(trip as any).optiStatus ?? trip.status}. Unlock the trip to make changes.`,
        variant: "destructive",
      });
      return;
    }
    if (!v) {
      setDraftVehicle(null);
      setTrips((prev) => prev.map((x) => x.id === trip.id ? { ...x, vehicle: v ?? x.vehicle } : x));
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Change vehicle?",
      description: `Reassign vehicle of trip ${trip.tripCode ?? trip.id} to ${v.code} (${v.vehicleNo}). The active tour will be updated and saved.`,
      confirmLabel: "Yes, change",
      onConfirm: async () => {
        // Rule: changing the vehicle on an already-Optimised trip
        // invalidates the optimisation — timings, weight, and volume were
        // all computed for the PREVIOUS vehicle's capacity/route, so the
        // trip goes back to Open and needs to be re-optimised. Same
        // pattern already used for stop reordering (reorderTripStops,
        // above) — the trip goes back to Open there too, for the same
        // reason (route changed).
        const wasOptimised = trip.optiStatus === "Optimised";
        setDraftVehicle(v);
        setTrips((prev) => prev.map((x) => x.id === trip.id
          ? { ...x, vehicle: v, ...(wasOptimised ? { optiStatus: "Open" as any, status: "Open" as any } : {}) }
          : x));
        await pushTripUpdate(trip, v, trip.driver, trip.stops, "Vehicle updated");
      },
    });
  }

  async function reassignDriver(d: Driver | null) {
    const trip = trips.find((x) => x.id === selectedTripId);
    if (!trip || trip.tripId == null) { setDraftDriver(d); return; }
    if (!canEditTrip(trip)) {
      toast({
        title: "Cannot change driver",
        description: `Trip ${trip.tripCode ?? trip.id} is ${(trip as any).optiStatus ?? trip.status}. Unlock the trip to make changes.`,
        variant: "destructive",
      });
      return;
    }
    if (!d) {
      setDraftDriver(null);
      setTrips((prev) => prev.map((x) => x.id === trip.id ? { ...x, driver: d ?? x.driver } : x));
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Change driver?",
      description: `Reassign driver of trip ${trip.tripCode ?? trip.id} to ${d.name}. The active tour will be updated and saved.`,
      confirmLabel: "Yes, change",
      onConfirm: async () => {
        setDraftDriver(d);
        setTrips((prev) => prev.map((x) => x.id === trip.id ? { ...x, driver: d } : x));
        await pushTripUpdate(trip, trip.vehicle, d, trip.stops, "Driver updated");
      },
    });
  }


  // Auto-sync stop add/remove on a selected persisted trip (debounced).
  useEffect(() => {
    const baseline = loadedTripRef.current;
    if (!baseline) return;
    const trip = trips.find((x) => x.tripId === baseline.tripId);
    if (!trip || !draftVehicle || !draftDriver) return;

    const a = baseline.stopIds.slice().sort().join("|");
    const b = draftStopIds.slice().sort().join("|");
    if (a === b) return;

    if (stopSyncTimerRef.current) clearTimeout(stopSyncTimerRef.current);
    stopSyncTimerRef.current = setTimeout(() => {
      pushTripUpdate(trip, draftVehicle, draftDriver, draftStops, "Trip stops updated");
    }, 700);
    return () => {
      if (stopSyncTimerRef.current) clearTimeout(stopSyncTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStopIds]);





  // After a PENDING Lock response, check back every 4s (up to 2 minutes)
  // for the durable outcome X3AsyncNotifier eventually writes to
  // xr_vrheader — surfaces a follow-up toast the moment it resolves,
  // per "if it is completed we can show Document details are updated."
  function pollX3SyncStatus(tripCode: string) {
    const POLL_INTERVAL_MS = 4000;
    const MAX_ATTEMPTS = 30; // 2 minutes
    let attempts = 0;

    const tick = async () => {
      attempts++;
      try {
        const header: any = await transportApi.getVrHeader(tripCode);
        const status = header?.x3SyncStatus;
        if (status === "SYNCED") {
          toast({ title: "Document details are updated", description: tripCode });
          return;
        }
        if (status === "FAILED") {
          toast({ title: "Document details were not updated", description: tripCode, variant: "destructive" });
          return;
        }
      } catch {
        // Transient fetch failure — just try again next tick.
      }
      if (attempts < MAX_ATTEMPTS) setTimeout(tick, POLL_INTERVAL_MS);
    };
    setTimeout(tick, POLL_INTERVAL_MS);
  }

  async function setTripStatus(trip: Trip, optiStatus: OptiStatus, lockFlag: number) {
    if (trip.tripId == null || !trip.tripCode) {
      // Local-only trip (not yet persisted) — update UI optimistically
      setTrips((prev) => prev.map((t) => t.id === trip.id
        ? { ...t, status: optiStatus === "Optimised" ? "Optimised" : optiStatus, locked: lockFlag === 1, optiStatus, lockFlag }
        : t));
      return;
    }
    try {
      if (optiStatus === "Locked") {
        setLockingInfo({ tripCode: trip.tripCode });
        let result;
        try {
          result = await tripApi.lockTrip(trip.tripCode);
        } finally {
          setLockingInfo(null);
        }

        setTrips((prev) => prev.map((t) => t.id === trip.id
          ? { ...t, status: optiStatus, optiStatus, locked: lockFlag === 1, lockFlag }
          : t));
        setRefreshKey((k) => k + 1);
        setSelectedTripIds((prev) => { if (!prev.has(trip.id)) return prev; const n = new Set(prev); n.delete(trip.id); return n; });

        const variant = result.x3SyncStatus === "FAILED" ? "destructive" as const : undefined;
        toast({ title: result.message, description: trip.tripCode, variant });

        if (result.x3SyncStatus === "PENDING") pollX3SyncStatus(trip.tripCode);
        return;
      }

      if (optiStatus === "Validated") await tripApi.validateTrip(trip.tripCode);
      else if (optiStatus === "Open" && lockFlag === 0) await tripApi.unlockTrip(trip.tripCode);
      else await tripApi.updateTripStatus(trip.tripCode, { optiStatus, lockFlag, notes: "", userCode: "SYSTEM" });

      // BUG FIX: this used to rely solely on the refreshKey refetch below
      // to update the row's displayed status — but that's an async fetch
      // racing against however long the backend takes to make the write
      // durable/queryable. In that window (or if the fetch is just plain
      // slow), the trips list still holds this trip's PRE-action snapshot,
      // and if the backend's list endpoint returns a null/unexpected
      // optiStatus for a fraction of a second right after the write, the
      // row renders "UNDEFINED" until a manual page refresh papers over
      // it later. We already know deterministically what the new status
      // is — it's literally what we just requested — so patch it into
      // local state immediately rather than waiting on a round trip.
      setTrips((prev) => prev.map((t) => t.id === trip.id
        ? { ...t, status: optiStatus, optiStatus, locked: lockFlag === 1, lockFlag }
        : t));

      // Still refetch afterward for full consistency (dates/times/other
      // server-computed fields this optimistic patch doesn't know about).
      setRefreshKey((k) => k + 1);
      setSelectedTripIds((prev) => { if (!prev.has(trip.id)) return prev; const n = new Set(prev); n.delete(trip.id); return n; });
      toast({ title: `Trip ${optiStatus.toLowerCase()}`, description: trip.tripCode ?? trip.id });
    } catch (e: any) {
      setLockingInfo(null);
      toast({ title: "Status update failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  function lockTrip(id: string) {
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    // Rule: once Validated, lock/unlock is no longer allowed at all —
    // Validated is past the point where the plan can be reopened from
    // here (would need to go through Non-Validate/unwind on the X3 side
    // first, which isn't wired up as a Planner action).
    if (t.status === "Validated" || t.tmsValidated) {
      setVroomError({
        title: "Cannot Change Lock State",
        detail: `Trip ${t.tripCode ?? t.id} is Validated. Lock/unlock is no longer available once a trip has been validated.`,
      });
      return;
    }
    const willLock = !t.locked;
    if (willLock) {
      const isOptimised = t.optiStatus === "Optimised" || t.status === "Optimised" || t.status === "Optimized";
      if (!isOptimised) {
        toast({
          title: "Cannot Lock",
          description: "Trip is in Open status, can't lock. Optimise the trip first before locking.",
          variant: "destructive",
        });
        return;
      }
    }
    setConfirmDialog({
      open: true,
      title: willLock ? "Lock this trip?" : "Unlock this trip?",
      description: willLock
        ? `Locking trip ${t.tripCode ?? t.id} will push its plan to X3 and prevent further edits until unlocked.`
        : `Unlocking trip ${t.tripCode ?? t.id} will remove its plan from X3 and allow edits again.`,
      confirmLabel: willLock ? "Yes, lock" : "Yes, unlock",
      onConfirm: () => setTripStatus(t, willLock ? "Locked" : "Open", willLock ? 1 : 0),
    });
  }

  function validateTrip(id: string) {
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    if (!t.locked) {
      const statusLabel = t.optiStatus === "Optimised" || t.status === "Optimised" ? "Optimised" : "Open";
      toast({
        title: "Cannot Validate",
        description: `Trip is in ${statusLabel} status, can't validate. Lock the trip first to create LVS / validate.`,
        variant: "destructive",
      });
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Validate this trip?",
      description: `Validating trip ${t.tripCode ?? t.id} will confirm its LVS documents in X3. This can't be easily undone.`,
      confirmLabel: "Yes, validate",
      onConfirm: () => setTripStatus(t, "Validated", 1),
    });
  }

  async function performDeleteTrip(id: string) {
    const t = trips.find((x) => x.id === id);
    if (t?.tripCode) {
      try {
        await tripApi.deleteTrip(t.tripCode);
      } catch (e: any) {
        toast({ title: "Delete failed", description: e?.message ?? "Unknown error", variant: "destructive" });
        return;
      }
    }
    setTrips((prev) => prev.filter((x) => x.id !== id));
    if (selectedTripId === id) { setSelectedTripId(null); clearDraft(); }
    toast({ title: "Trip removed" });
  }

  function deleteTrip(id: string) {
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    // Rule: can't delete a trip once it's locked (or validated, which
    // implies locked) — has to be unlocked first, same as add/remove
    // documents.
    if (t.locked || t.status === "Validated" || t.tmsValidated) {
      setVroomError({
        title: "Cannot Delete Trip",
        detail: `Trip ${t.tripCode ?? t.id} is ${t.status}. Unlock it first before deleting.`,
      });
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Delete Trip",
      description: `Do you want to delete trip ${t.tripCode ?? t.id}?`,
      confirmLabel: "Yes",
      onConfirm: () => performDeleteTrip(id),
    });
  }

  // ── Group selection & actions ──────────────────────────
  useEffect(() => { setSelectedTripIds(new Set()); }, [site, date]);

  function toggleTripSel(id: string) {
    setSelectedTripIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAllTrips(list: Trip[]) {
    const allIds = list.map(t => t.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedTripIds.has(id));
    setSelectedTripIds(allSelected ? new Set() : new Set(allIds));
  }

  async function runGroupStatus(
    kind: "lock" | "unlock" | "validate",
    eligible: Trip[],
    optiStatus: OptiStatus,
    lockFlag: number,
    successLabel: string,
  ) {
    setGroupBusy({ kind, done: 0, total: eligible.length });
    const persisted = eligible.filter(t => !!t.tripCode);
    const localOnly = eligible.filter(t => !t.tripCode);

    // Optimistically flip local-only trips
    if (localOnly.length) {
      setTrips((prev) => prev.map((x) => localOnly.some(t => t.id === x.id)
        ? { ...x, optiStatus, lockFlag, locked: lockFlag === 1, status: optiStatus as any }
        : x));
    }

    let ok = localOnly.length;
    try {
      if (persisted.length) {
        const codes = persisted.map(t => t.tripCode!);
        const action = kind === "lock" ? tripApi.lockTripsGroup
                     : kind === "unlock" ? tripApi.unlockTripsGroup
                     : tripApi.validateTripsGroup;
        await action(codes);
        // Refresh each persisted trip
        for (let i = 0; i < persisted.length; i++) {
          const t = persisted[i];
          try {
            const resp = await tripApi.getTripByCode(t.tripCode!);
            // Same fix as setTripStatus()/handleLvsCreateFromDetail: the
            // getTripByCode call right after the group action can race
            // the backend making that write queryable, returning a
            // still-stale status. Merge the known-correct values (exactly
            // what we just requested) over whatever this fetch returned,
            // rather than trusting it outright.
            setTrips((prev) => prev.map((x) => x.id === t.id
              ? { ...tripFromApi(resp, x), status: optiStatus, optiStatus, locked: lockFlag === 1, lockFlag }
              : x));
          } catch {
            setTrips((prev) => prev.map((x) => x.id === t.id
              ? { ...x, optiStatus, lockFlag, locked: lockFlag === 1, status: optiStatus as any }
              : x));
          }
          ok++;
          setGroupBusy({ kind, done: ok, total: eligible.length });
        }
      }
    } catch (e: any) {
      setVroomError({ title: `${successLabel} failed`, detail: e?.message ?? "Unknown error" });
    }
    setGroupBusy(null);
    // Same fix as setTripStatus(): guarantee a consistent final state via
    // a full trips-list refetch, rather than relying solely on each
    // per-trip getTripByCode() response shape.
    if (persisted.length) setRefreshKey((k) => k + 1);
    if (ok > 0) toast({ title: `${ok} trip(s) ${successLabel}` });
  }

  async function groupLock() {
    const selected = trips.filter(t => selectedTripIds.has(t.id));
    if (!selected.length) { setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." }); return; }
    const eligible = selected.filter(t => !t.locked);
    if (!eligible.length) { setVroomError({ title: "No Trips to Lock", detail: "All selected trips are already locked." }); return; }
    setConfirmDialog({
      open: true,
      title: "Lock trips",
      description: `Lock ${eligible.length} trip(s)? This will send them to X3.`,
      confirmLabel: "Yes, lock",
      onConfirm: () => runGroupStatus("lock", eligible, "Locked", 1, "locked"),
    });
  }

async function groupUnlock() {
  const selected = trips.filter(t => selectedTripIds.has(t.id));
  if (!selected.length) {
    setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." });
    return;
  }

  const isValidated = (t: Trip) => t.status === "Validated" || t.tmsValidated;
  const eligible = selected.filter(t => t.locked && !isValidated(t));

  if (!eligible.length) {
    const allValidated = selected.every(isValidated);
    setVroomError({
      title: "No Trips to Unlock",
      detail: allValidated
        ? "All selected trips are validated."
        : "No selected trips are currently locked.",
    });
    return;
  }

  setConfirmDialog({
    open: true,
    title: "Unlock trips",
    description: `Unlock ${eligible.length} trip(s)? This will remove their plan from X3 and allow edits again.`,
    confirmLabel: "Yes, unlock",
    onConfirm: () => runGroupStatus("unlock", eligible, "Open", 0, "unlocked"),
  });
}

  async function groupValidate() {
    const selected = trips.filter(t => selectedTripIds.has(t.id));
    if (!selected.length) { setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." }); return; }
    const eligible = selected.filter(t => t.locked === true && t.optiStatus !== "Validated");
    if (!eligible.length) { setVroomError({ title: "No Trips to Validate", detail: "Group Validate requires selected trips that are Locked and not yet Validated." }); return; }
    setConfirmDialog({
      open: true,
      title: "Validate trips",
      description: `Validate ${eligible.length} trip(s)? This cannot be undone.`,
      confirmLabel: "Yes, validate",
      onConfirm: () => runGroupStatus("validate", eligible, "Validated", 1, "validated"),
    });
  }

  async function groupDelete() {
    const selected = trips.filter(t => selectedTripIds.has(t.id));
    if (!selected.length) { setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." }); return; }
    const eligible = selected.filter(t => !t.locked);
    const lockedCount = selected.length - eligible.length;
    if (!eligible.length) {
      setVroomError({ title: "Cannot Delete", detail: `All ${lockedCount} selected trip(s) are locked and cannot be deleted.\nUnlock them first.` });
      return;
    }
    setConfirmDialog({
      open: true,
      title: "Delete trips",
      description: `Delete ${eligible.length} trip(s)?${lockedCount > 0 ? `\n(Note: ${lockedCount} locked trip(s) will be skipped)` : ""}`,
      confirmLabel: "Yes, delete",
      onConfirm: async () => {
        setGroupBusy({ kind: "delete", done: 0, total: eligible.length });
        let ok = 0;
        for (let i = 0; i < eligible.length; i++) {
          const t = eligible[i];
          try {
            if (t.tripCode) await tripApi.deleteTrip(t.tripCode);
            setTrips((prev) => prev.filter((x) => x.id !== t.id));
            setSelectedTripIds((prev) => { const n = new Set(prev); n.delete(t.id); return n; });
            if (selectedTripId === t.id) { setSelectedTripId(null); clearDraft(); }
            ok++;
          } catch (e: any) {
            setVroomError({ title: "Delete failed", detail: `Trip ${t.tripCode ?? t.id}: ${e?.message ?? "Unknown error"}` });
            break;
          }
          setGroupBusy({ kind: "delete", done: i + 1, total: eligible.length });
        }
        setGroupBusy(null);
        if (ok > 0) toast({ title: `${ok} trip(s) deleted` });
      },
    });
  }

  async function groupOptimise() {
    const selected = trips.filter(t => selectedTripIds.has(t.id));
    if (!selected.length) { setVroomError({ title: "No Trips Selected", detail: "Please select at least one trip using the checkboxes in the trips table." }); return; }
    const eligible = selected.filter(t => t.optiStatus === "Open" && !!t.driver?.name);
    if (!eligible.length) {
      setVroomError({ title: "No Eligible Trips", detail: "Group Optimise requires selected trips with status 'Open' and a driver assigned." });
      return;
    }
    const depLat = currentSiteObj?.latitude ? Number(currentSiteObj.latitude) : 0;
    const depLng = currentSiteObj?.longitude ? Number(currentSiteObj.longitude) : 0;
    if (!depLat || !depLng) {
      setVroomError({ title: "Missing Site Coordinates", detail: "This site has no latitude/longitude.\nGo to Configuration → Customers → select the site address and set lat/lng." });
      return;
    }

    setGroupBusy({ kind: "optimise", done: 0, total: eligible.length });
    let ok = 0;
    for (let i = 0; i < eligible.length; i++) {
      const t = eligible[i];
      try {
        const missing = t.stops.filter(s => !s.lat || !s.lng);
        if (missing.length) throw new Error(`${missing.length} stop(s) missing coordinates`);
        const startSec = hhmmToSec("07:30");
        const capGrams = Math.round((t.vehicle.capacityWeight ?? 60000) * 1000);
        const vroomVehicle = {
          id: 1, description: t.vehicle.code,
          start: [depLng, depLat] as [number, number],
          end:   [depLng, depLat] as [number, number],
          capacity: [capGrams] as [number],
          time_window: [startSec, hhmmToSec("23:59")] as [number, number],
          max_tasks: 999,
        };
        const vroomJobs = t.stops.map((s, idx) => ({
          id: idx + 1, description: s.txn,
          location: [s.lng, s.lat] as [number, number],
          // service: Number(s.serviceTime ?? 0),
          service: s.serviceTime ? hhmmToSec(s.serviceTime) : 0,
          ...(s.type === "DROP"
            ? { delivery: [Math.round((s.netWeight || 1) * 1000)] as [number] }
            : { pickup:   [Math.round((s.netWeight || 1) * 1000)] as [number] }),
          priority: s.priority === "URGENT" ? 10 : s.priority === "LOW" ? 1 : 5,
        }));
        const result = await callVroom([vroomVehicle], vroomJobs);
        if (!result.routes?.length) throw new Error("VROOM returned no routes");
        const route = result.routes[0];
        const jobSteps = route.steps.filter((st: VroomStep) => st.type === "job");
        const endStep = route.steps.find((st: VroomStep) => st.type === "end");
        const endTime = secToHHMM(endStep ? endStep.arrival : startSec + route.duration);
        const totalDistKm = (route.distance / 1000).toFixed(1);
        const travelHHMM = secToHHMM(route.duration);
        const stopResults = jobSteps.map((st: VroomStep, idx: number) => ({
          seq: idx + 1, docNum: st.description ?? "",
          arrivalDate: date, arrivalTime: secToHHMM(st.arrival),
          departureDate: date, departureTime: secToHHMM(st.arrival + st.service),
          fromPrevDistance: ((st.distance ?? 0) / 1000).toFixed(1),
          fromPrevTravelTime: secToHHMM(st.duration),
          serviceTime: secToHHMM(st.service),
          waitingTime: secToHHMM(st.waiting_time ?? 0),
        }));
        if (t.tripCode) {
          const resp = await tripApi.optimiseTrip(t.tripCode, {
            orderMode: "auto", startTime: "07:30", endTime,
            travelTime: travelHHMM, totalTime: travelHHMM,
            totalDistance: totalDistKm, uomDistance: "km",
            totalCost: "", distanceCost: "", fixedCost: "", serviceCost: "",
            stopResults,
          });
          setTrips((prev) => prev.map((x) => x.id === t.id ? tripFromApi(resp, x) : x));
        } else {
          setTrips((prev) => prev.map((x) => x.id === t.id ? { ...x, status: "Optimised", optiStatus: "Optimised" as any } : x));
        }
        setSelectedTripIds((prev) => { if (!prev.has(t.id)) return prev; const n = new Set(prev); n.delete(t.id); return n; });
        ok++;
      } catch (e: any) {
        setVroomError({ title: "Optimisation failed", detail: `Trip ${t.tripCode ?? t.id}: ${e?.message ?? "VROOM error"}` });
        break;
      }
      setGroupBusy({ kind: "optimise", done: i + 1, total: eligible.length });
    }
    setGroupBusy(null);
    if (ok > 0) toast({ title: `${ok} trip(s) optimised` });
  }

  // ── Render ─────────────────────────────────────────────
  const currentStops = stopTypeTab === "drops" ? drops : pickups;
  const currentSearch = stopTypeTab === "drops" ? dropSearch : pickSearch;
  const setCurrentSearch = stopTypeTab === "drops" ? setDropSearch : setPickSearch;
  const allCurrentSelected = currentStops.length > 0 && currentStops.every((s) => selectedStopIds.has(s.id));

  // ── Loader / refresher for VR detail data (vrcode, vrdetails, loadstk) ──
  async function loadVrData(tripCode: string) {
    setVrLoading(true);
    try {
      const [header, details, loadStock] = await Promise.all([
        transportApi.getVrHeader(tripCode).catch(() => null),
        transportApi.getVrDetails(tripCode).catch(() => []),
        transportApi.getVrLoadStock(tripCode).catch(() => []),
      ]);
      setVrHeader(header);
      setVrDetails(details ?? []);
      setVrLoadStock(loadStock ?? []);
    } catch (err: any) {
      toast({ title: "Failed to load route detail", description: err?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setVrLoading(false);
    }
  }

  // Called from the detail screen when user clicks "LVS Create":
  // POST /trips/{code}/validate  →  refresh vrHeader / vrDetails / vrLoadStock
  async function handleLvsCreateFromDetail(trip: Trip) {
    if (!trip.tripCode) return;
    if (!trip.locked) {
      const statusLabel = trip.optiStatus === "Optimised" || trip.status === "Optimised" ? "Optimised" : "Open";
      toast({
        title: "Cannot Create LVS",
        description: `Trip is in ${statusLabel} status, can't validate. Lock the trip first to create LVS / validate.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await tripApi.validateTrip(trip.tripCode);
      // Same fix as setTripStatus(): patch the known new status
      // immediately (deterministic — it's exactly what we just
      // requested) instead of relying solely on the refetch below, which
      // can race the backend making the write queryable and show
      // "undefined"/disabled buttons for a window until a manual refresh
      // papers over it.
      setTrips((prev) => prev.map((t) => t.id === trip.id
        ? { ...t, status: "Validated", optiStatus: "Validated" }
        : t));
      setRefreshKey((k) => k + 1);
      toast({ title: "LVS Created", description: trip.tripCode });
      await loadVrData(trip.tripCode);
    } catch (e: any) {
      toast({ title: "LVS Create failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  // Called from the detail screen when user clicks "LVS Confirm":
  // now goes through the backend's /lvs-confirm endpoint, which calls
  // X3's XX10CRESDH AND sets xr_lvsheader.confirmed_flag atomically on
  // success — previously this only called X3 directly and never
  // touched our own confirmed/load flags at all, so nothing tracked
  // whether LVS Confirm had actually happened.
  async function handleLvsConfirmFromDetail(trip: Trip, lvsNum: string) {
    if (!trip.tripCode) {
      toast({ title: "LVS Confirm failed", description: "No trip code found for this trip.", variant: "destructive" });
      return;
    }
    try {
      const result = await tripApi.confirmLvsAction(trip.tripCode);
      const resp = result.x3Response;

      const rows: Array<{ i_xprhnum?: string; o_xstatus?: string; o_xmess?: string }> = (resp as any)?.grp1 ?? [];
      const failed = rows.filter((r) => String(r.o_xstatus) !== "2");

      if (rows.length === 0) {
        // Fallback: X3 responded but not in the expected table shape —
        // still treat as success rather than block the user, matching
        // how other X3 calls here handle an unexpected-but-ok response.
        toast({ title: "LVS Confirmed", description: lvsNum });
      } else if (failed.length === 0) {
        toast({ title: "LVS Confirmed", description: `${rows.length} document${rows.length !== 1 ? "s" : ""} confirmed` });
      } else {
        toast({
          title: `${rows.length - failed.length}/${rows.length} documents confirmed`,
          description: failed.map((f) => `${f.i_xprhnum}: ${f.o_xmess || "failed"}`).join("; "),
          variant: "destructive",
        });
      }

      await loadVrData(trip.tripCode);
    } catch (e: any) {
      toast({ title: "LVS Confirm failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  // Called from the detail screen when user clicks "Load Truck": goes
  // through the backend's /load-truck endpoint — blocked server-side
  // with a clear message if LVS Confirm hasn't succeeded yet, then
  // calls X3's X10CSTKMTV and sets xr_lvsheader.load_flag on success.
  async function handleLoadTruckFromDetail(trip: Trip, lvsNum: string) {
    if (!trip.tripCode) {
      toast({ title: "Load Truck failed", description: "No trip code found for this trip.", variant: "destructive" });
      return;
    }
    try {
      await tripApi.loadTruckAction(trip.tripCode);
      toast({ title: "Truck Loaded", description: lvsNum });
      await loadVrData(trip.tripCode);
    } catch (e: any) {
      toast({ title: "Load Truck failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  // ── If detail view, render full-screen detail page ─────────
  if (view === "detail" && detailTrip) {
    return (
      <RouteManagementDetail
        trip={detailTrip}
        vrHeader={vrHeader}
        vrDetails={vrDetails}
        vrLoadStock={vrLoadStock}
        vrLoading={vrLoading}
        onLvsCreate={() => handleLvsCreateFromDetail(detailTrip)}
        onLvsConfirm={(lvsNum) => handleLvsConfirmFromDetail(detailTrip, lvsNum)}
        onLvsLoadTruck={(lvsNum) => handleLoadTruckFromDetail(detailTrip, lvsNum)}
        onBack={() => { setView("planner"); setDetailTripId(null); setVrHeader(null); setVrDetails([]); setVrLoadStock([]); }}
      />
    );
  }


  return (
    <>
    <div className="flex flex-col bg-background" style={{ height: "calc(100vh - 56px)", fontFamily: "Inter, system-ui, sans-serif", fontSize: "12px" }}>

      {/* ── TOOLBAR ─ compact single row ─────────────── */}
      <div className="flex items-center gap-4 px-3 py-4 bg-gradient-to-r from-slate-50 via-blue-50/60 to-indigo-50/60 border-b border-border/60 flex-shrink-0 shadow-sm font-black text-xl">
        {/* Site */}
        {sitesLoading
          ? <div className="h-9 flex items-center gap-2 px-3 text-xs text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border"><Loader2 className="w-4 h-4 animate-spin" /> Loading sites…</div>
          : <SiteSelect sites={sites} value={site} onChange={setSite} />
        }
        {/* Date */}
        <div className="relative cursor-pointer h-9 flex items-center rounded-lg border border-input bg-background pl-8 pr-2 hover:border-primary/40 transition-colors" onClick={(e) => {
          const inp = (e.currentTarget.querySelector("input[type=date]") as HTMLInputElement | null);
          inp?.showPicker?.(); inp?.focus();
        }}>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <CalIcon className="w-3.5 h-3.5 text-primary pointer-events-none" />
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            onClick={(e) => { (e.currentTarget as HTMLInputElement).showPicker?.(); }}
            className="h-7 bg-transparent text-xs focus:outline-none w-[120px] cursor-pointer"
          />
        </div>
        {/* Route Codes */}
        <Select value={routeCode} onValueChange={setRouteCode}>
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue placeholder="Route Codes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Route Codes</SelectItem>
            {routeCodes.map(rc => (
              <SelectItem key={rc} value={rc}>{rc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Refresh */}
        <ToolbarBtn icon={RefreshCw} label="Refresh" spin={loading}
          disabled={loading || !site} color="text-muted-foreground"
          onClick={() => {
            // BUG FIX: refresh used to only bump refreshKey + clear the
            // trips-list checkbox selection — the "Active Trip" draft
            // panel (selected vehicle/driver/stops) and the selected-trip
            // radio state stayed stale. That stale loadedTripRef is also
            // what caused the "confirm reassignment" prompt to fire
            // unexpectedly on a plain vehicle/driver drag afterward (it
            // still thought an existing trip was loaded).
            setRefreshKey((k) => k + 1);
            setSelectedTripIds(new Set());
            setSelectedTripId(null);
            clearDraft();
          }} />

        <div className="h-5 w-px bg-border/50 mx-0.5" />

        <ToolbarBtn icon={Wand2}       label="Auto Generate Route" color="text-blue-600"    bg="hover:bg-blue-50"    onClick={openAutoGen} />
        <ToolbarBtn icon={GitMerge}    label={groupBusy?.kind === "optimise" ? `Optimising ${groupBusy.done}/${groupBusy.total}…` : "Group Optimisation"} color="text-slate-600"   bg="hover:bg-slate-50"   disabled={!!groupBusy} spin={groupBusy?.kind === "optimise"} onClick={groupOptimise} />
        <ToolbarBtn icon={Lock}        label={groupBusy?.kind === "lock"     ? `Locking ${groupBusy.done}/${groupBusy.total}…`    : "Group Lock"}         color="text-emerald-600" bg="hover:bg-emerald-50" disabled={!!groupBusy} spin={groupBusy?.kind === "lock"}     onClick={groupLock} />
        <ToolbarBtn icon={Unlock}      label={groupBusy?.kind === "unlock"   ? `Unlocking ${groupBusy.done}/${groupBusy.total}…`  : "Group Unlock"}       color="text-violet-600"  bg="hover:bg-violet-50"  disabled={!!groupBusy} spin={groupBusy?.kind === "unlock"}   onClick={groupUnlock} />
        <ToolbarBtn icon={ShieldCheck} label={groupBusy?.kind === "validate" ? `Validating ${groupBusy.done}/${groupBusy.total}…` : "Group Validate"}     color="text-amber-600"   bg="hover:bg-amber-50"   disabled={!!groupBusy} spin={groupBusy?.kind === "validate"} onClick={groupValidate} />
        <ToolbarBtn icon={Trash2}      label={groupBusy?.kind === "delete"   ? `Deleting ${groupBusy.done}/${groupBusy.total}…`   : "Group Delete Trips"} color="text-rose-600"    bg="hover:bg-rose-50"    disabled={!!groupBusy} spin={groupBusy?.kind === "delete"}   onClick={groupDelete} />

        {/* Status pill */}
        <div className="ml-auto flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
              <div className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
              Loading…
            </div>
          )}
        </div>
      </div>

      {!loaded ? (
        <div className="flex-1 flex items-center justify-center">
          {loading
            ? <div className="text-center"><Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
                <p className="font-medium text-foreground text-sm">Loading planner data…</p>
                <p className="text-xs text-muted-foreground mt-1">{site} · {date}</p></div>
            : <div className="text-center"><RouteIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium text-foreground text-sm">Select a site to load planner data</p>
                <p className="text-xs text-muted-foreground mt-1">Data loads automatically when site or date changes.</p></div>
          }
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-0 px-2 pt-2 pb-1.5" style={{ minHeight: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>

          {/* ── KPI STRIP ──────────────────────────────── */}
          <div className="grid grid-cols-6 gap-1.5 flex-shrink-0 mb-2.5">
            <KpiCard label="Vehicles"          value={kpis.vehicles}         icon={Truck}           color="bg-gradient-to-br from-slate-500 to-slate-700" />
            <KpiCard label="Trips"             value={kpis.trips}            icon={RouteIcon}       color="bg-gradient-to-br from-indigo-500 to-indigo-700" />
            <KpiCard label="Assigned Docs"     value={kpis.assignedDocs}     icon={CheckCheck}      color="bg-gradient-to-br from-emerald-500 to-emerald-700" />
            <KpiCard label="Non-Assigned Docs" value={kpis.unassignedDocs}   icon={AlertCircle}     color="bg-gradient-to-br from-amber-500 to-amber-600" />
            <KpiCard label="Delivery Qty"      value={kpis.totalDeliveryQty} icon={ArrowDownToLine} color="bg-gradient-to-br from-rose-500 to-rose-600" />
            <KpiCard label="Pickup Qty"        value={kpis.totalPickupQty}   icon={ArrowUpFromLine} color="bg-gradient-to-br from-sky-500 to-sky-600" />
          </div>

          {/* ── FLEET | DOCUMENTS ── */}
          <div className="grid grid-cols-2 gap-2 mb-2.5" style={{ height: "40vh", minHeight: 250 }}>

            {/* ════════════════════════════════════════
                LEFT 50% — FLEET (Vehicles + Drivers tabbed)
                ════════════════════════════════════════ */}
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">

                {/* Solid header bar — Fleet */}
              <div className="bg-[#1e40af] px-2 py-1 flex items-center gap-1.5 flex-shrink-0">
                {([
                  { key: "vehicles", label: "Vehicles", icon: Truck,  count: vehicles.length },
                  { key: "drivers",  label: "Drivers",  icon: Users,  count: drivers.length  },
                ] as const).map(({ key, label, icon: Icon, count }) => (
                  <button key={key} onClick={() => setFleetTab(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                      fleetTab === key
                        ? "bg-white text-[#1e40af]"
                        : "text-white/50 hover:text-white/80"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                    <span className={cn(
                      "text-[9px] font-bold rounded-full px-1.5 py-0.5",
                      fleetTab === key
                        ? "bg-[#dbeafe] text-[#1e3a8a]"
                        : "bg-white/10 text-white/50"
                    )}>{count}</span>
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="px-2 py-1 border-b border-border/40">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={fleetTab === "vehicles" ? vehSearch : drvSearch}
                    onChange={(e) => fleetTab === "vehicles" ? setVehSearch(e.target.value) : setDrvSearch(e.target.value)}
                    placeholder={`Search ${fleetTab}…`}
                    className="h-6 pl-6 text-[10px]"
                  />
                </div>
              </div>

              {/* VEHICLES content */}
              {fleetTab === "vehicles" && (
                <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
                  <table className="w-full" style={{ fontSize: "11px" }}>
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr>
                        {["Vehicle Code","Vehicle No","Category","Departure Site", "Arrival Site","Start","Assigned Driver"].map((h) => (
                          <th key={h} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap border-b" style={{ background:"#eff6ff", color:"#1e40af", borderColor:"#bfdbfe" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v, i) => {
                        const sel = draftVehicle?.code === v.code;
                        return (
                          <tr key={v.code}
                            draggable onDragStart={(e) => onVehicleDragStart(e, v)}
                            onClick={() => reassignVehicle(sel ? null : v)}
                            className={cn(
                              "border-b border-border/20 cursor-pointer transition-colors select-none text-[11px]",
                              sel
                                ? "bg-emerald-50 dark:bg-emerald-950/30"
                                : cn(i % 2 === 1 && "bg-muted/30", "hover:bg-muted/50")
                            )}
                          >
                            <td className={cn("px-2 py-1 font-mono font-bold text-[11px]", sel ? "text-emerald-700" : "text-primary")}>
                              {v.code}
                              {sel && <span className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded font-semibold">Selected</span>}
                            </td>
                            <td className="px-2 py-1 font-mono text-muted-foreground">{v.vehicleNo}</td>
                            <td className="px-2 py-1">{v.category}</td>
                            <td className="px-2 py-1 font-mono ">{v.departureSite}</td>
                            <td className="px-2 py-1 font-mono text-muted-foreground">{v.arrivalSite}</td>
                            <td className="px-2 py-1 text-muted-foreground">{v.startTime}</td>
                            <td className="px-2 py-1">
                              {assignedDriverByVehicle.get(v.code)
                                ? <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded" title={`Assigned ${assignedDriverByVehicle.get(v.code)!.startDate} to ${assignedDriverByVehicle.get(v.code)!.endDate || "…"}`}>
                                    {assignedDriverByVehicle.get(v.code)!.driverName}
                                  </span>
                                : <span className="text-muted-foreground/50">—</span>}
                            </td>
                          </tr>

                                                  );
                      })}
                      {vehicles.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-4 text-center text-xs text-muted-foreground">No vehicles for this site</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* DRIVERS content — table format matching vehicles */}
              {fleetTab === "drivers" && (
                <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
                  <table className="w-full" style={{ fontSize: "11px" }}>
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr>
                        {["Driver Code","Driver Name","License","Status"].map((h) => (
                          <th key={h} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap border-b" style={{ background:"#eff6ff", color:"#1e40af", borderColor:"#bfdbfe" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((d, i) => {
                        const busy = d.status !== "Available";
                        const sel  = draftDriver?.id === d.id;
                        return (
                          <tr key={d.id}
                            draggable={!busy}
                            onDragStart={(e) => onDriverDragStart(e, d)}
                            onClick={() => { if (!busy) reassignDriver(sel ? null : d); }}
                            className={cn(
                              "border-b border-border/20 cursor-pointer transition-colors select-none text-[11px]",
                              sel
                                ? "bg-indigo-50 dark:bg-indigo-950/30"
                                : busy
                                  ? cn(i % 2 === 1 && "bg-muted/30", "opacity-50 hover:bg-muted/30")
                                  : cn(i % 2 === 1 && "bg-muted/30", "hover:bg-indigo-50/40")
                            )}
                          >
                            <td className={cn("px-2 py-1 font-mono font-bold text-[11px]", sel ? "text-indigo-700" : "text-primary")}>
                              {d.id}
                              {sel && <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded font-semibold">Selected</span>}
                            </td>
                            <td className="px-2 py-1 font-medium">{d.name}</td>
                            <td className="px-2 py-1 font-mono text-muted-foreground">{d.license}</td>
                            <td className="px-2 py-1">
                              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                busy ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              )}>{busy ? "On Trip" : "Available"}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {drivers.length === 0 && (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-muted-foreground">No drivers found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════
                RIGHT 50% — DOCUMENTS (Drops + Pickups tabbed)
                ════════════════════════════════════════ */}
            <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden flex flex-col">

              {/* Solid header bar — Documents */}
              <div className="bg-[#1e40af] px-2 py-1 flex items-center gap-1.5 flex-shrink-0">
                {([
                  { key: "drops",   label: "Deliveries", icon: ArrowDownToLine, count: drops.length   },
                  { key: "pickups", label: "Pickups",    icon: ArrowUpFromLine, count: pickups.length },
                ] as const).map(({ key, label, icon: Icon, count }) => (
                  <button key={key} onClick={() => setStopTypeTab(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                      stopTypeTab === key
                        ? "bg-white text-[#1e40af]"
                        : "text-white/50 hover:text-white/80"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                    <span className={cn(
                      "text-[9px] font-bold rounded-full px-1.5 py-0.5",
                      stopTypeTab === key
                        ? "bg-[#dbeafe] text-[#1e3a8a]"
                        : "bg-white/10 text-white/50"
                    )}>{count}</span>
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-white/40 hidden sm:block">drag or select + Add</span>
              </div>

              {/* Search + action bar */}
              <div className="px-2 py-1 border-b border-border/40 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={currentSearch}
                    onChange={(e) => setCurrentSearch(e.target.value)}
                    placeholder={`Search ${stopTypeTab === "drops" ? "deliveries" : "pickups"}…`}
                    className="h-6 pl-6 text-[10px]"
                  />
                </div>
                {selectedStopIds.size > 0 && (
                  <Button size="sm" className="h-6 text-[11px] gap-1 flex-shrink-0" onClick={addSelectedStopsToDraft}>
                    <CheckCheck className="w-3 h-3" />
                    Add {selectedStopIds.size} to Trip
                  </Button>
                )}
                <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap pl-1">
                  <Checkbox
                    checked={toPlanOnly}
                    onCheckedChange={(c) => setToPlanOnly(Boolean(c))}
                    className="h-3 w-3"
                  />
                  To Plan
                </label>
              </div>

              {/* Table */}
              <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
                <table className="w-full min-w-[600px]" style={{ fontSize: "11px" }}>
                  <thead className="bg-muted/40 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1 border-b w-7" style={{ background:"#eff6ff", borderColor:"#bfdbfe" }} />
                      {["Transaction No","Type","Priority","Client Code","Route Code","Postal City","Qty","Weight",""].map((h) => (
                        <th key={h} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap border-b" style={{ background:"#eff6ff", color:"#1e40af", borderColor:"#bfdbfe" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentStops.map((s, i) => (
                      <StopRow
                        key={s.id} stop={s} index={i}
                        used={usedStopIds.has(s.id) || draftStopIds.includes(s.id)}
                        selected={selectedStopIds.has(s.id)}
                        onToggle={() => toggleSelectedStop(s.id)}
                        dragging={dragStopIds.includes(s.id)}
                        onDragStart={(e) => {
                          const ids = selectedStopIds.has(s.id) && selectedStopIds.size > 1
                            ? Array.from(selectedStopIds)
                            : [s.id];
                          onStopsDragStart(e, ids);
                        }}
                        onViewProducts={(stop) => setProductDetailsStop(stop)}
                      />
                    ))}
                    {currentStops.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-10 text-center text-xs text-muted-foreground">
                          No {stopTypeTab === "drops" ? "deliveries" : "pickups"} available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── ACTIVE TOUR PANEL ────────────────────────────── */}
          {/* ── ACTIVE TOUR ── */}
          <div>
          <ActiveTourPanel
            vehicle={draftVehicle}
            driver={draftDriver}
            stops={draftStops}
            siteLat={currentSiteObj?.latitude ? Number(currentSiteObj.latitude) : 0}
            siteLng={currentSiteObj?.longitude ? Number(currentSiteObj.longitude) : 0}
            activeTripId={trips.find(t => t.vehicle.code === draftVehicle?.code)?.tripId ?? null}
            activeTripCode={trips.find(t => t.vehicle.code === draftVehicle?.code)?.tripCode ?? null}
            planDate={date}
            dropZoneActive={dropZoneActive}
            onDragOver={(e) => { e.preventDefault(); setDropZoneActive(true); }}
            onDragLeave={() => setDropZoneActive(false)}
            onDrop={onActivePanelDrop}
            onDriverDrop={(e) => {
              e.stopPropagation();
              const id = e.dataTransfer.getData("text/driver-id");
              const d = apiDrivers.find((x) => x.id === id);
              if (d) reassignDriver(d);
            }}
            onClearVehicle={() => reassignVehicle(null)}
            onClearDriver={() => reassignDriver(null)}
            onRemoveStop={removeStopFromDraft}
            onClear={clearDraft}
onConfirm={() => {
  const loaded = loadedTripRef.current;
  const existingTrip = loaded ? trips.find((t) => t.tripId === loaded.tripId) : undefined;
  const isUpdate = !!(existingTrip && existingTrip.tripCode);

  setConfirmDialog({
    open: true,
    title: isUpdate ? "Update trip?" : "Generate trip?",
    description: isUpdate
      ? `Are you sure you want to update this trip?`
      : "Are you sure you want to generate this trip?",
    confirmLabel: "Yes",
    onConfirm: async () => { await confirmTrip(); },
  });
}}
            selectedTripStatus={selectedTrip?.optiStatus ?? (selectedTrip?.status as string | undefined) ?? null}
            tripLocked={selectedTrip?.locked ?? false}
            tripDepSite={selectedTrip?.departSite ?? null}
            tripArrSite={selectedTrip?.arrivalSite ?? null}
            tripDistanceKm={selectedTrip?.distanceKm ?? null}
            tripStartTime={selectedTrip?.startTime ?? null}
            tripEndTime={selectedTrip?.endTime ?? null}
            onTripOptimised={(tripId, stopResults, totals) => {
              let optimisedId: string | null = null;
              setTrips(prev => prev.map(t => {
              if (t.tripId !== tripId) return t;
              optimisedId = t.id;
              const byDoc = new Map<string, any>((stopResults ?? []).map((r: any) => [r.docNum, r]));
              const mergedStops = t.stops.map((s) => {
                const r = byDoc.get(s.txn);
                return r ? { ...s, seq: r.seq, arrivalDate: r.arrivalDate, arrivalTime: r.arrivalTime,
                  departureDate: r.departureDate, departureTime: r.departureTime,
                  fromPrevDistance: r.fromPrevDistance, fromPrevTravelTime: r.fromPrevTravelTime,
                  serviceTime: r.serviceTime, waitingTime: r.waitingTime } : s;
              }).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
              return { ...t, stops: mergedStops, optiStatus: "Optimised" as any,
                status: "Optimised", distanceKm: totals.distanceKm, endTime: totals.endTime };
              }));
              if (optimisedId) setSelectedTripIds((prev) => { if (!prev.has(optimisedId!)) return prev; const n = new Set(prev); n.delete(optimisedId!); return n; });
            }}
          />
          </div>

          {/* ── TRIPS & MAP ── */}
          <div className="h-[45vh] min-h-0 overflow-hidden mt-2.5">
          {/* ── BOTTOM: Resizable Trips | Map split ──────────── */}
          <ResizableSplit
            defaultLeftPct={60}
            minPct={20}
            maxPct={80}
            leftLabel={`${filteredTrips.length} trip${filteredTrips.length !== 1 ? "s" : ""}${selectedTripIds.size ? ` (${selectedTripIds.size} selected)` : ""}`}
            left={
              <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-border/60 shadow-sm">

                {/* Option 3: inline expand handled per-row below */}

                {/* ── TRIPS TABLE ── */}
                <div className="bg-card flex flex-col h-full min-h-0 flex-1 overflow-hidden relative">


                {/* Header */}
                <div className="px-3 py-2.5 border-b border-border/60 bg-muted/20 flex items-center gap-2 flex-wrap flex-shrink-0">
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={tripSearch} onChange={(e) => setTripSearch(e.target.value)}
                      placeholder="Search trips…" className="h-7 pl-7 text-xs w-36" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-7 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Optimised">Optimised</SelectItem>
                      <SelectItem value="Locked">Locked</SelectItem>
                      <SelectItem value="Validated">Validated</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground ml-auto">({filteredTrips.length})</span>
                </div>
                {/* Table */}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                  <table className="w-full min-w-[480px]" style={{ fontSize: "11px" }}>
                    <thead className="bg-muted/30 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-1.5 border-b border-border/40 w-8 text-center">
                          <Checkbox
                            checked={filteredTrips.length > 0 && filteredTrips.every(t => selectedTripIds.has(t.id))}
                            onCheckedChange={() => toggleAllTrips(filteredTrips)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </th>
                        <th className="px-2 py-1.5 border-b border-border/40 w-7"></th>
                        <th className="px-2 py-1.5 border-b border-border/40 w-6"></th>
                        {["Trip Code","Details","Status","Vehicle","Driver","Stops","Actions"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap border-b border-border/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrips.length === 0 && (
                        <tr><td colSpan={11} className="px-3 py-12 text-center text-xs text-muted-foreground">
                          {trips.length === 0 ? "No trips yet — confirm a trip above" : "No trips match filters"}
                        </td></tr>
                      )}
                      {filteredTrips.map((t) => {
                        const sel = t.id === selectedTripId;
                        const groupSel = selectedTripIds.has(t.id);
                        const apiStatus = t.optiStatus ?? (t.status as OptiStatus);
                        return (
                          <tr key={t.id}
                            onClick={() => selectTrip(t)}
                            className={cn(
                              "border-b border-border/30 cursor-pointer transition-colors group",
                              sel ? "bg-primary/5 border-l-2 border-l-primary" : groupSel ? "bg-blue-50" : "hover:bg-muted/40",
                              t.locked ? "bg-amber-50/40" : ""
                            )}
                          >
                            <td className="px-2 py-1.5 w-8 text-center">
                              <Checkbox
                                checked={groupSel}
                                onCheckedChange={() => toggleTripSel(t.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-1 py-1.5 w-7">
                              {(apiStatus === "Open" || apiStatus === "Optimised") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteTrip(t.id); }}
                                  title="Delete trip"
                                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-input bg-white text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all duration-200 shadow-sm"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                role="radio"
                                aria-checked={sel}
                                onClick={(e) => { e.stopPropagation(); if (sel) { setSelectedTripId(null); clearDraft(); } else { selectTrip(t); } }}
                                title={sel ? "Selected — showing on map" : "Preview on map"}
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                                  sel
                                    ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                                    : "border-slate-300 bg-white hover:border-primary hover:bg-primary/5"
                                )}
                              >
                                {sel && <span className="w-2 h-2 rounded-full bg-primary" />}
                              </button>
                            </td>
                            <td className="px-2 py-1.5 font-mono text-xs text-primary font-semibold whitespace-nowrap">
                              {t.tripCode ?? t.id.slice(-12)}
                            </td>
                            <td className="px-2 py-1.5">
                              {(() => {
                                const s = String(apiStatus ?? t.status).toLowerCase();
                                // Disabled only for the two pre-lock statuses
                                // (Open/Optimised) — everything from Locked
                                // onward should be viewable. Was previously
                                // an allowlist of just "locked"/"validated",
                                // which silently broke the moment "Validated"
                                // was renamed to "To Allocate" and never
                                // recognized Confirmed/Loaded/Checked-In/
                                // Checked-Out at all.
                                const disabled = !s || s === "open" || s === "optimised" || s === "optimized";
                                const enabled = !disabled;
                                return (
                                  <button
                                    disabled={!enabled}
                                    className={cn(
                                      "flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-200 shadow-sm",
                                      enabled
                                        ? "border-input bg-white text-sky-600 hover:bg-sky-50 hover:border-sky-200 cursor-pointer"
                                        : "border-input bg-gray-50 text-gray-300 cursor-not-allowed opacity-60"
                                    )}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!enabled) return;
                                      setDetailTripId(t.id);
                                      setView("detail");
                                      setVrHeader(null);
                                      setVrDetails([]);
                                      setVrLoadStock([]);
                                      if (t.tripCode) {
                                        setVrLoading(true);
                                        try {
                                          const [header, details, loadStock] = await Promise.all([
                                            transportApi.getVrHeader(t.tripCode).catch(() => null),
                                            transportApi.getVrDetails(t.tripCode).catch(() => []),
                                            transportApi.getVrLoadStock(t.tripCode).catch(() => []),
                                          ]);
                                          setVrHeader(header);
                                          setVrDetails(details ?? []);
                                          setVrLoadStock(loadStock ?? []);
                                        } catch (err: any) {
                                          toast({ title: "Failed to load route detail", description: err?.message ?? "Unknown error", variant: "destructive" });
                                        } finally {
                                          setVrLoading(false);
                                        }
                                      }
                                    }}
                                    title={enabled ? "Route Management Detail" : "Available after lock"}
                                  >
                                    <Info className="w-5 h-5" />
                                  </button>
                                );
                              })()}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className={cn("text-[9px] px-2 py-0.5 rounded font-bold", statusColor(t.status))}>
                                {String(apiStatus ?? t.status).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 font-mono font-bold text-xs">{t.vehicle.code}</td>
                            <td className="px-2 py-1.5 text-xs">{t.driver.name}</td>
                            <td className="px-2 py-1.5 text-xs font-mono text-center">{t.stops.length}</td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <button onClick={(e) => { e.stopPropagation(); lockTrip(t.id); }}
                                  title={t.locked ? "Unlock" : "Lock"}
                                  className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border shadow-sm bg-white",
                                    t.locked
                                      ? "border-amber-200 text-amber-600 hover:bg-amber-50 hover:shadow-amber-500/15"
                                      : "border-input text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                                  )}>
                                  {t.locked
                                    ? <Lock className="w-5 h-5 text-amber-600" />
                                    : <Unlock className="w-5 h-5 text-slate-500" />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); validateTrip(t.id); }}
                                  title="Validate"
                                  className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border shadow-sm bg-white",
                                    isAtLeastToAllocate(t.optiStatus)
                                      ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:shadow-emerald-500/15"
                                      : "border-input text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                                  )}>
                                  <ShieldCheck className={cn("w-5 h-5", isAtLeastToAllocate(t.optiStatus) ? "text-emerald-600" : "text-slate-500")} />
                                </button>
                              </div>
                            </td>


                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>
            }
            right={
              <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col h-full min-h-0">
                <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center gap-2 flex-shrink-0">
                  <h3 className="text-sm font-semibold">Route Preview</h3>
                  <div className={cn("flex items-center gap-0.5 border border-border rounded-md p-0.5 ml-auto")}>
                    <button onClick={() => setTripView("map")}
                      className={cn("h-6 px-2 text-xs rounded flex items-center gap-1 transition-colors",
                        tripView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                      <MapIcon className="w-3 h-3" /> Map
                    </button>
                    <button onClick={() => setTripView("list")}
                      className={cn("h-6 px-2 text-xs rounded flex items-center gap-1 transition-colors",
                        tripView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                      <List className="w-3 h-3" /> List View
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {tripView === "map" ? <RouteMapView trip={selectedTrip} site={sites.find(s => s.siteCode === site) ?? null} sites={sites} /> : <TripStopListView trip={selectedTrip} locked={selectedTrip ? !canEditTrip(selectedTrip) : false} onReorder={selectedTrip && canEditTrip(selectedTrip) ? (newStops) => reorderTripStops(selectedTrip, newStops) : undefined} onDeleteStop={selectedTrip ? (docNum) => handleDeleteStopFromListView(selectedTrip, docNum) : undefined} onViewProducts={(stop) => setProductDetailsStop(stop)} />}
                </div>
              </div>
            }
          />
          </div>
          </div>
        </div>
      )}
    </div>

    {/* ── AUTO TRIP GENERATION MODAL ───────────────────── */}
    <AnimatePresence>
      {showAutoGen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1200] bg-black/50 flex items-center justify-center p-4"
          onClick={() => !agSubmitting && setShowAutoGen(false)}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-[1400px] max-h-[92vh] flex flex-col overflow-hidden"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-600 text-white flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold tracking-tight">
                Auto Trip Generation : Please select Vehicles, Drivers and Documents
              </h2>
              <button
                onClick={() => !agSubmitting && setShowAutoGen(false)}
                disabled={agSubmitting}
                className="flex-shrink-0 rounded-md p-1 text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-5 bg-slate-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* ─── LEFT: Vehicles / Drivers ─── */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex justify-between">
                    <span>Selected Vehicles: <b className="text-slate-900">{agVehSel.size}</b></span>
                    <span>Selected Drivers: <b className="text-slate-900">{agDrvSel.size}</b></span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-800">Vehicles</h3>
                    {agTab === "vehicles" && (
                      <select
                        value={agVehClass}
                        onChange={(e) => setAgVehClass(e.target.value)}
                        className="h-8 px-2 text-xs rounded border border-slate-300 bg-white min-w-[180px]"
                      >
                        <option value="">Vehicle Category</option>
                        {agVehicleClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                  </div>


                  <div className="px-4 pt-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                        <button
                          onClick={() => setAgTab("vehicles")}
                          className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors",
                            agTab === "vehicles" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                        >Vehicles</button>
                        <button
                          onClick={() => setAgTab("drivers")}
                          className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors",
                            agTab === "drivers" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                        >Drivers</button>
                      </div>
                      {agTab === "vehicles" && (
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={agExcludeScheduled}
                            onChange={(e) => setAgExcludeScheduled(e.target.checked)}
                          />
                          Exclude Scheduled vehicles?
                        </label>
                      )}
                    </div>
                    <input
                      placeholder="Search..."
                      value={agVehSearch}
                      onChange={(e) => setAgVehSearch(e.target.value)}
                      className="h-8 px-3 text-xs rounded border border-slate-300 bg-white w-[200px]"
                    />
                  </div>


                  <div className="px-4 py-3 max-h-[42vh] overflow-auto">
                    {agTab === "vehicles" ? (
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-2 py-2 text-left w-8">
                              <input
                                type="checkbox"
                                checked={agFilteredVehicles.length > 0 && agFilteredVehicles.every(v => agVehSel.has(v.code))}
                                onChange={() => agToggleAll(agFilteredVehicles.map(v => v.code), agVehSel, setAgVehSel)}
                              />
                            </th>
                            <th className="px-2 py-2 text-left">Vehicle Code</th>
                            <th className="px-2 py-2 text-left">Vehicle Name</th>
                            <th className="px-2 py-2 text-left">Vehicle Category</th>
                            <th className="px-2 py-2 text-left">Driver</th>
                            <th className="px-2 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agFilteredVehicles.map(v => {
                            const planned = agPlannedVehicleCodes.has(v.code);
                            return (
                            <tr key={v.code} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-2 py-1.5">
                                <input type="checkbox" checked={agVehSel.has(v.code)} onChange={() => agToggle(agVehSel, setAgVehSel, v.code)} />
                              </td>
                              <td className="px-2 py-1.5 font-mono">{v.code}</td>
                              <td className="px-2 py-1.5">{v.vehicleNo}</td>
                              <td className="px-2 py-1.5">{v.category}</td>
                              <td className="px-2 py-1.5">
  {assignedDriverByVehicle.get(v.code)
    ? <span>
        {assignedDriverByVehicle.get(v.code)!.driverId}
      </span>
    : <span>—</span>}
</td>
                              <td className="px-2 py-1.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                                  planned ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", planned ? "bg-amber-500" : "bg-emerald-500")} />
                                  {planned ? "Planned" : "Not Planned"}
                                </span>
                              </td>
                            </tr>
                          );})}
                          {agFilteredVehicles.length === 0 && (
                            <tr><td colSpan={6} className="px-2 py-6 text-center text-slate-400">No vehicles</td></tr>
                          )}

                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-2 py-2 text-left w-8">
                              <input
                                type="checkbox"
                                checked={agFilteredDrivers.length > 0 && agFilteredDrivers.every(d => agDrvSel.has(d.id))}
                                onChange={() => agToggleAll(agFilteredDrivers.map(d => d.id), agDrvSel, setAgDrvSel)}
                              />
                            </th>
                            <th className="px-2 py-2 text-left">Driver Code</th>
                            <th className="px-2 py-2 text-left">Driver Name</th>
                            <th className="px-2 py-2 text-left">License</th>
                            <th className="px-2 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agFilteredDrivers.map(d => (
                            <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-2 py-1.5">
                                <input type="checkbox" checked={agDrvSel.has(d.id)} onChange={() => agToggle(agDrvSel, setAgDrvSel, d.id)} />
                              </td>
                              <td className="px-2 py-1.5 font-mono">{d.id}</td>
                              <td className="px-2 py-1.5">{d.name}</td>
                              <td className="px-2 py-1.5">{d.license || "—"}</td>
                              <td className="px-2 py-1.5">{d.status}</td>
                            </tr>
                          ))}
                          {agFilteredDrivers.length === 0 && (
                            <tr><td colSpan={5} className="px-2 py-6 text-center text-slate-400">No drivers</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* ─── RIGHT: Documents ─── */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex justify-between">
                    <span>Selected Drops: <b className="text-slate-900">{agDropSel.size}</b></span>
                    <span>Selected Pickups: <b className="text-slate-900">{agPickSel.size}</b></span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-800">Documents</h3>
                    <div className="flex items-end gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Start Date</label>
                        <input type="date" value={agStartDate} max={agEndDate || undefined} onChange={(e) => setAgStartDate(e.target.value)}
                          className={cn("h-8 px-2 text-xs rounded border bg-white", agDateInvalid ? "border-red-500" : "border-slate-300")} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">End Date</label>
                        <input type="date" value={agEndDate} min={agStartDate || undefined} onChange={(e) => setAgEndDate(e.target.value)}
                          className={cn("h-8 px-2 text-xs rounded border bg-white", agDateInvalid ? "border-red-500" : "border-slate-300")} />
                      </div>
                      <select value={agRouteCode} onChange={(e) => setAgRouteCode(e.target.value)}
                        className="h-8 px-2 text-xs rounded border border-slate-300 bg-white min-w-[140px]">
                        <option value="">Route Code</option>
                        {routeCodes.map(rc => <option key={rc} value={rc}>{rc}</option>)}
                      </select>
                    </div>
                    {agDateInvalid && (
                      <div className="w-full text-[11px] text-red-600">Start Date cannot be after End Date.</div>
                    )}
                  </div>


                  <div className="px-4 pt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                      <button
                        onClick={() => setAgDocTab("deliveries")}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors",
                          agDocTab === "deliveries" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                      >Deliveries</button>
                      <button
                        onClick={() => setAgDocTab("pickups")}
                        className={cn("px-3 py-1.5 text-xs font-medium rounded transition-colors",
                          agDocTab === "pickups" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                      >Pickups</button>
                    </div>
                    <input
                      placeholder="Search..."
                      value={agDocSearch}
                      onChange={(e) => setAgDocSearch(e.target.value)}
                      className="h-8 px-3 text-xs rounded border border-slate-300 bg-white w-[200px]"
                    />
                  </div>

                  <div className="px-4 py-3 max-h-[42vh] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="px-2 py-2 text-left w-8">
                            <input
                              type="checkbox"
                              checked={
                                agFilteredDocs.length > 0 &&
                                agFilteredDocs.every(s => (agDocTab === "deliveries" ? agDropSel : agPickSel).has(s.id))
                              }
                              onChange={() => agToggleAll(
                                agFilteredDocs.map(s => s.id),
                                agDocTab === "deliveries" ? agDropSel : agPickSel,
                                agDocTab === "deliveries" ? setAgDropSel : setAgPickSel,
                              )}
                            />
                          </th>
                          <th className="px-2 py-2 text-left">Document Number</th>
                          <th className="px-2 py-2 text-left">Client Code</th>
                          <th className="px-2 py-2 text-left">Client Name</th>
                          <th className="px-2 py-2 text-left">Route Code</th>
                          <th className="px-2 py-2 text-left">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agFilteredDocs.map(s => {
                          const sel = agDocTab === "deliveries" ? agDropSel : agPickSel;
                          const setSel = agDocTab === "deliveries" ? setAgDropSel : setAgPickSel;
                          return (
                            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-2 py-1.5">
                                <input type="checkbox" checked={sel.has(s.id)} onChange={() => agToggle(sel, setSel, s.id)} />
                              </td>
                              <td className="px-2 py-1.5 font-mono">{s.txn}</td>
                              <td className="px-2 py-1.5">{s.bpcode}</td>
                              <td className="px-2 py-1.5">{s.client}</td>
                              <td className="px-2 py-1.5">{s.routeCode || "—"}</td>
                              <td className="px-2 py-1.5">{s.doctype}</td>
                            </tr>
                          );
                        })}
                        {agFilteredDocs.length === 0 && (
                          <tr><td colSpan={6} className="px-2 py-6 text-center text-slate-400">No documents</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
              {agCanSubmit && (
                <button
                  onClick={agClear}
                  disabled={agSubmitting}
                  className="px-5 h-9 rounded-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                >Clear</button>
              )}
              <button
                onClick={agSubmit}
                disabled={!agCanSubmit || agSubmitting}
                className={cn(
                  "px-5 h-9 rounded-full text-xs font-semibold text-white transition-colors",
                  agCanSubmit && !agSubmitting
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow"
                    : "bg-slate-300 cursor-not-allowed"
                )}
              >{agSubmitting ? "Submitting..." : "Submit"}</button>
              <button
                onClick={() => !agSubmitting && setShowAutoGen(false)}
                disabled={agSubmitting}
                className="px-5 h-9 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Lock in progress — blocking overlay so it's unmistakable the app
        is working, not stuck. Lock can now take up to 20s (waiting on
        the X3 push) instead of returning near-instantly like every
        other action here. */}
    {lockingInfo && (
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
        <div className="bg-card rounded-2xl border border-border shadow-2xl px-8 py-7 flex flex-col items-center gap-3 max-w-sm text-center">
          <Loader2 className="w-9 h-9 text-primary animate-spin" />
          <p className="text-sm font-semibold text-foreground">Locking trip {lockingInfo.tripCode}…</p>
          <p className="text-xs text-muted-foreground">This can take up to 20 seconds while document details sync to X3.</p>
        </div>
      </div>
    )}

    {/* Confirmation dialog (vehicle/driver reassign etc.) */}
    <AlertDialog
      open={!!confirmDialog?.open}
      onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDialog?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const fn = confirmDialog?.onConfirm;
              setConfirmDialog(null);
              if (fn) await fn();
            }}
          >
            {confirmDialog?.confirmLabel ?? "Yes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* ── VROOM Error Popup (inline Zap + Auto Generate) ── */}
    <ProductDetailsDialog
      stop={productDetailsStop}
      open={!!productDetailsStop}
      onOpenChange={(open) => { if (!open) setProductDetailsStop(null); }}
    />

    {vroomError && (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center"
        style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
        onClick={() => setVroomError(null)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: 400, fontFamily: "Inter, system-ui, sans-serif" }}
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <p className="text-[13px] font-bold text-white flex-1">{vroomError.title}</p>
            <button onClick={() => setVroomError(null)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            <p className="text-[12px] text-gray-700 whitespace-pre-line leading-relaxed">
              {vroomError.detail}
            </p>
          </div>
          <div className="px-5 pb-4 flex justify-end">
            <button onClick={() => setVroomError(null)}
              className="px-5 py-2 rounded-lg text-[12px] font-bold bg-red-600 hover:bg-red-700 text-white transition-colors">
              OK
            </button>
          </div>
        </motion.div>
      </div>
    )}

  </>
  );
}

