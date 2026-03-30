import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/MetricCard";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Globe, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Document {
  sequence: number;
  documentNo: string;
  docType: string;
  arvTime: string;
  depTime: string;
  status: string;
}

interface RouteRecord {
  id: string;
  routeCode: string;
  vehicle: string;
  trip: number;
  driverId: string;
  carrier: string;
  site: string;
  schedDepDate: string;
  schedDepTime: string;
  schedRetDate: string;
  schedRetTime: string;
  corrDepDate: string;
  corrDepTime: string;
  corrRetDate: string;
  corrRetTime: string;
  actDepDate: string;
  actDepTime: string;
  actRetDate: string;
  actRetTime: string;
  distanceKm: number;
  timeH: number;
  documents: Document[];
}

const sampleData: RouteRecord[] = [
  { id: "1", routeCode: "XVR-260318-CAT01-001", vehicle: "GAL015", trip: 1, driverId: "hlinton", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/18/2026", schedDepTime: "07:00", schedRetDate: "03/18/2026", schedRetTime: "07:10", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "03/19/2026", actDepTime: "09:46", actRetDate: "", actRetTime: "", distanceKm: 0, timeH: 0, documents: [
    { sequence: 1, documentNo: "CAT012603PIC00061", docType: "Picking TKT", arvTime: "07:15", depTime: "07:15", status: "Scheduled" },
    { sequence: 2, documentNo: "CAT012603PIC00062", docType: "Picking TKT", arvTime: "07:30", depTime: "07:30", status: "Scheduled" },
  ]},
  { id: "2", routeCode: "XVR-260313-CAT01-001", vehicle: "GAL023", trip: 1, driverId: "darmstrong", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/13/2026", schedDepTime: "07:00", schedRetDate: "03/13/2026", schedRetTime: "09:06", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "", actDepTime: "", actRetDate: "", actRetTime: "", distanceKm: 94, timeH: 2, documents: [
    { sequence: 1, documentNo: "CAT012603PIC00050", docType: "Picking TKT", arvTime: "07:20", depTime: "07:20", status: "Completed" },
    { sequence: 2, documentNo: "CAT012603PIC00051", docType: "Picking TKT", arvTime: "07:45", depTime: "07:45", status: "Completed" },
    { sequence: 3, documentNo: "CAT012603PIC00052", docType: "Picking TKT", arvTime: "08:10", depTime: "08:10", status: "Completed" },
  ]},
  { id: "3", routeCode: "XVR-260313-CAT01-002", vehicle: "GAL001", trip: 1, driverId: "pmurray", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/13/2026", schedDepTime: "07:15", schedRetDate: "03/13/2026", schedRetTime: "08:41", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "", actDepTime: "", actRetDate: "", actRetTime: "", distanceKm: 94, timeH: 1, documents: [
    { sequence: 2, documentNo: "CAT012603PIC00055", docType: "Picking TKT", arvTime: "07:53", depTime: "07:53", status: "Scheduled" },
    { sequence: 3, documentNo: "CAT012603PIC00056", docType: "Picking TKT", arvTime: "07:53", depTime: "07:53", status: "Scheduled" },
    { sequence: 4, documentNo: "CAT012603PIC00057", docType: "Picking TKT", arvTime: "07:53", depTime: "07:53", status: "Scheduled" },
    { sequence: 5, documentNo: "CAT012603PIC00058", docType: "Picking TKT", arvTime: "07:53", depTime: "07:53", status: "Scheduled" },
    { sequence: 6, documentNo: "CAT012603PIC00059", docType: "Picking TKT", arvTime: "07:53", depTime: "07:53", status: "Scheduled" },
  ]},
  { id: "4", routeCode: "XVR-260311-CAT01-001", vehicle: "GAL002", trip: 1, driverId: "gstott", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/11/2026", schedDepTime: "00:16", schedRetDate: "03/11/2026", schedRetTime: "03:55", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "03/11/2026", actDepTime: "16:31", actRetDate: "", actRetTime: "", distanceKm: 222, timeH: 3, documents: [
    { sequence: 1, documentNo: "CAT012603PIC00040", docType: "Picking TKT", arvTime: "00:30", depTime: "00:30", status: "Completed" },
  ]},
  { id: "5", routeCode: "XVR-260311-CAT01-002", vehicle: "GAL015", trip: 1, driverId: "hlinton", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/11/2026", schedDepTime: "07:00", schedRetDate: "03/11/2026", schedRetTime: "08:48", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "", actDepTime: "", actRetDate: "", actRetTime: "", distanceKm: 92, timeH: 1, documents: [
    { sequence: 1, documentNo: "CAT012603PIC00041", docType: "Picking TKT", arvTime: "07:15", depTime: "07:15", status: "Scheduled" },
    { sequence: 2, documentNo: "CAT012603PIC00042", docType: "Picking TKT", arvTime: "07:30", depTime: "07:30", status: "Scheduled" },
  ]},
  { id: "6", routeCode: "XVR-260311-IRE01-003", vehicle: "GAL015", trip: 2, driverId: "hlinton", carrier: "INTERNAL", site: "IRE01", schedDepDate: "03/11/2026", schedDepTime: "07:00", schedRetDate: "03/11/2026", schedRetTime: "17:00", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "03/11/2026", actDepTime: "11:38", actRetDate: "03/19/2026", actRetTime: "09:43", distanceKm: 50, timeH: 7, documents: [
    { sequence: 1, documentNo: "IRE012603PIC00010", docType: "Picking TKT", arvTime: "11:50", depTime: "11:50", status: "Completed" },
    { sequence: 2, documentNo: "IRE012603PIC00011", docType: "Picking TKT", arvTime: "12:15", depTime: "12:15", status: "Completed" },
    { sequence: 3, documentNo: "IRE012603PIC00012", docType: "Picking TKT", arvTime: "13:00", depTime: "13:00", status: "Completed" },
  ]},
  { id: "7", routeCode: "XVR-260311-CAT01-004", vehicle: "GAL003", trip: 1, driverId: "srutherford", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/11/2026", schedDepTime: "07:00", schedRetDate: "03/11/2026", schedRetTime: "08:34", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "03/11/2026", actDepTime: "17:35", actRetDate: "03/11/2026", actRetTime: "17:39", distanceKm: 94, timeH: 1, documents: [
    { sequence: 1, documentNo: "CAT012603PIC00043", docType: "Picking TKT", arvTime: "07:10", depTime: "07:10", status: "Completed" },
  ]},
  { id: "8", routeCode: "XVR-260310-CAT01-001", vehicle: "GAL015", trip: 1, driverId: "hlinton", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/10/2026", schedDepTime: "07:00", schedRetDate: "03/10/2026", schedRetTime: "10:51", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "03/10/2026", actDepTime: "15:31", actRetDate: "03/10/2026", actRetTime: "15:50", distanceKm: 218, timeH: 3, documents: [
    { sequence: 1, documentNo: "CAT012603PIC00030", docType: "Picking TKT", arvTime: "07:20", depTime: "07:20", status: "Completed" },
    { sequence: 2, documentNo: "CAT012603PIC00031", docType: "Picking TKT", arvTime: "08:00", depTime: "08:00", status: "Completed" },
  ]},
  { id: "9", routeCode: "XVR-260309-IRE01-001", vehicle: "GAL002", trip: 1, driverId: "gstott", carrier: "INTERNAL", site: "IRE01", schedDepDate: "03/09/2026", schedDepTime: "00:16", schedRetDate: "03/09/2026", schedRetTime: "00:32", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "03/09/2026", actDepTime: "13:33", actRetDate: "03/09/2026", actRetTime: "13:37", distanceKm: 4, timeH: 0, documents: [
    { sequence: 1, documentNo: "IRE012603PIC00001", docType: "Picking TKT", arvTime: "13:35", depTime: "13:35", status: "Completed" },
  ]},
  { id: "10", routeCode: "XVR-260309-CAT01-002", vehicle: "GAL002", trip: 2, driverId: "gstott", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/09/2026", schedDepTime: "00:16", schedRetDate: "03/09/2026", schedRetTime: "03:15", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "03/09/2026", actDepTime: "14:33", actRetDate: "03/09/2026", actRetTime: "14:41", distanceKm: 162, timeH: 2, documents: [
    { sequence: 1, documentNo: "CAT012603PIC00020", docType: "Picking TKT", arvTime: "14:40", depTime: "14:40", status: "Completed" },
  ]},
  { id: "11", routeCode: "XVR-260308-CAT01-001", vehicle: "GAL010", trip: 1, driverId: "jbrown", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/08/2026", schedDepTime: "06:00", schedRetDate: "03/08/2026", schedRetTime: "14:00", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "03/08/2026", actDepTime: "06:15", actRetDate: "03/08/2026", actRetTime: "13:45", distanceKm: 310, timeH: 7, documents: [
    { sequence: 1, documentNo: "CAT012603PIC00010", docType: "Picking TKT", arvTime: "06:30", depTime: "06:30", status: "Completed" },
    { sequence: 2, documentNo: "CAT012603PIC00011", docType: "Picking TKT", arvTime: "07:15", depTime: "07:15", status: "Completed" },
    { sequence: 3, documentNo: "CAT012603PIC00012", docType: "Picking TKT", arvTime: "08:00", depTime: "08:00", status: "Completed" },
    { sequence: 4, documentNo: "CAT012603PIC00013", docType: "Picking TKT", arvTime: "09:30", depTime: "09:30", status: "Completed" },
  ]},
  { id: "12", routeCode: "XVR-260307-CAT01-001", vehicle: "GAL005", trip: 1, driverId: "mconnor", carrier: "INTERNAL", site: "CAT01", schedDepDate: "03/07/2026", schedDepTime: "05:30", schedRetDate: "03/07/2026", schedRetTime: "12:00", corrDepDate: "", corrDepTime: "", corrRetDate: "", corrRetTime: "", actDepDate: "03/07/2026", actDepTime: "05:45", actRetDate: "03/07/2026", actRetTime: "11:30", distanceKm: 185, timeH: 5, documents: [
    { sequence: 1, documentNo: "CAT012603PIC00001", docType: "Picking TKT", arvTime: "05:50", depTime: "05:50", status: "Completed" },
    { sequence: 2, documentNo: "CAT012603PIC00002", docType: "Picking TKT", arvTime: "06:30", depTime: "06:30", status: "Completed" },
  ]},
];

// Derive unique sites from data
const allSites = Array.from(new Set(sampleData.map((r) => r.site)));

// Derive unique months (MM/YYYY) from schedDepDate
function getMonthKey(dateStr: string) {
  const [mm, , yyyy] = dateStr.split("/");
  return `${mm}/${yyyy}`;
}
const allMonths = Array.from(new Set(sampleData.map((r) => getMonthKey(r.schedDepDate)))).sort();

export default function RouteList() {
  const [filterOpen, setFilterOpen] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null);

  // Filter state
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set(allSites));
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set(allMonths));

  const toggleSite = (site: string) => {
    setSelectedSites((prev) => {
      const next = new Set(prev);
      next.has(site) ? next.delete(site) : next.add(site);
      return next;
    });
    setCurrentPage(1);
  };

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      next.has(month) ? next.delete(month) : next.add(month);
      return next;
    });
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return sampleData.filter((r) => {
      // Site filter
      if (!selectedSites.has(r.site)) return false;
      // Month filter
      if (!selectedMonths.has(getMonthKey(r.schedDepDate))) return false;
      // Search
      if (q && ![r.routeCode, r.vehicle, r.driverId, r.carrier, r.site].some((v) => v.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [searchText, selectedSites, selectedMonths]);

  // Count per site/month for display
  const siteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sampleData.forEach((r) => { counts[r.site] = (counts[r.site] || 0) + 1; });
    return counts;
  }, []);

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sampleData.forEach((r) => {
      const k = getMonthKey(r.schedDepDate);
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openMap = (r: RouteRecord) => {
    setSelectedRoute(r);
    setMapOpen(true);
  };

  const colCount = 21;

  return (
    <div className="flex h-full">
      {/* Left Filter Panel */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-border bg-card overflow-hidden flex-shrink-0"
          >
            <div className="w-[240px] p-3 overflow-y-auto h-full">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Filters</h4>
                <button onClick={() => setFilterOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <h5 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <ChevronDown className="w-3 h-3" /> Site
                </h5>
                {allSites.map((site) => (
                  <label key={site} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary cursor-pointer text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedSites.has(site)}
                      onChange={() => toggleSite(site)}
                      className="rounded border-border"
                    />
                    {site} <span className="text-muted-foreground">({siteCounts[site] || 0})</span>
                  </label>
                ))}
              </div>

              <div>
                <h5 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <ChevronDown className="w-3 h-3" /> Scheduled Departure Date
                </h5>
                <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
                  {allMonths.map((month) => (
                    <label key={month} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary cursor-pointer text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={selectedMonths.has(month)}
                        onChange={() => toggleMonth(month)}
                        className="rounded border-border"
                      />
                      {month} <span className="text-muted-foreground">({monthCounts[month] || 0})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-4 pb-2">
          <div className="flex items-center gap-3 mb-3">
            {!filterOpen && (
              <button onClick={() => setFilterOpen(true)} className="p-1.5 rounded-md border border-border bg-card hover:bg-secondary text-muted-foreground">
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <PageHeader title="Report of VR Details" subtitle="Vehicle route detail report" />
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search route, vehicle, driver..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              />
              {searchText && (
                <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{filtered.length} results</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-4">
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground w-8"></th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Route Code</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Vehicle</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Trip</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Driver ID</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Carrier</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(120,80%,85%)]">Sched Dep Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(120,80%,85%)]">Sched Dep Time</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(120,80%,85%)]">Sched Ret Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(120,80%,85%)]">Sched Ret Time</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(30,90%,85%)]">Corr Dep Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(30,90%,85%)]">Corr Dep Time</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(30,90%,85%)]">Corr Ret Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(30,90%,85%)]">Corr Ret Time</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(195,80%,80%)]">Act Dep Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(195,80%,80%)]">Act Dep Time</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(195,80%,80%)]">Act Ret Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(195,80%,80%)]">Act Ret Time</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap">Dist (Km)</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap">Time(H)</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Map</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => (
                    <>
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={cn(
                          "border-b border-border hover:bg-muted/30 transition-colors",
                          expandedRow === r.id && "bg-muted/20"
                        )}
                      >
                        <td className="px-2 py-2">
                          <button
                            onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                            className="p-0.5 rounded hover:bg-secondary text-muted-foreground"
                          >
                            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", expandedRow === r.id && "rotate-90")} />
                          </button>
                        </td>
                        <td className="px-3 py-2 font-medium text-primary whitespace-nowrap">{r.routeCode}</td>
                        <td className="px-3 py-2 font-bold text-[hsl(120,70%,35%)] whitespace-nowrap">{r.vehicle}</td>
                        <td className="px-3 py-2 text-center font-semibold text-foreground">{r.trip}</td>
                        <td className="px-3 py-2 text-foreground whitespace-nowrap">{r.driverId}</td>
                        <td className="px-3 py-2 text-foreground">{r.carrier}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(120,80%,90%)] text-foreground whitespace-nowrap">{r.schedDepDate}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(120,80%,90%)] text-foreground">{r.schedDepTime}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(120,80%,90%)] text-foreground whitespace-nowrap">{r.schedRetDate}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(120,80%,90%)] text-foreground">{r.schedRetTime}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(30,90%,90%)] text-foreground whitespace-nowrap">{r.corrDepDate || "—"}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(30,90%,90%)] text-foreground">{r.corrDepTime || "—"}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(30,90%,90%)] text-foreground whitespace-nowrap">{r.corrRetDate || "—"}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(30,90%,90%)] text-foreground">{r.corrRetTime || "—"}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(195,80%,88%)] text-foreground whitespace-nowrap">{r.actDepDate || "—"}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(195,80%,88%)] text-foreground">{r.actDepTime || "—"}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(195,80%,88%)] text-foreground whitespace-nowrap">{r.actRetDate || "—"}</td>
                        <td className="px-3 py-2 text-center bg-[hsl(195,80%,88%)] text-foreground">{r.actRetTime || "—"}</td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{r.distanceKm}</td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{r.timeH}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => openMap(r)}
                            className="p-1 rounded-full hover:bg-primary/10 text-primary transition-colors"
                            title="View on Map"
                          >
                            <Globe className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>

                      {/* Expanded document rows */}
                      {expandedRow === r.id && (
                        <tr key={`${r.id}-docs`}>
                          <td colSpan={colCount} className="p-0">
                            <div className="bg-muted/30 border-b border-border">
                              {/* Trip summary bar */}
                              <div className="flex items-center gap-4 px-4 py-2 text-xs border-b border-border bg-muted/50">
                                <span className="font-medium text-primary">{r.routeCode}</span>
                                <span className="font-bold text-[hsl(120,70%,35%)]">{r.vehicle}</span>
                                <span className="text-foreground">{r.trip}</span>
                                <span className="text-foreground">{r.driverId}</span>
                                <span className="text-foreground">{r.carrier}</span>
                                <span className="bg-[hsl(120,80%,85%)] px-2 py-0.5 rounded text-foreground">{r.schedDepDate} {r.schedDepTime}</span>
                                <span className="bg-[hsl(120,80%,85%)] px-2 py-0.5 rounded text-foreground">{r.schedRetDate} {r.schedRetTime}</span>
                                {r.actDepDate && (
                                  <span className="bg-[hsl(195,80%,85%)] px-2 py-0.5 rounded text-foreground">{r.actDepDate} {r.actDepTime}</span>
                                )}
                              </div>
                              {/* Documents table */}
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/60">
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase">Sequence</th>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase">Document</th>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase">Doc Type</th>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase">Arv Time</th>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase">Dep Time</th>
                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.documents.map((doc) => (
                                    <tr key={doc.documentNo} className="border-t border-border hover:bg-muted/20">
                                      <td className="px-4 py-2.5 text-foreground">{doc.sequence}</td>
                                      <td className="px-4 py-2.5 text-primary font-medium">{doc.documentNo}</td>
                                      <td className="px-4 py-2.5 text-foreground">{doc.docType}</td>
                                      <td className="px-4 py-2.5 text-foreground">{doc.arvTime}</td>
                                      <td className="px-4 py-2.5 text-foreground">{doc.depTime}</td>
                                      <td className="px-4 py-2.5 text-foreground">{doc.status}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={colCount} className="px-4 py-8 text-center text-muted-foreground">
                        No routes match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-border bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Go to</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages, Number(e.target.value))))}
              className="w-12 px-1.5 py-1 border border-border rounded text-xs text-center bg-background text-foreground"
            />
            <span>View</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-1.5 py-1 border border-border rounded text-xs bg-background text-foreground"
            >
              {[10, 20, 50].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary disabled:opacity-40">|&lt;</button>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary disabled:opacity-40">&lt;</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={cn("px-2.5 py-1 text-xs border rounded", p === currentPage ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary text-foreground")}
              >
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary disabled:opacity-40">&gt;</button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary disabled:opacity-40">&gt;|</button>
          </div>
        </div>
      </div>

      {/* Map Dialog */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-4xl h-[600px] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-border bg-card">
              <h3 className="text-sm font-semibold text-foreground">
                Trip Map — {selectedRoute?.routeCode}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Vehicle: {selectedRoute?.vehicle} · Driver: {selectedRoute?.driverId} · Trip {selectedRoute?.trip} · {selectedRoute?.distanceKm} km
              </p>
            </div>
            <div className="flex-1 relative bg-muted">
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=-6.35%2C54.8%2C-6.15%2C54.9&layer=mapnik&marker=54.86%2C-6.25`}
                className="w-full h-full border-0"
                title="Route Map"
              />
              <div className="absolute top-3 right-3 bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
                <div className="text-[11px] space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[hsl(30,90%,50%)]" />
                    <span className="text-foreground font-medium">Depot (Start)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[hsl(330,80%,55%)]" />
                    <span className="text-foreground font-medium">Delivery Stops</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="text-muted-foreground">
                    Distance: <span className="font-mono font-medium text-foreground">{selectedRoute?.distanceKm} km</span>
                  </div>
                  <div className="text-muted-foreground">
                    Duration: <span className="font-mono font-medium text-foreground">{selectedRoute?.timeH} hrs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
