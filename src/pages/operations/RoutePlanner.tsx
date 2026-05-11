import { useMemo, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import {
  Truck, Container, Users, Calendar as CalIcon, ChevronLeft, ChevronRight,
  RefreshCw, Lock, Unlock, CheckCheck, Trash2, Route as RouteIcon,
  PackageCheck, PackageX, ArrowDownToLine, ArrowUpFromLine,
  Search, Map as MapIcon, List, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// ---------- Sample data ----------
type Vehicle = { code: string; no: string; departure: string; arrival: string; driver: string; sideOp: string; trailer: string; category: string; start: string; tone: "warm" | "cool" };
const sampleVehicles: Vehicle[] = [
  { code: "115", no: "AY601W", departure: "KCC01", arrival: "KCC01", driver: "", sideOp: "No", trailer: "FRP19", category: "BOBTAIL", start: "07:00", tone: "warm" },
  { code: "118", no: "AZ472B", departure: "KCC01", arrival: "KCC01", driver: "", sideOp: "No", trailer: "FRP2", category: "BOBTAIL", start: "07:00", tone: "warm" },
  { code: "91",  no: "AN846Y", departure: "KCC01", arrival: "KCC01", driver: "", sideOp: "No", trailer: "4000", category: "BOBTAIL", start: "07:00", tone: "warm" },
  { code: "113", no: "AX267P", departure: "KCC01", arrival: "KCC01", driver: "", sideOp: "No", trailer: "", category: "BOBTAIL", start: "00:01", tone: "cool" },
  { code: "109", no: "AW107G", departure: "KCC01", arrival: "KCC01", driver: "Dan Taylor", sideOp: "No", trailer: "", category: "BOXTRUCK", start: "00:01", tone: "cool" },
];

type Trailer = { code: string; no: string; type: string; capacity: string };
const sampleTrailers: Trailer[] = [
  { code: "FRP19", no: "T-FRP19", type: "Reefer", capacity: "26 pal" },
  { code: "FRP2",  no: "T-FRP2",  type: "Reefer", capacity: "26 pal" },
  { code: "4000",  no: "T-4000",  type: "Dry",    capacity: "30 pal" },
];

type Driver = { id: string; name: string; license: string; status: string };
const sampleDrivers: Driver[] = [
  { id: "DR-01", name: "Dan Taylor",  license: "CDL-A", status: "Available" },
  { id: "DR-02", name: "John Carter", license: "CDL-A", status: "Available" },
  { id: "DR-03", name: "Sarah Miles", license: "CDL-B", status: "On Trip" },
];

type Doc = { txn: string; prep: string; paired: string; type: "DELIVERY" | "PICKUP"; address: string; routeCode: string; priority: "High" | "Med" | "Low"; client: string; city: string; site: string; vehicle: string; deliverable: boolean };
const sampleDocs: Doc[] = [
  { txn: "ORD-2810", prep: "PRP-001", paired: "-", type: "DELIVERY", address: "12 Wilmington Ave",  routeCode: "RC-N1", priority: "High", client: "Acme Co",     city: "Wilmington",  site: "KCC01", vehicle: "", deliverable: true },
  { txn: "ORD-2811", prep: "PRP-002", paired: "-", type: "DELIVERY", address: "88 Newark Plaza",    routeCode: "RC-N1", priority: "Med",  client: "Bright Ltd",  city: "Newark",      site: "KCC01", vehicle: "", deliverable: true },
  { txn: "ORD-2812", prep: "PRP-003", paired: "-", type: "DELIVERY", address: "5 Glasgow Rd",       routeCode: "RC-N2", priority: "Low",  client: "Northern",    city: "Glasgow",     site: "KCC01", vehicle: "", deliverable: false },
  { txn: "ORD-2813", prep: "PRP-004", paired: "-", type: "PICKUP",   address: "Port Terminal B",    routeCode: "RC-S1", priority: "High", client: "Harbor Co",   city: "Wilmington",  site: "KCC01", vehicle: "", deliverable: true },
  { txn: "ORD-2814", prep: "PRP-005", paired: "-", type: "PICKUP",   address: "9 Glassboro Way",    routeCode: "RC-S2", priority: "Med",  client: "South Inc",   city: "Glassboro",   site: "KCC01", vehicle: "", deliverable: true },
];

type Tour = { vehicle: string; driver: string; trailer: string; departure: string; arrival: string; seq: number; travelTime: string; distance: string; weight: string; vol: string; qty: string; pickups: number; deliveries: number; stops: number; forced: boolean; comments: string; tripSeq: string };

// ---------- Quick action button ----------
function QuickAction({ icon: Icon, color, label, onClick }: { icon: typeof Truck; color: string; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm hover:opacity-90 hover:scale-105 transition-all",
        color
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ---------- KPI card ----------
function KpiCard({ title, value, icon: Icon, gradient, index }: { title: string; value: number | string; icon: typeof Truck; gradient: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={cn(
        "relative rounded-xl px-4 py-3 text-white shadow-md overflow-hidden",
        gradient
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/85 truncate">{title}</p>
          <p className="text-2xl font-bold mt-1 leading-none">{value}</p>
        </div>
        <Icon className="w-5 h-5 text-white/85 flex-shrink-0" />
      </div>
    </motion.div>
  );
}

// ---------- Main page ----------
export default function RoutePlanner() {
  const [site, setSite] = useState("KCC01");
  const [date, setDate] = useState("2026-05-11");
  const [routeCode, setRouteCode] = useState("all");

  // selection
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // Active tour (assigned)
  const [tours, setTours] = useState<Tour[]>([]);
  const [assignedDocs, setAssignedDocs] = useState<Record<string, string>>({}); // docTxn -> vehicleCode

  // doc filters
  const [docTab, setDocTab] = useState<"deliveries" | "pickups">("deliveries");
  const [showDeliverable, setShowDeliverable] = useState(false);
  const [showNotDeliverable, setShowNotDeliverable] = useState(false);
  const [toPlanOnly, setToPlanOnly] = useState(false);
  const [docSearch, setDocSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [bottomView, setBottomView] = useState<"map" | "list">("map");

  // ---------- Derived ----------
  const filteredDocs = useMemo(() => {
    return sampleDocs.filter((d) => {
      if (docTab === "deliveries" && d.type !== "DELIVERY") return false;
      if (docTab === "pickups" && d.type !== "PICKUP") return false;
      if (showDeliverable && !d.deliverable) return false;
      if (showNotDeliverable && d.deliverable) return false;
      if (toPlanOnly && assignedDocs[d.txn]) return false;
      if (docSearch && !`${d.txn} ${d.address} ${d.client}`.toLowerCase().includes(docSearch.toLowerCase())) return false;
      if (routeCode !== "all" && d.routeCode !== routeCode) return false;
      return true;
    });
  }, [docTab, showDeliverable, showNotDeliverable, toPlanOnly, docSearch, routeCode, assignedDocs]);

  const filteredVehicles = useMemo(() => {
    return sampleVehicles.filter((v) =>
      !vehicleSearch || `${v.code} ${v.no} ${v.driver} ${v.trailer}`.toLowerCase().includes(vehicleSearch.toLowerCase())
    );
  }, [vehicleSearch]);

  const kpis = useMemo(() => {
    const assignedCount = Object.keys(assignedDocs).length;
    const nonAssignedCount = sampleDocs.length - assignedCount;
    const deliveries = sampleDocs.filter(d => d.type === "DELIVERY").length;
    const pickups = sampleDocs.filter(d => d.type === "PICKUP").length;
    return {
      vehicles: new Set(Object.values(assignedDocs)).size,
      trips: tours.length,
      assigned: assignedCount,
      nonAssigned: nonAssignedCount,
      deliveryQty: deliveries,
      pickupQty: pickups,
    };
  }, [assignedDocs, tours]);

  // ---------- Assignment ----------
  function assignDocsToVehicle(docTxns: string[], vehicleCode: string) {
    if (!docTxns.length) return;
    setAssignedDocs((prev) => {
      const next = { ...prev };
      docTxns.forEach((t) => (next[t] = vehicleCode));
      return next;
    });
    // create / update tour
    setTours((prev) => {
      const veh = sampleVehicles.find((v) => v.code === vehicleCode);
      if (!veh) return prev;
      const existing = prev.find((t) => t.vehicle === vehicleCode);
      const newDocs = docTxns.map((t) => sampleDocs.find((d) => d.txn === t)!).filter(Boolean);
      const pickups = newDocs.filter((d) => d.type === "PICKUP").length;
      const deliveries = newDocs.filter((d) => d.type === "DELIVERY").length;
      if (existing) {
        return prev.map((t) =>
          t.vehicle === vehicleCode
            ? { ...t, pickups: t.pickups + pickups, deliveries: t.deliveries + deliveries, stops: t.stops + newDocs.length, qty: String(t.stops + newDocs.length) }
            : t
        );
      }
      const tour: Tour = {
        vehicle: veh.no, driver: veh.driver || "—", trailer: veh.trailer || "—",
        departure: veh.departure, arrival: veh.arrival, seq: prev.length + 1,
        travelTime: "01:45", distance: "82 km", weight: "1.2 t", vol: "12 m³",
        qty: String(newDocs.length), pickups, deliveries, stops: newDocs.length,
        forced: false, comments: "", tripSeq: `T-${prev.length + 1}`,
      };
      return [...prev, tour];
    });
    setSelectedDocs([]);
    toast({ title: "Documents assigned", description: `${docTxns.length} document(s) → vehicle ${vehicleCode}` });
  }

  function clearAssignments() {
    setTours([]);
    setAssignedDocs({});
    setSelectedDocs([]);
    toast({ title: "Cleared", description: "All assignments removed" });
  }

  function handleDocDrop(e: DragEvent, vehicleCode: string) {
    e.preventDefault();
    const txn = e.dataTransfer.getData("text/doc-txn");
    if (txn) assignDocsToVehicle([txn], vehicleCode);
  }

  function handleClickAssign() {
    if (!selectedVehicle) {
      toast({ title: "Select a vehicle first", description: "Click a vehicle row, then click documents to assign." });
      return;
    }
    if (!selectedDocs.length) {
      toast({ title: "No documents selected", description: "Tick documents from the right panel." });
      return;
    }
    assignDocsToVehicle(selectedDocs, selectedVehicle);
  }

  return (
    <div className="p-4 lg:p-5 space-y-4 bg-background min-h-full">
      {/* ---------- Filter / Toolbar ---------- */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border/60 shadow-sm p-3 flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Site</label>
          <Select value={site} onValueChange={setSite}>
            <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="KCC01">KCC01</SelectItem>
              <SelectItem value="KCC02">KCC02</SelectItem>
              <SelectItem value="WH-A">WH-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</label>
          <div className="relative">
            <CalIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 pl-7 pr-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Route Codes</label>
          <Select value={routeCode} onValueChange={setRouteCode}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All routes</SelectItem>
              <SelectItem value="RC-N1">RC-N1</SelectItem>
              <SelectItem value="RC-N2">RC-N2</SelectItem>
              <SelectItem value="RC-S1">RC-S1</SelectItem>
              <SelectItem value="RC-S2">RC-S2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pl-2 ml-auto">
          <QuickAction icon={CheckCheck} color="bg-blue-500" label="Auto-assign" onClick={handleClickAssign} />
          <QuickAction icon={RouteIcon} color="bg-slate-600" label="Optimize route" />
          <QuickAction icon={Lock} color="bg-emerald-500" label="Lock tour" />
          <QuickAction icon={Unlock} color="bg-violet-500" label="Unlock tour" />
          <QuickAction icon={CheckCheck} color="bg-amber-500" label="Validate" />
          <QuickAction icon={Trash2} color="bg-rose-500" label="Clear" onClick={clearAssignments} />
          <Button size="sm" className="h-9">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* ---------- KPIs ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Vehicles"   value={kpis.vehicles}    icon={Truck}            gradient="bg-gradient-to-br from-slate-500 to-slate-700"   index={0} />
        <KpiCard title="Trips"      value={kpis.trips}       icon={RouteIcon}        gradient="bg-gradient-to-br from-indigo-500 to-indigo-700" index={1} />
        <KpiCard title="Assigned Documents"     value={kpis.assigned}    icon={PackageCheck}     gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" index={2} />
        <KpiCard title="Non-Assigned Documents" value={kpis.nonAssigned} icon={PackageX}         gradient="bg-gradient-to-br from-amber-500 to-amber-600"     index={3} />
        <KpiCard title="Total Delivery Qty"     value={kpis.deliveryQty} icon={ArrowDownToLine}  gradient="bg-gradient-to-br from-rose-500 to-rose-600"       index={4} />
        <KpiCard title="Total Pickup Qty"       value={kpis.pickupQty}   icon={ArrowUpFromLine}  gradient="bg-gradient-to-br from-sky-500 to-sky-600"         index={5} />
      </div>

      {/* ---------- Two columns: resources + documents ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Vehicles / Trailers / Drivers */}
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <Tabs defaultValue="vehicles">
            <div className="border-b border-border/60 px-3 pt-2">
              <TabsList className="bg-transparent h-9 p-0 gap-1">
                <TabsTrigger value="vehicles" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md text-xs"><Truck className="w-3.5 h-3.5 mr-1.5" />Vehicles</TabsTrigger>
                <TabsTrigger value="trailers" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md text-xs"><Container className="w-3.5 h-3.5 mr-1.5" />Trailers</TabsTrigger>
                <TabsTrigger value="drivers"  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md text-xs"><Users className="w-3.5 h-3.5 mr-1.5" />Drivers</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-3">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} placeholder="Search..." className="h-8 pl-8 text-sm" />
              </div>

              <TabsContent value="vehicles" className="m-0">
                <div className="overflow-auto max-h-[280px] rounded-md border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr className="text-left text-muted-foreground">
                        {["Vehicle", "No", "Departure", "Arrival", "Driver", "Side Op", "Trailer", "Category", "Start"].map((h) => (
                          <th key={h} className="px-2.5 py-2 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map((v) => {
                        const selected = selectedVehicle === v.code;
                        const isAssigned = Object.values(assignedDocs).includes(v.code);
                        return (
                          <tr
                            key={v.code}
                            onClick={() => setSelectedVehicle(selected ? null : v.code)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDocDrop(e, v.code)}
                            className={cn(
                              "cursor-pointer transition-colors border-t border-border/40",
                              v.tone === "warm" ? "bg-amber-50 hover:bg-amber-100" : "bg-cyan-50 hover:bg-cyan-100",
                              selected && "ring-2 ring-inset ring-primary",
                              isAssigned && "outline outline-1 outline-emerald-400/60"
                            )}
                          >
                            <td className="px-2.5 py-1.5 font-mono font-medium text-foreground">{v.code}</td>
                            <td className="px-2.5 py-1.5 font-mono">{v.no}</td>
                            <td className="px-2.5 py-1.5">{v.departure}</td>
                            <td className="px-2.5 py-1.5">{v.arrival}</td>
                            <td className="px-2.5 py-1.5">{v.driver || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-2.5 py-1.5">{v.sideOp}</td>
                            <td className="px-2.5 py-1.5">{v.trailer || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-2.5 py-1.5">{v.category}</td>
                            <td className="px-2.5 py-1.5 font-mono">{v.start}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {selectedVehicle ? <>Selected vehicle <span className="font-mono font-semibold text-primary">{selectedVehicle}</span>. Tick documents and click the blue button or drag them onto a vehicle.</> : "Click a vehicle to select. Drop documents on it to assign."}
                </p>
              </TabsContent>

              <TabsContent value="trailers" className="m-0">
                <div className="overflow-auto max-h-[280px] rounded-md border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60"><tr className="text-left text-muted-foreground">{["Code","No","Type","Capacity"].map(h => <th key={h} className="px-2.5 py-2 font-semibold">{h}</th>)}</tr></thead>
                    <tbody>
                      {sampleTrailers.map(t => (
                        <tr key={t.code} className="border-t border-border/40 hover:bg-muted/40"><td className="px-2.5 py-1.5 font-mono font-medium">{t.code}</td><td className="px-2.5 py-1.5 font-mono">{t.no}</td><td className="px-2.5 py-1.5">{t.type}</td><td className="px-2.5 py-1.5">{t.capacity}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="drivers" className="m-0">
                <div className="overflow-auto max-h-[280px] rounded-md border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60"><tr className="text-left text-muted-foreground">{["ID","Name","License","Status"].map(h => <th key={h} className="px-2.5 py-2 font-semibold">{h}</th>)}</tr></thead>
                    <tbody>
                      {sampleDrivers.map(d => (
                        <tr key={d.id} className="border-t border-border/40 hover:bg-muted/40"><td className="px-2.5 py-1.5 font-mono font-medium">{d.id}</td><td className="px-2.5 py-1.5">{d.name}</td><td className="px-2.5 py-1.5">{d.license}</td><td className="px-2.5 py-1.5"><span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", d.status === "Available" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{d.status}</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* RIGHT: Deliveries / Pickups */}
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <Tabs value={docTab} onValueChange={(v) => setDocTab(v as typeof docTab)}>
            <div className="border-b border-border/60 px-3 pt-2 flex items-end justify-between gap-3 flex-wrap">
              <TabsList className="bg-transparent h-9 p-0 gap-1">
                <TabsTrigger value="deliveries" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md text-xs">Deliveries</TabsTrigger>
                <TabsTrigger value="pickups"    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md text-xs">Pickups</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-3 pb-2 text-xs flex-wrap">
                <label className="flex items-center gap-1.5"><Checkbox className="h-3.5 w-3.5" /> +/- 5 days</label>
                <Button size="sm" variant="outline" className="h-7 text-xs"><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
                <label className="flex items-center gap-1.5"><Checkbox checked={showDeliverable} onCheckedChange={(v) => setShowDeliverable(!!v)} className="h-3.5 w-3.5" /> Deliverable</label>
                <label className="flex items-center gap-1.5"><Checkbox checked={showNotDeliverable} onCheckedChange={(v) => setShowNotDeliverable(!!v)} className="h-3.5 w-3.5" /> Not Deliverable</label>
                <label className="flex items-center gap-1.5"><Checkbox checked={toPlanOnly} onCheckedChange={(v) => setToPlanOnly(!!v)} className="h-3.5 w-3.5" /> To Plan</label>
                <div className="flex items-center gap-1 border border-border rounded-md">
                  <button className="h-7 w-7 flex items-center justify-center hover:bg-muted"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <span className="text-xs font-mono px-1.5">{date}</span>
                  <button className="h-7 w-7 flex items-center justify-center hover:bg-muted"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={docSearch} onChange={(e) => setDocSearch(e.target.value)} placeholder="Search documents..." className="h-8 pl-8 text-sm" />
                </div>
                {selectedDocs.length > 0 && (
                  <Button size="sm" className="h-8" onClick={handleClickAssign}>
                    Assign {selectedDocs.length} → {selectedVehicle ?? "vehicle"}
                  </Button>
                )}
              </div>

              <TabsContent value={docTab} className="m-0">
                <div className="overflow-auto max-h-[280px] rounded-md border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-2 py-2 w-8"></th>
                        {["Transaction No","Preparation","Paired","Type","Delivery Address","Route Code","Priority","Client","City","Site"].map(h => (
                          <th key={h} className="px-2.5 py-2 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.length === 0 && (
                        <tr><td colSpan={11} className="px-3 py-10 text-center text-muted-foreground text-xs">No documents match the current filters.</td></tr>
                      )}
                      {filteredDocs.map((d) => {
                        const checked = selectedDocs.includes(d.txn);
                        const assignedTo = assignedDocs[d.txn];
                        return (
                          <tr
                            key={d.txn}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/doc-txn", d.txn)}
                            className={cn(
                              "border-t border-border/40 hover:bg-muted/40 cursor-grab active:cursor-grabbing",
                              checked && "bg-primary/5",
                              assignedTo && "opacity-60"
                            )}
                          >
                            <td className="px-2 py-1.5">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => setSelectedDocs((prev) => v ? [...prev, d.txn] : prev.filter(x => x !== d.txn))}
                                className="h-3.5 w-3.5"
                              />
                            </td>
                            <td className="px-2.5 py-1.5 font-mono font-medium text-primary">{d.txn}</td>
                            <td className="px-2.5 py-1.5 font-mono">{d.prep}</td>
                            <td className="px-2.5 py-1.5">{d.paired}</td>
                            <td className="px-2.5 py-1.5"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", d.type === "DELIVERY" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700")}>{d.type}</span></td>
                            <td className="px-2.5 py-1.5">{d.address}</td>
                            <td className="px-2.5 py-1.5 font-mono">{d.routeCode}</td>
                            <td className="px-2.5 py-1.5"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", d.priority === "High" ? "bg-rose-100 text-rose-700" : d.priority === "Med" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>{d.priority}</span></td>
                            <td className="px-2.5 py-1.5">{d.client}</td>
                            <td className="px-2.5 py-1.5">{d.city}</td>
                            <td className="px-2.5 py-1.5">{d.site}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* ---------- Active tour ---------- */}
      <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Active Tour</h3>
            <span className="text-[11px] text-muted-foreground">({tours.length} trip{tours.length !== 1 ? "s" : ""})</span>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                {["Vehicle","Driver","Trailer","Departure","Arrival","Seq #","Travel Time","Distance","Total Weight","Total Vol","Total Qty","Pickups","Deliveries","Stops","Forced Seq","Comments","Trip Sequence",""].map((h, i) => (
                  <th key={i} className="px-2.5 py-2 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tours.length === 0 && (
                <tr><td colSpan={18} className="px-3 py-10 text-center text-muted-foreground text-xs">No active tour. Assign documents to a vehicle to build a trip.</td></tr>
              )}
              {tours.map((t, i) => (
                <tr key={i} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-2.5 py-2 font-mono font-medium">{t.vehicle}</td>
                  <td className="px-2.5 py-2">{t.driver}</td>
                  <td className="px-2.5 py-2 font-mono">{t.trailer}</td>
                  <td className="px-2.5 py-2">{t.departure}</td>
                  <td className="px-2.5 py-2">{t.arrival}</td>
                  <td className="px-2.5 py-2 font-mono">{t.seq}</td>
                  <td className="px-2.5 py-2 font-mono">{t.travelTime}</td>
                  <td className="px-2.5 py-2 font-mono">{t.distance}</td>
                  <td className="px-2.5 py-2 font-mono">{t.weight}</td>
                  <td className="px-2.5 py-2 font-mono">{t.vol}</td>
                  <td className="px-2.5 py-2 font-mono">{t.qty}</td>
                  <td className="px-2.5 py-2 font-mono">{t.pickups}</td>
                  <td className="px-2.5 py-2 font-mono">{t.deliveries}</td>
                  <td className="px-2.5 py-2 font-mono">{t.stops}</td>
                  <td className="px-2.5 py-2">{t.forced ? "Yes" : "No"}</td>
                  <td className="px-2.5 py-2 text-muted-foreground">{t.comments || "—"}</td>
                  <td className="px-2.5 py-2 font-mono">{t.tripSeq}</td>
                  <td className="px-2.5 py-2">
                    <button
                      onClick={() => {
                        const veh = sampleVehicles.find(v => v.no === t.vehicle);
                        if (!veh) return;
                        setAssignedDocs((prev) => Object.fromEntries(Object.entries(prev).filter(([, vc]) => vc !== veh.code)));
                        setTours((prev) => prev.filter(x => x.vehicle !== t.vehicle));
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Bottom: assigned docs list + map ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
            <h3 className="text-sm font-semibold">Assigned Documents</h3>
          </div>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0">
                <tr className="text-left text-muted-foreground">
                  {["Details","Route Code","Seq #","Vehicle","Status","Lock","Validate","TMS Validation","Driver","Departure Site","Arrival Site","Document Status"].map(h => (
                    <th key={h} className="px-2.5 py-2 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(assignedDocs).length === 0 && (
                  <tr><td colSpan={12} className="px-3 py-10 text-center text-muted-foreground text-xs">No assigned documents yet.</td></tr>
                )}
                {Object.entries(assignedDocs).map(([txn, veh], i) => {
                  const d = sampleDocs.find(x => x.txn === txn)!;
                  const v = sampleVehicles.find(x => x.code === veh)!;
                  return (
                    <tr key={txn} className="border-t border-border/40 hover:bg-muted/30">
                      <td className="px-2.5 py-2 font-mono text-primary">{d.txn}</td>
                      <td className="px-2.5 py-2 font-mono">{d.routeCode}</td>
                      <td className="px-2.5 py-2 font-mono">{i + 1}</td>
                      <td className="px-2.5 py-2 font-mono">{v.no}</td>
                      <td className="px-2.5 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">Assigned</span></td>
                      <td className="px-2.5 py-2"><Unlock className="w-3.5 h-3.5 text-muted-foreground" /></td>
                      <td className="px-2.5 py-2"><CheckCheck className="w-3.5 h-3.5 text-success" /></td>
                      <td className="px-2.5 py-2 text-muted-foreground">Pending</td>
                      <td className="px-2.5 py-2">{v.driver || "—"}</td>
                      <td className="px-2.5 py-2">{d.site}</td>
                      <td className="px-2.5 py-2">{d.city}</td>
                      <td className="px-2.5 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-semibold">Open</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Map */}
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Route Map</h3>
            </div>
            <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
              <button onClick={() => setBottomView("map")} className={cn("h-6 px-2 text-[11px] rounded flex items-center gap-1", bottomView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><MapIcon className="w-3 h-3" /> Map</button>
              <button onClick={() => setBottomView("list")} className={cn("h-6 px-2 text-[11px] rounded flex items-center gap-1", bottomView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><List className="w-3 h-3" /> Satellite</button>
            </div>
          </div>
          <div className="relative h-[300px] bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50">
            {/* Decorative map */}
            <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 400 300" fill="none">
              <path d="M0,150 Q100,80 200,150 T400,140" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M0,200 Q120,260 240,200 T400,210" stroke="hsl(var(--success))" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="80" cy="120" r="3" fill="hsl(var(--primary))" />
              <circle cx="200" cy="150" r="3" fill="hsl(var(--primary))" />
              <circle cx="320" cy="140" r="3" fill="hsl(var(--primary))" />
              <circle cx="120" cy="220" r="3" fill="hsl(var(--success))" />
              <circle cx="260" cy="210" r="3" fill="hsl(var(--success))" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-center px-4">
              <div className="bg-white/80 backdrop-blur rounded-lg px-4 py-3 shadow-sm border border-border/60">
                <MapIcon className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium text-foreground">Interactive map preview</p>
                <p className="text-[11px] text-muted-foreground">Connect a maps provider to render live routes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
