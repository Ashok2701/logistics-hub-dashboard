import { useEffect, useMemo, useState } from "react";
import { Truck, Compass, IdCard, CheckCircle2, User, MapPin, Calendar as CalendarIcon, ChevronDown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fetchTmsSites, type RpSite } from "@/lib/routePlannerApi";
import { fetchDashboard, type DashboardResponse, type KpiMetric } from "@/lib/dashboardApi";
import { useToast } from "@/hooks/use-toast";

type Preset = "today" | "week" | "month" | "custom";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function rangeForPreset(preset: Preset, custom?: { from?: Date; to?: Date }): { from: Date; to: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") return { from: startOfWeek(today), to: today };
  if (preset === "month") return { from: startOfMonth(today), to: today };
  return { from: custom?.from ?? today, to: custom?.to ?? today };
}


type Trend = { value: string; tone: "positive" | "warning" | "neutral" };

const trendTone: Record<Trend["tone"], string> = {
  positive: "text-emerald-600",
  warning: "text-amber-600",
  neutral: "text-muted-foreground",
};

const barColors: Record<string, { bar: string; text: string }> = {
  emerald: { bar: "bg-emerald-500", text: "text-emerald-600" },
  sky:     { bar: "bg-sky-500",     text: "text-sky-600" },
  amber:   { bar: "bg-amber-500",   text: "text-amber-600" },
  rose:    { bar: "bg-rose-500",    text: "text-rose-600" },
};

const ALL_SITES = "__ALL__";

function kpiTrend(m: KpiMetric | undefined, positiveIsUp = true): Trend {
  if (!m) return { value: "—", tone: "neutral" };
  const arrow = m.vsYesterday > 0 ? "▲" : m.vsYesterday < 0 ? "▼" : "■";
  const tone: Trend["tone"] =
    m.vsYesterday === 0 ? "neutral"
    : (m.vsYesterday > 0) === positiveIsUp ? "positive" : "warning";
  return { value: m.subtitle || `${arrow} ${Math.abs(m.vsYesterday)} vs yesterday`, tone };
}

export default function Dashboard() {
  const { toast } = useToast();

  const [sites, setSites] = useState<RpSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>(ALL_SITES);
  const [date, setDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Load sites once
  useEffect(() => {
    fetchTmsSites()
      .then(setSites)
      .catch((e) => toast({ title: "Failed to load sites", description: String(e.message ?? e), variant: "destructive" }));
  }, [toast]);

  // Fetch dashboard whenever site / date changes
  useEffect(() => {
    const dateStr = format(date, "yyyy-MM-dd");
    const siteParam = selectedSite === ALL_SITES ? null : selectedSite;
    setLoading(true);
    fetchDashboard(siteParam, dateStr)
      .then(setData)
      .catch((e) => {
        setData(null);
        toast({ title: "Failed to load dashboard", description: String(e.message ?? e), variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [selectedSite, date, toast]);

  const siteLabel = useMemo(() => {
    if (selectedSite === ALL_SITES) return "All sites";
    const s = sites.find((x) => x.siteCode === selectedSite);
    return s ? `${s.siteCode} — ${s.siteName}` : selectedSite;
  }, [selectedSite, sites]);

  const kpis = [
    { key: "activeTrips",     label: "Active Trips",     value: data?.activeTrips.value,     icon: Truck,         trend: kpiTrend(data?.activeTrips),     cardBg: "bg-emerald-50 dark:bg-emerald-950/30", cardBorder: "border-emerald-200 dark:border-emerald-800", iconBg: "bg-emerald-100 dark:bg-emerald-900/50", iconColor: "text-emerald-600 dark:text-emerald-400" },
    { key: "vehiclesOnRoad",  label: "Vehicles on Road", value: data?.vehiclesOnRoad.value,  icon: Compass,       trend: kpiTrend(data?.vehiclesOnRoad),  cardBg: "bg-sky-50 dark:bg-sky-950/30",         cardBorder: "border-sky-200 dark:border-sky-800",         iconBg: "bg-sky-100 dark:bg-sky-900/50",         iconColor: "text-sky-600 dark:text-sky-400" },
    { key: "driversOnDuty",   label: "Drivers on Duty",  value: data?.driversOnDuty.value,   icon: IdCard,        trend: kpiTrend(data?.driversOnDuty),   cardBg: "bg-amber-50 dark:bg-amber-950/30",     cardBorder: "border-amber-200 dark:border-amber-800",     iconBg: "bg-amber-100 dark:bg-amber-900/50",     iconColor: "text-amber-600 dark:text-amber-400" },
    { key: "deliveriesToday", label: "Deliveries Today", value: data?.deliveriesToday.value, icon: CheckCircle2,  trend: kpiTrend(data?.deliveriesToday), cardBg: "bg-violet-50 dark:bg-violet-950/30",   cardBorder: "border-violet-200 dark:border-violet-800",   iconBg: "bg-violet-100 dark:bg-violet-900/50",   iconColor: "text-violet-600 dark:text-violet-400" },
  ];

  const fs = data?.fleetStatus;
  const fleetMax = fs?.total ?? 30;
  const fleetStatus = [
    { label: "On Road",      value: fs?.onRoad     ?? 0, max: fleetMax, color: "emerald" },
    { label: "Idle / Depot", value: fs?.idleDepot  ?? 0, max: fleetMax, color: "sky" },
    { label: "Maintenance",  value: fs?.maintenance?? 0, max: fleetMax, color: "rose" },
  ];
  const fleetTotals = [
    { label: "Total",    value: fs?.total    ?? 0 },
    { label: "Trailers", value: fs?.trailers ?? 0 },
    { label: "Drivers",  value: fs?.drivers  ?? 0 },
  ];

  const dh = data?.driverHours;
  const dhMax = (dh ? dh.safe + dh.caution + dh.alert : 0) || 24;
  const driverHours = [
    { label: `Under 8h — safe`,   value: dh?.safe    ?? 0, max: dhMax, color: "emerald" },
    { label: `8–10h — caution`,   value: dh?.caution ?? 0, max: dhMax, color: "amber" },
    { label: `Over 10h — alert`,  value: dh?.alert   ?? 0, max: dhMax, color: "rose" },
  ];

  return (
    <div>
      {/* Filters bar */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-card rounded-xl border border-border shadow-card p-3 mb-6 flex flex-wrap items-center gap-3"
      >
        {/* Site single-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 gap-2 min-w-[240px] justify-between">
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

        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{format(date, "EEE, MMM d, yyyy")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span className="font-mono">{format(date, "yyyy-MM-dd")}</span>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ y: -2 }}
              className={cn("relative rounded-xl border p-3 overflow-hidden transition-shadow hover:shadow-elevated", k.cardBg, k.cardBorder)}
            >
              <div className="relative flex items-start justify-between mb-2">
                <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", k.iconBg)}>
                  <Icon className={cn("w-4 h-4", k.iconColor)} />
                </div>
              </div>
              <p className="relative text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{k.label}</p>
              <p className="relative text-2xl font-bold text-foreground mb-1 tracking-tight">
                {loading && k.value === undefined ? "—" : (k.value ?? "—")}
              </p>
              <p className={cn("relative text-[11px] font-medium", trendTone[k.trend.tone])}>{k.trend.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Fleet Status + Driver Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Fleet Status</h3>
            </div>
            {fs && (
              <span className="text-[11px] font-medium text-muted-foreground">
                {fs.utilisationPct}% utilised
              </span>
            )}
          </div>
          <div className="p-5 space-y-5">
            {fleetStatus.map((s) => {
              const c = barColors[s.color];
              const pct = s.max > 0 ? (s.value / s.max) * 100 : 0;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{s.label}</span>
                    <span className={cn("text-sm font-semibold", c.text)}>{s.value}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div className={cn("h-full rounded-full", c.bar)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5 grid grid-cols-3 gap-3">
            {fleetTotals.map((t) => (
              <div key={t.label} className="bg-secondary/60 rounded-lg p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t.label}</p>
                <p className="text-xl font-bold text-foreground">{t.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden flex flex-col"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Driver Hours Today</h3>
          </div>
          <div className="p-5 space-y-5 flex-1">
            {driverHours.map((s) => {
              const c = barColors[s.color];
              const pct = s.max > 0 ? (s.value / s.max) * 100 : 0;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{s.label}</span>
                    <span className={cn("text-sm font-semibold", c.text)}>{s.value}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div className={cn("h-full rounded-full", c.bar)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5">
            <p className="text-xs text-muted-foreground">
              {dh?.subtitle ?? `Max limit: ${dh?.maxHoursPerDay ?? 10}h/day`}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
