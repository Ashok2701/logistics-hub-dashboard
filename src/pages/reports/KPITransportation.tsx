import { useState, useMemo } from "react";
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

// --- Raw data with period ---
const allRecords: DetailRecord[] = [
  // March 2026
  { kpi: "fleet", site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 8, stops: 45, distance: 1200, travelTime: 18.5, period: "March 2026" },
  { kpi: "fleet", site: "CAT01", vehicle: "VH-1002", driver: "Mike Johnson", routes: 6, stops: 32, distance: 980, travelTime: 14.2, period: "March 2026" },
  { kpi: "fleet", site: "UK01", vehicle: "VH-3001", driver: "James Wilson", routes: 5, stops: 28, distance: 870, travelTime: 12.1, period: "March 2026" },
  { kpi: "routes", site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 3, stops: 18, distance: 450, travelTime: 6.5, period: "March 2026" },
  { kpi: "routes", site: "CAT01", vehicle: "VH-1003", driver: "Tom Brown", routes: 5, stops: 27, distance: 720, travelTime: 10.8, period: "March 2026" },
  { kpi: "routes", site: "UK01", vehicle: "VH-3002", driver: "David Clark", routes: 6, stops: 35, distance: 950, travelTime: 13.7, period: "March 2026" },
  { kpi: "travel", site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 8, stops: 45, distance: 1200, travelTime: 18.5, period: "March 2026" },
  { kpi: "travel", site: "CAT01", vehicle: "VH-1002", driver: "Mike Johnson", routes: 6, stops: 32, distance: 980, travelTime: 14.2, period: "March 2026" },
  { kpi: "travel", site: "UK01", vehicle: "VH-3001", driver: "James Wilson", routes: 5, stops: 28, distance: 870, travelTime: 12.1, period: "March 2026" },
  { kpi: "distance", site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 8, stops: 45, distance: 1200, travelTime: 18.5, period: "March 2026" },
  { kpi: "distance", site: "UK01", vehicle: "VH-3001", driver: "James Wilson", routes: 5, stops: 28, distance: 870, travelTime: 12.1, period: "March 2026" },
  // February 2026
  { kpi: "fleet", site: "IRE01", vehicle: "VH-2001", driver: "Sean O'Brien", routes: 4, stops: 22, distance: 650, travelTime: 9.8, period: "February 2026" },
  { kpi: "fleet", site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 10, stops: 55, distance: 1500, travelTime: 22.0, period: "February 2026" },
  { kpi: "fleet", site: "UK01", vehicle: "VH-3001", driver: "James Wilson", routes: 9, stops: 48, distance: 1300, travelTime: 19.5, period: "February 2026" },
  { kpi: "fleet", site: "FR01", vehicle: "VH-4001", driver: "Pierre Dupont", routes: 8, stops: 42, distance: 1150, travelTime: 17.0, period: "February 2026" },
  { kpi: "routes", site: "IRE01", vehicle: "VH-2002", driver: "Patrick Kelly", routes: 2, stops: 12, distance: 340, travelTime: 5.2, period: "February 2026" },
  { kpi: "routes", site: "CAT01", vehicle: "VH-1003", driver: "Tom Brown", routes: 7, stops: 40, distance: 900, travelTime: 13.5, period: "February 2026" },
  { kpi: "travel", site: "IRE01", vehicle: "VH-2001", driver: "Sean O'Brien", routes: 4, stops: 22, distance: 650, travelTime: 9.8, period: "February 2026" },
  { kpi: "travel", site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 10, stops: 55, distance: 1500, travelTime: 22.0, period: "February 2026" },
  { kpi: "travel", site: "FR01", vehicle: "VH-4001", driver: "Pierre Dupont", routes: 8, stops: 42, distance: 1150, travelTime: 17.0, period: "February 2026" },
  { kpi: "distance", site: "IRE01", vehicle: "VH-2001", driver: "Sean O'Brien", routes: 4, stops: 22, distance: 650, travelTime: 9.8, period: "February 2026" },
  { kpi: "distance", site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 10, stops: 55, distance: 1500, travelTime: 22.0, period: "February 2026" },
  { kpi: "distance", site: "UK01", vehicle: "VH-3001", driver: "James Wilson", routes: 9, stops: 48, distance: 1300, travelTime: 19.5, period: "February 2026" },
  { kpi: "distance", site: "FR01", vehicle: "VH-4001", driver: "Pierre Dupont", routes: 8, stops: 42, distance: 1150, travelTime: 17.0, period: "February 2026" },
  // January 2026
  { kpi: "fleet", site: "FR01", vehicle: "VH-4001", driver: "Pierre Dupont", routes: 7, stops: 38, distance: 1100, travelTime: 16.3, period: "January 2026" },
  { kpi: "fleet", site: "CAT01", vehicle: "VH-1002", driver: "Mike Johnson", routes: 12, stops: 65, distance: 1800, travelTime: 26.0, period: "January 2026" },
  { kpi: "fleet", site: "IRE01", vehicle: "VH-2001", driver: "Sean O'Brien", routes: 6, stops: 30, distance: 900, travelTime: 13.0, period: "January 2026" },
  { kpi: "routes", site: "FR01", vehicle: "VH-4002", driver: "Jean Martin", routes: 4, stops: 22, distance: 680, travelTime: 9.9, period: "January 2026" },
  { kpi: "routes", site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 9, stops: 50, distance: 1400, travelTime: 20.0, period: "January 2026" },
  { kpi: "travel", site: "FR01", vehicle: "VH-4001", driver: "Pierre Dupont", routes: 7, stops: 38, distance: 1100, travelTime: 16.3, period: "January 2026" },
  { kpi: "travel", site: "CAT01", vehicle: "VH-1002", driver: "Mike Johnson", routes: 12, stops: 65, distance: 1800, travelTime: 26.0, period: "January 2026" },
  { kpi: "travel", site: "IRE01", vehicle: "VH-2001", driver: "Sean O'Brien", routes: 6, stops: 30, distance: 900, travelTime: 13.0, period: "January 2026" },
  { kpi: "distance", site: "FR01", vehicle: "VH-4001", driver: "Pierre Dupont", routes: 7, stops: 38, distance: 1100, travelTime: 16.3, period: "January 2026" },
  { kpi: "distance", site: "FR01", vehicle: "VH-4003", driver: "Luc Bernard", routes: 3, stops: 15, distance: 480, travelTime: 7.1, period: "January 2026" },
  { kpi: "distance", site: "CAT01", vehicle: "VH-1002", driver: "Mike Johnson", routes: 12, stops: 65, distance: 1800, travelTime: 26.0, period: "January 2026" },
];

const chartDataByPeriod: ChartRow[] = [
  // March 2026
  { site: "CAT01", nbStops: 3000, nbRoutes: 745, distance: 103000, travelTime: 2000, period: "March 2026" },
  { site: "UK01", nbStops: 980, nbRoutes: 410, distance: 52000, travelTime: 870, period: "March 2026" },
  // February 2026
  { site: "CAT01", nbStops: 4200, nbRoutes: 980, distance: 135000, travelTime: 2800, period: "February 2026" },
  { site: "IRE01", nbStops: 153, nbRoutes: 220, distance: 10000, travelTime: 169, period: "February 2026" },
  { site: "UK01", nbStops: 1400, nbRoutes: 580, distance: 72000, travelTime: 1200, period: "February 2026" },
  { site: "FR01", nbStops: 1200, nbRoutes: 520, distance: 67000, travelTime: 1100, period: "February 2026" },
  // January 2026
  { site: "CAT01", nbStops: 5000, nbRoutes: 1100, distance: 160000, travelTime: 3200, period: "January 2026" },
  { site: "IRE01", nbStops: 300, nbRoutes: 350, distance: 18000, travelTime: 320, period: "January 2026" },
  { site: "FR01", nbStops: 1500, nbRoutes: 650, distance: 80000, travelTime: 1400, period: "January 2026" },
];

const periods = ["March 2026", "February 2026", "January 2026"];
const prevPeriodMap: Record<string, string> = {
  "March 2026": "February 2026",
  "February 2026": "January 2026",
  "January 2026": "December 2025",
};

const allSites = ["CAT01", "IRE01", "UK01", "FR01"];

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
  const [filterPeriod, setFilterPeriod] = useState("March 2026");

  const prevPeriod = prevPeriodMap[filterPeriod] || "";

  // Chart data filtered by period + site
  const chartData = useMemo(() => {
    let data = chartDataByPeriod.filter(d => d.period === filterPeriod);
    if (filterSite !== "all") data = data.filter(d => d.site === filterSite);
    return data;
  }, [filterPeriod, filterSite]);

  // Current period records filtered by site
  const currentRecords = useMemo(() => {
    return allRecords.filter(r => {
      const periodMatch = r.period === filterPeriod;
      const siteMatch = filterSite === "all" || r.site === filterSite;
      return periodMatch && siteMatch;
    });
  }, [filterPeriod, filterSite]);

  // Previous period records filtered by site
  const prevRecords = useMemo(() => {
    if (!prevPeriod) return [];
    return allRecords.filter(r => {
      const periodMatch = r.period === prevPeriod;
      const siteMatch = filterSite === "all" || r.site === filterSite;
      return periodMatch && siteMatch;
    });
  }, [prevPeriod, filterSite]);

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
