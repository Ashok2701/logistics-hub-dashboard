import { useState, useMemo, useEffect } from "react";
import { fetchLiveReport } from "@/lib/reportsApi";
import { fetchTmsSites } from "@/lib/routePlannerApi";
import { PageHeader, StatusBadge } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
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


// Derive unique months (MM/YYYY) from schedDepDate
function getMonthKey(dateStr: string) {
  const [mm, , yyyy] = dateStr.split("/");
  return `${mm}/${yyyy}`;
}

// MM/YYYY keys sorted by year first, then month.
const monthSortKey = (k: string) => { const [mm, yyyy] = k.split("/"); return `${yyyy}${mm}`; };

export default function RouteList() {
  const [filterOpen, setFilterOpen] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null);

  // Real routes (trips) from the database
  const [data, setData] = useState<RouteRecord[]>([]);
  const [siteList, setSiteList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sites and months come from the data, so every site and every month that has routes is listed.
  const allSites = useMemo(
    () => Array.from(new Set([...siteList, ...data.map((r) => r.site)])).filter(Boolean).sort(),
    [siteList, data]
  );
  const allMonths = useMemo(
    () => Array.from(new Set(data.map((r) => getMonthKey(r.schedDepDate)))).filter((k) => k.includes("/")).sort((a, b) => monthSortKey(a).localeCompare(monthSortKey(b))),
    [data]
  );

  // Filter state (everything selected until the user narrows it)
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTmsSites().then((rows) => setSiteList(rows.map((r) => r.siteCode))).catch(() => setSiteList([]));
  }, []);

  // Last 18 months up to the end of next month, so older and upcoming routes are all there.
  useEffect(() => {
    const fmtIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 18, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchLiveReport<RouteRecord[]>("routes", null, fmtIso(from), fmtIso(to))
      .then((rows) => {
        if (cancelled) return;
        setData(rows);
        setSelectedSites(new Set(rows.map((r) => r.site)));
        setSelectedMonths(new Set(rows.map((r) => getMonthKey(r.schedDepDate))));
      })
      .catch((e) => { if (!cancelled) { setData([]); setLoadError(String(e?.message ?? e)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
    return data.filter((r) => {
      // Site filter
      if (!selectedSites.has(r.site)) return false;
      // Month filter
      if (!selectedMonths.has(getMonthKey(r.schedDepDate))) return false;
      // Search
      if (q && ![r.routeCode, r.vehicle, r.driverId, r.carrier, r.site].some((v) => v.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data, searchText, selectedSites, selectedMonths]);

  // Count per site/month for display
  const siteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((r) => { counts[r.site] = (counts[r.site] || 0) + 1; });
    return counts;
  }, [data]);

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      const k = getMonthKey(r.schedDepDate);
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [data]);

  const sort = useSortable(filtered);
  const totalPages = Math.max(1, Math.ceil(sort.sorted.length / pageSize));
  const paginated = sort.sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            {loading && <p className="text-xs text-muted-foreground mt-1">Loading…</p>}
            {loadError && <p className="text-xs text-destructive mt-1">Could not load routes: {loadError}</p>}
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
                    <SortableTh sortKey="routeCode" sort={sort} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Route Code</SortableTh>
                    <SortableTh sortKey="vehicle" sort={sort} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Vehicle</SortableTh>
                    <SortableTh sortKey="trip" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Trip</SortableTh>
                    <SortableTh sortKey="driverId" sort={sort} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Driver ID</SortableTh>
                    <SortableTh sortKey="carrier" sort={sort} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Carrier</SortableTh>
                    <SortableTh sortKey="schedDepDate" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(120,80%,85%)]">Sched Dep Date</SortableTh>
                    <SortableTh sortKey="schedDepTime" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(120,80%,85%)]">Sched Dep Time</SortableTh>
                    <SortableTh sortKey="schedRetDate" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(120,80%,85%)]">Sched Ret Date</SortableTh>
                    <SortableTh sortKey="schedRetTime" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(120,80%,85%)]">Sched Ret Time</SortableTh>
                    <SortableTh sortKey="corrDepDate" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(30,90%,85%)]">Corr Dep Date</SortableTh>
                    <SortableTh sortKey="corrDepTime" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(30,90%,85%)]">Corr Dep Time</SortableTh>
                    <SortableTh sortKey="corrRetDate" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(30,90%,85%)]">Corr Ret Date</SortableTh>
                    <SortableTh sortKey="corrRetTime" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(30,90%,85%)]">Corr Ret Time</SortableTh>
                    <SortableTh sortKey="actDepDate" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(195,80%,80%)]">Act Dep Date</SortableTh>
                    <SortableTh sortKey="actDepTime" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(195,80%,80%)]">Act Dep Time</SortableTh>
                    <SortableTh sortKey="actRetDate" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(195,80%,80%)]">Act Ret Date</SortableTh>
                    <SortableTh sortKey="actRetTime" sort={sort} align="center" className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap bg-[hsl(195,80%,80%)]">Act Ret Time</SortableTh>
                    <SortableTh sortKey="distanceKm" sort={sort} align="right" className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap">Dist (Km)</SortableTh>
                    <SortableTh sortKey="timeH" sort={sort} align="right" className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap">Time(H)</SortableTh>
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
                                      <td className="px-4 py-2.5"><StatusBadge status={doc.status} variant={doc.status === "Completed" ? "success" : "primary"} /></td>
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
