import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Route, Clock, MapPin, ArrowLeft, TrendingDown, TrendingUp,
  ChevronLeft, ChevronRight, Filter, Search, type LucideIcon,
} from "lucide-react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ComposedChart,
} from "recharts";

// --- Types ---
interface KPIMetric {
  id: string;
  title: string;
  icon: LucideIcon;
  value: number | string;
  unit?: string;
  month: string;
  prevMonth: string;
  prevValue: number | string;
  trend: "up" | "down";
}

interface DetailRecord {
  site: string;
  vehicle: string;
  driver: string;
  routes: number;
  stops: number;
  distance: number;
  travelTime: number;
  date: string;
}

// --- Sample Data ---
const chartData = [
  { site: "CAT01", nbStops: 3000, nbRoutes: 745, distance: 103000, travelTime: 2000 },
  { site: "IRE01", nbStops: 153, nbRoutes: 220, distance: 10000, travelTime: 169 },
  { site: "UK01", nbStops: 980, nbRoutes: 410, distance: 52000, travelTime: 870 },
  { site: "FR01", nbStops: 1200, nbRoutes: 520, distance: 67000, travelTime: 1100 },
];

const metrics: KPIMetric[] = [
  { id: "fleet", title: "FLEET USAGE", icon: Truck, value: 22, month: "March", prevMonth: "February 2026", prevValue: 50, trend: "down" },
  { id: "routes", title: "ROUTES", icon: Route, value: 22, month: "March 2026", prevMonth: "February 2026", prevValue: 50, trend: "down" },
  { id: "travel", title: "TRAVEL TIME", icon: Clock, value: "67.43", month: "March 2026", prevMonth: "February 2026", prevValue: "140.50", trend: "down" },
  { id: "distance", title: "TOTAL DISTANCE", icon: MapPin, value: "2.18 K", month: "March 2026", prevMonth: "February 2026", prevValue: "4.67 K", trend: "down" },
];

const detailData: Record<string, DetailRecord[]> = {
  fleet: [
    { site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 8, stops: 45, distance: 1200, travelTime: 18.5, date: "2026-03-15" },
    { site: "CAT01", vehicle: "VH-1002", driver: "Mike Johnson", routes: 6, stops: 32, distance: 980, travelTime: 14.2, date: "2026-03-15" },
    { site: "IRE01", vehicle: "VH-2001", driver: "Sean O'Brien", routes: 4, stops: 22, distance: 650, travelTime: 9.8, date: "2026-03-14" },
    { site: "UK01", vehicle: "VH-3001", driver: "James Wilson", routes: 5, stops: 28, distance: 870, travelTime: 12.1, date: "2026-03-14" },
    { site: "FR01", vehicle: "VH-4001", driver: "Pierre Dupont", routes: 7, stops: 38, distance: 1100, travelTime: 16.3, date: "2026-03-13" },
  ],
  routes: [
    { site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 3, stops: 18, distance: 450, travelTime: 6.5, date: "2026-03-15" },
    { site: "CAT01", vehicle: "VH-1003", driver: "Tom Brown", routes: 5, stops: 27, distance: 720, travelTime: 10.8, date: "2026-03-15" },
    { site: "IRE01", vehicle: "VH-2002", driver: "Patrick Kelly", routes: 2, stops: 12, distance: 340, travelTime: 5.2, date: "2026-03-14" },
    { site: "UK01", vehicle: "VH-3002", driver: "David Clark", routes: 6, stops: 35, distance: 950, travelTime: 13.7, date: "2026-03-13" },
    { site: "FR01", vehicle: "VH-4002", driver: "Jean Martin", routes: 4, stops: 22, distance: 680, travelTime: 9.9, date: "2026-03-12" },
  ],
  travel: [
    { site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 8, stops: 45, distance: 1200, travelTime: 18.5, date: "2026-03-15" },
    { site: "CAT01", vehicle: "VH-1002", driver: "Mike Johnson", routes: 6, stops: 32, distance: 980, travelTime: 14.2, date: "2026-03-15" },
    { site: "IRE01", vehicle: "VH-2001", driver: "Sean O'Brien", routes: 4, stops: 22, distance: 650, travelTime: 9.8, date: "2026-03-14" },
    { site: "UK01", vehicle: "VH-3001", driver: "James Wilson", routes: 5, stops: 28, distance: 870, travelTime: 12.1, date: "2026-03-13" },
  ],
  distance: [
    { site: "CAT01", vehicle: "VH-1001", driver: "John Smith", routes: 8, stops: 45, distance: 1200, travelTime: 18.5, date: "2026-03-15" },
    { site: "IRE01", vehicle: "VH-2001", driver: "Sean O'Brien", routes: 4, stops: 22, distance: 650, travelTime: 9.8, date: "2026-03-14" },
    { site: "UK01", vehicle: "VH-3001", driver: "James Wilson", routes: 5, stops: 28, distance: 870, travelTime: 12.1, date: "2026-03-14" },
    { site: "FR01", vehicle: "VH-4001", driver: "Pierre Dupont", routes: 7, stops: 38, distance: 1100, travelTime: 16.3, date: "2026-03-13" },
    { site: "FR01", vehicle: "VH-4003", driver: "Luc Bernard", routes: 3, stops: 15, distance: 480, travelTime: 7.1, date: "2026-03-12" },
  ],
};

// --- KPI Card Component ---
function KPICard({ metric, onClick, isSelected }: { metric: KPIMetric; onClick: () => void; isSelected: boolean }) {
  const Icon = metric.icon;
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
      <h3 className="text-[11px] font-bold text-center tracking-wider text-muted-foreground">{metric.title}</h3>
      <p className="text-[10px] text-center text-muted-foreground">{metric.month}</p>
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-3xl font-bold text-foreground">{metric.value}</span>
        {metric.trend === "down" ? (
          <TrendingDown className="w-5 h-5 text-destructive" />
        ) : (
          <TrendingUp className="w-5 h-5 text-success" />
        )}
      </div>
      <div className="h-px bg-border/40 my-3" />
      <p className="text-[10px] text-center text-muted-foreground">
        {metric.prevMonth}: <span className="font-semibold text-foreground">{metric.prevValue}</span>
      </p>
    </motion.div>
  );
}

// --- Detail View ---
function DetailView({ metricId, title, onBack }: { metricId: string; title: string; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const records = detailData[metricId] || [];

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r =>
      r.site.toLowerCase().includes(q) ||
      r.vehicle.toLowerCase().includes(q) ||
      r.driver.toLowerCase().includes(q)
    );
  }, [records, search]);

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
        <h2 className="text-lg font-bold text-foreground">{title} — Detail Report</h2>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search site, vehicle, driver..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} records</span>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left p-3 font-semibold text-muted-foreground text-xs">Site</th>
                <th className="text-left p-3 font-semibold text-muted-foreground text-xs">Vehicle</th>
                <th className="text-left p-3 font-semibold text-muted-foreground text-xs">Driver</th>
                <th className="text-right p-3 font-semibold text-muted-foreground text-xs">Routes</th>
                <th className="text-right p-3 font-semibold text-muted-foreground text-xs">Stops</th>
                <th className="text-right p-3 font-semibold text-muted-foreground text-xs">Distance (km)</th>
                <th className="text-right p-3 font-semibold text-muted-foreground text-xs">Travel Time (hrs)</th>
                <th className="text-left p-3 font-semibold text-muted-foreground text-xs">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-medium">{r.site}</td>
                  <td className="p-3">{r.vehicle}</td>
                  <td className="p-3">{r.driver}</td>
                  <td className="p-3 text-right font-mono">{r.routes}</td>
                  <td className="p-3 text-right font-mono">{r.stops}</td>
                  <td className="p-3 text-right font-mono">{r.distance.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">{r.travelTime}</td>
                  <td className="p-3 text-muted-foreground">{r.date}</td>
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
  const [showFilters, setShowFilters] = useState(true);

  const selectedMetricData = metrics.find(m => m.id === selectedMetric);

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
                  <select className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm">
                    <option>March 2026</option>
                    <option>February 2026</option>
                    <option>January 2026</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Site</label>
                  <select className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm">
                    <option>All Sites</option>
                    <option>CAT01</option>
                    <option>IRE01</option>
                    <option>UK01</option>
                    <option>FR01</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Vehicle</label>
                  <select className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm">
                    <option>All Vehicles</option>
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
        <PageHeader
          title="KPI Transportation"
          subtitle="Transportation performance metrics and analytics"
        />

        <AnimatePresence mode="wait">
          {selectedMetric && selectedMetricData ? (
            <DetailView
              key="detail"
              metricId={selectedMetric}
              title={selectedMetricData.title}
              onBack={() => setSelectedMetric(null)}
            />
          ) : (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Chart + KPI Cards Row */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                {/* Chart */}
                <div className="xl:col-span-2">
                  <DataTableShell>
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-4">Transportation KPI Period and Vehicle</h3>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis dataKey="site" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} label={{ value: "SITE", position: "insideBottom", offset: -5, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Nb of Stops, NB of Routes", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Distance", angle: 90, position: "insideRight", style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "12px",
                                fontSize: "12px",
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            <Bar yAxisId="left" dataKey="nbStops" name="Nb of Stops" fill="hsl(var(--primary))" opacity={0.7} radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="left" dataKey="nbRoutes" name="NB of Routes (Sum)" fill="hsl(var(--accent-foreground))" opacity={0.6} radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="left" dataKey="travelTime" name="Total Travel Time (Sum)" fill="hsl(var(--destructive))" opacity={0.6} radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="distance" name="Distance" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </DataTableShell>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-4 content-start">
                  {metrics.map(m => (
                    <KPICard
                      key={m.id}
                      metric={m}
                      onClick={() => setSelectedMetric(m.id)}
                      isSelected={selectedMetric === m.id}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
