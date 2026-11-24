import { useState, useMemo, useEffect } from "react";
import { fetchLiveReport } from "@/lib/reportsApi";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Route, Clock, MapPin, ArrowLeft, TrendingDown, TrendingUp,
  ChevronLeft, ChevronRight, Filter, Search, type LucideIcon,
} from "lucide-react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, ComposedChart,
} from "recharts";

// --- Types ---
interface DetailRecord {
  kpi: string;
  site: string;
  vehicle: string;
  driver: string;
  routes: number;
  stops: number;
  distance: number;
  travelTime: number;
  period: string; // "March 2026", "February 2026", etc.
}

interface ChartRow {
  site: string;
  nbStops: number;
  nbRoutes: number;
  distance: number;
  travelTime: number;
  period: string;
}

// --- Month labels ("March 2026") ---
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (d: Date) => `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
function prevPeriodOf(label: string): string {
  const [name, year] = label.split(" ");
  const m = MONTH_NAMES.indexOf(name);
  if (m < 0) return "";
  return monthLabel(new Date(Number(year), m - 1, 1));
}
const KPI_IDS = ["fleet", "routes", "travel", "distance"] as const;

const metricDefs = [
  { id: "fleet", title: "FLEET USAGE", icon: Truck },
  { id: "routes", title: "ROUTES", icon: Route },
  { id: "travel", title: "TRAVEL TIME", icon: Clock },
  { id: "distance", title: "TOTAL DISTANCE", icon: MapPin },
] as const;

// --- Helpers ---
function computeMetricValue(records: DetailRecord[], metricId: string): number {
  const recs = records.filter(r => r.kpi === metricId);
  switch (metricId) {
    case "fleet": return new Set(recs.map(r => r.vehicle)).size;
    case "routes": return recs.reduce((s, r) => s + r.routes, 0);
    case "travel": return Math.round(recs.reduce((s, r) => s + r.travelTime, 0) * 100) / 100;
    case "distance": return recs.reduce((s, r) => s + r.distance, 0);
    default: return 0;
  }
}

function formatValue(metricId: string, val: number): string {
  if (metricId === "travel") return val.toFixed(2);
  if (metricId === "distance") return val >= 1000 ? `${(val / 1000).toFixed(2)} K` : String(val);
  return String(val);
}

// --- KPI Card ---
function KPICard({ metricId, title, icon: Icon, currentValue, currentLabel, prevValue, prevLabel, onClick, isSelected }: {
  metricId: string; title: string; icon: LucideIcon;
  currentValue: string; currentLabel: string;
  prevValue: string; prevLabel: string;
  onClick: () => void; isSelected: boolean;
}) {
  const cur = parseFloat(currentValue) || 0;
  const prev = parseFloat(prevValue) || 0;
  const trend = cur >= prev ? "up" : "down";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl p-5 border cursor-pointer transition-all duration-200 shadow-card hover:shadow-elevated",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border/50"
      )}
    >
      <div className="flex items-center justify-center mb-1">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <h3 className="text-[11px] font-bold text-center tracking-wider text-muted-foreground">{title}</h3>
      <p className="text-[10px] text-center text-muted-foreground">{currentLabel}</p>
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-3xl font-bold text-foreground">{currentValue}</span>
        {trend === "down" ? (
          <TrendingDown className="w-5 h-5 text-destructive" />
        ) : (
          <TrendingUp className="w-5 h-5 text-success" />
        )}
      </div>
      <div className="h-px bg-border/40 my-3" />
      <p className="text-[10px] text-center text-muted-foreground">
        {prevLabel}: <span className="font-semibold text-foreground">{prevValue}</span>
      </p>
    </motion.div>
  );
}

// --- Detail View ---
function DetailView({ records, title, siteName, onBack }: { records: DetailRecord[]; title: string; siteName?: string; onBack: () => void }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r =>
      r.site.toLowerCase().includes(q) ||
      r.vehicle.toLowerCase().includes(q) ||
      r.driver.toLowerCase().includes(q)
    );
  }, [records, search]);
  const sort = useSortable(filtered);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h2 className="text-lg font-bold text-foreground">
          {title} — Detail Report{siteName ? ` (${siteName})` : ""}
        </h2>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search site, vehicle, driver..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} records</span>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <SortableTh sortKey="site" sort={sort} className="text-left p-3 font-semibold text-muted-foreground text-xs">Site</SortableTh>
                <SortableTh sortKey="vehicle" sort={sort} className="text-left p-3 font-semibold text-muted-foreground text-xs">Vehicle</SortableTh>
                <SortableTh sortKey="driver" sort={sort} className="text-left p-3 font-semibold text-muted-foreground text-xs">Driver</SortableTh>
                <SortableTh sortKey="routes" sort={sort} align="right" className="text-right p-3 font-semibold text-muted-foreground text-xs">Routes</SortableTh>
                <SortableTh sortKey="stops" sort={sort} align="right" className="text-right p-3 font-semibold text-muted-foreground text-xs">Stops</SortableTh>
                <SortableTh sortKey="distance" sort={sort} align="right" className="text-right p-3 font-semibold text-muted-foreground text-xs">Distance (km)</SortableTh>
                <SortableTh sortKey="travelTime" sort={sort} align="right" className="text-right p-3 font-semibold text-muted-foreground text-xs">Travel Time (hrs)</SortableTh>
                <SortableTh sortKey="period" sort={sort} className="text-left p-3 font-semibold text-muted-foreground text-xs">Period</SortableTh>
              </tr>
            </thead>
            <tbody>
              {sort.sorted.map((r, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-medium">{r.site}</td>
                  <td className="p-3">{r.vehicle}</td>
                  <td className="p-3">{r.driver}</td>
                  <td className="p-3 text-right font-mono">{r.routes}</td>
                  <td className="p-3 text-right font-mono">{r.stops}</td>
                  <td className="p-3 text-right font-mono">{r.distance.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">{r.travelTime}</td>
                  <td className="p-3 text-muted-foreground">{r.period}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </motion.div>
  );
}

// --- Main Page ---
export default function KPITransportation() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [clickedSite, setClickedSite] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [filterSite, setFilterSite] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState(monthLabel(new Date()));

  // Real trip totals per month, site, vehicle and driver
  const [base, setBase] = useState<{ records: any[]; sites: string[] }>({ records: [], sites: [] });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 17, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchLiveReport<{ records: any[]; sites: string[] }>("kpi", null, iso(from), iso(to))
      .then((r) => { if (!cancelled) setBase({ records: r.records ?? [], sites: r.sites ?? [] }); })
      .catch((e) => { if (!cancelled) { setBase({ records: [], sites: [] }); setLoadError(String(e?.message ?? e)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // The last 18 months, newest first, whether or not they have trips yet.
  const periods = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 18 }, (_, i) => monthLabel(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }, []);
  const allSites = base.sites;

  // Each trip total counts for all four KPI cards.
  const allRecords: DetailRecord[] = useMemo(
    () => base.records.flatMap((r) => KPI_IDS.map((kpi) => ({ ...r, kpi }) as DetailRecord)),
    [base.records]
  );

  const chartDataByPeriod: ChartRow[] = useMemo(() => {
    const m = new Map<string, ChartRow>();
    base.records.forEach((r) => {
      const key = `${r.period}|${r.site}`;
      const row = m.get(key) ?? { site: r.site, nbStops: 0, nbRoutes: 0, distance: 0, travelTime: 0, period: r.period };
      row.nbStops += r.stops;
      row.nbRoutes += r.routes;
      row.distance += r.distance;
      row.travelTime += r.travelTime;
      m.set(key, row);
    });
    return Array.from(m.values()).map((r) => ({
      ...r,
      distance: Math.round(r.distance * 10) / 10,
      travelTime: Math.round(r.travelTime * 100) / 100,
    }));
  }, [base.records]);

  const prevPeriod = prevPeriodOf(filterPeriod);

  // Chart data filtered by period + site
  const chartData = useMemo(() => {
    let data = chartDataByPeriod.filter(d => d.period === filterPeriod);
    if (filterSite !== "all") data = data.filter(d => d.site === filterSite);
    return data;
  }, [filterPeriod, filterSite, chartDataByPeriod]);

  // Current period records filtered by site
  const currentRecords = useMemo(() => {
    return allRecords.filter(r => {
      const periodMatch = r.period === filterPeriod;
      const siteMatch = filterSite === "all" || r.site === filterSite;
      return periodMatch && siteMatch;
    });
  }, [filterPeriod, filterSite, allRecords]);

  // Previous period records filtered by site
  const prevRecords = useMemo(() => {
    if (!prevPeriod) return [];
    return allRecords.filter(r => {
      const periodMatch = r.period === prevPeriod;
      const siteMatch = filterSite === "all" || r.site === filterSite;
      return periodMatch && siteMatch;
    });
  }, [prevPeriod, filterSite, allRecords]);

  // Detail records for the selected metric
  const detailRecords = useMemo(() => {
    if (!selectedMetric) return [];
    let records = currentRecords.filter(r => r.kpi === selectedMetric);
    if (clickedSite) records = records.filter(r => r.site === clickedSite);
    return records;
  }, [selectedMetric, currentRecords, clickedSite]);

  const handleBarClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.site) {
      const site = data.activePayload[0].payload.site;
      setClickedSite(site);
      setSelectedMetric("fleet");
    }
  };

  const handleBack = () => {
    setSelectedMetric(null);
    setClickedSite(null);
  };

  const selectedDef = metricDefs.find(m => m.id === selectedMetric);

  return (
    <div className="flex h-full">
      {/* Filter Sidebar */}
      <AnimatePresence mode="wait">
        {showFilters && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-r border-border/50 bg-card overflow-hidden flex-shrink-0"
          >
            <div className="p-4 w-[260px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Filters
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Period</label>
                  <select
                    value={filterPeriod}
                    onChange={e => setFilterPeriod(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm"
                  >
                    {periods.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Site</label>
                  <select
                    value={filterSite}
                    onChange={e => setFilterSite(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm"
                  >
                    <option value="all">All Sites</option>
                    {allSites.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="self-start mt-4 -ml-px z-10 bg-card border border-border/50 rounded-r-lg p-1 hover:bg-muted transition-colors"
      >
        {showFilters ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <PageHeader title="KPI Transportation" subtitle="Transportation performance metrics and analytics" />
        {loading && <p className="text-xs text-muted-foreground mb-2">Loading…</p>}
        {loadError && <p className="text-xs text-destructive mb-2">Could not load KPI data: {loadError}</p>}

        <AnimatePresence mode="wait">
          {selectedMetric && selectedDef ? (
            <DetailView
              key="detail"
              records={detailRecords}
              title={selectedDef.title}
              siteName={clickedSite || undefined}
              onBack={handleBack}
            />
          ) : (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                {/* Chart */}
                <div className="xl:col-span-2">
                  <DataTableShell>
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-4">Transportation KPI — {filterPeriod}</h3>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} onClick={handleBarClick} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis dataKey="site" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            <Bar yAxisId="left" dataKey="nbStops" name="Nb of Stops" fill="hsl(var(--primary))" opacity={0.7} radius={[4, 4, 0, 0]} cursor="pointer" />
                            <Bar yAxisId="left" dataKey="nbRoutes" name="NB of Routes" fill="hsl(var(--accent-foreground))" opacity={0.6} radius={[4, 4, 0, 0]} cursor="pointer" />
                            <Bar yAxisId="left" dataKey="travelTime" name="Travel Time" fill="hsl(var(--destructive))" opacity={0.6} radius={[4, 4, 0, 0]} cursor="pointer" />
                            <Line yAxisId="right" type="monotone" dataKey="distance" name="Distance" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </DataTableShell>
                </div>

                {/* KPI Cards — dynamically computed */}
                <div className="grid grid-cols-2 gap-4 content-start">
                  {metricDefs.map(m => {
                    const curVal = computeMetricValue(currentRecords, m.id);
                    const prvVal = computeMetricValue(prevRecords, m.id);
                    return (
                      <KPICard
                        key={m.id}
                        metricId={m.id}
                        title={m.title}
                        icon={m.icon}
                        currentValue={formatValue(m.id, curVal)}
                        currentLabel={filterPeriod}
                        prevValue={formatValue(m.id, prvVal)}
                        prevLabel={prevPeriod || "N/A"}
                        onClick={() => { setClickedSite(null); setSelectedMetric(m.id); }}
                        isSelected={selectedMetric === m.id}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
