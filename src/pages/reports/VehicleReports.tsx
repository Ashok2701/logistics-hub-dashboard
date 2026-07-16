import { useEffect, useMemo, useState } from "react";
import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { MapPin, ChevronDown, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fetchTmsSites, type RpSite } from "@/lib/routePlannerApi";
import { fetchVehicleReports, type VehicleReportRow } from "@/lib/reportsApi";
import { useToast } from "@/hooks/use-toast";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-elevated">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-[11px] text-muted-foreground">
          {p.name}: <span className="font-mono font-medium text-foreground">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

// --- Filters bar --------------------------------------------------------
// Weeks follow ISO 8601: Monday–Sunday.

type Preset = "today" | "week" | "month" | "custom";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeek(d: Date) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Monday + 6 = Sunday
  end.setHours(0, 0, 0, 0);
  return end;
}
function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfMonth(d: Date) {
  // Day 0 of next month = last day of this month.
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(0, 0, 0, 0);
  return x;
}
function rangeForPreset(preset: Preset, custom?: { from?: Date; to?: Date }): { from: Date; to: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") return { from: startOfWeek(today), to: endOfWeek(today) };
  if (preset === "month") return { from: startOfMonth(today), to: endOfMonth(today) };
  return { from: custom?.from ?? today, to: custom?.to ?? today };
}

const ALL_SITES = "__ALL__";

export default function VehicleReports() {
  const { toast } = useToast();

  const [sites, setSites] = useState<RpSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>(ALL_SITES);
  const [preset, setPreset] = useState<Preset>("today");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleReportRow[]>([]);

  const { from, to } = useMemo(() => rangeForPreset(preset, customRange), [preset, customRange]);

  const sort = useSortable(vehicleData);
  const sorted = sort.sorted;

  // Load sites once
  useEffect(() => {
    fetchTmsSites()
      .then(setSites)
      .catch((e) => toast({ title: "Failed to load sites", description: String(e.message ?? e), variant: "destructive" }));
  }, [toast]);

  // Fetch vehicle report rows whenever site / date range changes — same
  // trigger pattern as Dashboard's fetchDashboard effect.
  useEffect(() => {
    const startDate = format(from, "yyyy-MM-dd");
    const endDate = format(to, "yyyy-MM-dd");
    const siteParam = selectedSite === ALL_SITES ? null : selectedSite;
    setLoading(true);
    fetchVehicleReports(siteParam, startDate, endDate)
      .then(setVehicleData)
      .catch((e) => {
        setVehicleData([]);
        toast({ title: "Failed to load vehicle reports", description: String(e.message ?? e), variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [selectedSite, from, to, toast]);

  const siteLabel = useMemo(() => {
    if (selectedSite === ALL_SITES) return "All sites";
    const s = sites.find((x) => x.siteCode === selectedSite);
    return s ? `${s.siteCode} — ${s.siteName}` : selectedSite;
  }, [selectedSite, sites]);

  return (
    <div>
      {/* Heading + filters bar */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-wrap items-center justify-between gap-3 mb-6"
      >
        <PageHeader title="Vehicle Reports" subtitle="Fleet utilization analytics" />

        <div className="flex flex-wrap items-center gap-3">
          {/* Site single-select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 min-w-[220px] justify-between">
                <span className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{siteLabel}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="max-h-72 overflow-y-auto p-1">
                <button
                  onClick={() => setSelectedSite(ALL_SITES)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm",
                    selectedSite === ALL_SITES && "bg-accent font-semibold"
                  )}
                >
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>All sites</span>
                </button>
                <div className="my-1 border-t border-border" />
                {sites.map((s) => (
                  <button
                    key={s.siteCode}
                    onClick={() => setSelectedSite(s.siteCode)}
                    className={cn(
                      "w-full flex flex-col items-start px-3 py-2 rounded-md hover:bg-accent text-left",
                      selectedSite === s.siteCode && "bg-accent"
                    )}
                  >
                    <span className="text-sm font-medium truncate w-full">{s.siteCode}</span>
                    <span className="text-[11px] text-muted-foreground truncate w-full">{s.siteName}</span>
                  </button>
                ))}
                {sites.length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">Loading sites…</div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date preset */}
          <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-1">
            {(["today", "week", "month", "custom"] as Preset[]).map((p) => {
              const labels: Record<Preset, string> = { today: "Today", week: "This Week", month: "This Month", custom: "Custom Range" };
              return (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={cn(
                    "px-3 h-8 rounded-md text-xs font-medium transition-colors",
                    preset === p ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* Custom range picker */}
          {preset === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {customRange.from && customRange.to
                      ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d")}`
                      : "Pick range"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: customRange.from, to: customRange.to }}
                  onSelect={(r: any) => setCustomRange({ from: r?.from, to: r?.to })}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="font-mono">
              {format(from, "yyyy-MM-dd")} → {format(to, "yyyy-MM-dd")}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {[
          { title: "Vehicle Utilization (%)", key: "utilization", color: "hsl(25, 95%, 53%)" },
          { title: "Trip Count", key: "trips", color: "hsl(217, 91%, 60%)" },
        ].map((chart, i) => (
          <motion.div
            key={chart.key}
            className="bg-card rounded-xl border border-border shadow-card p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">{chart.title}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vehicleData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="plate" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.04)" }} />
                <Bar dataKey={chart.key} fill={chart.color} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        ))}
      </div>

      <DataTableShell>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Detailed Breakdown</h3>
        </div>
        <table className="data-table">
          <thead><tr>
            <SortableTh sortKey="plate" sort={sort}>Vehicle</SortableTh>
            <SortableTh sortKey="trips" sort={sort}>Trips</SortableTh>
            <SortableTh sortKey="distance" sort={sort}>Distance (km)</SortableTh>
            <SortableTh sortKey="utilization" sort={sort}>Utilization</SortableTh>
          </tr></thead>
          <tbody>
            {sorted.map((d, i) => (
              <motion.tr key={d.plate} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.04 }}>
                <td><span className="font-mono text-xs px-2 py-1 rounded bg-secondary text-foreground">{d.plate}</span></td>
                <td className="font-mono text-foreground">{d.trips}</td>
                <td className="font-mono text-foreground">{d.distance.toLocaleString()}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full gradient-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${d.utilization}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                      />
                    </div>
                    <span className="font-mono text-xs font-medium text-foreground">{d.utilization}%</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}