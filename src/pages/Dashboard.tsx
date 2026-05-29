import { useMemo, useState } from "react";
import { Truck, Compass, IdCard, CheckCircle2, User, MapPin, Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

type Trend = { value: string; tone: "positive" | "warning" | "neutral" };

const kpis: { label: string; value: string; icon: any; trend: Trend; cardBg: string; cardBorder: string; cardShadow: string; iconBg: string; iconColor: string }[] = [
  { label: "Active Trips", value: "18", icon: Truck, trend: { value: "▲ 3 vs yesterday", tone: "positive" }, cardBg: "bg-emerald-50 dark:bg-emerald-950/30", cardBorder: "border-emerald-200 dark:border-emerald-800", cardShadow: "shadow-emerald-200/40 dark:shadow-emerald-900/20", iconBg: "bg-emerald-100 dark:bg-emerald-900/50", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { label: "Vehicles on Road", value: "22", icon: Compass, trend: { value: "▲ 81% utilised", tone: "positive" }, cardBg: "bg-sky-50 dark:bg-sky-950/30", cardBorder: "border-sky-200 dark:border-sky-800", cardShadow: "shadow-sky-200/40 dark:shadow-sky-900/20", iconBg: "bg-sky-100 dark:bg-sky-900/50", iconColor: "text-sky-600 dark:text-sky-400" },
  { label: "Drivers on Duty", value: "24", icon: IdCard, trend: { value: "2 approaching hour limit", tone: "warning" }, cardBg: "bg-amber-50 dark:bg-amber-950/30", cardBorder: "border-amber-200 dark:border-amber-800", cardShadow: "shadow-amber-200/40 dark:shadow-amber-900/20", iconBg: "bg-amber-100 dark:bg-amber-900/50", iconColor: "text-amber-600 dark:text-amber-400" },
  { label: "Deliveries Today", value: "41", icon: CheckCircle2, trend: { value: "▲ 94.1% on time", tone: "positive" }, cardBg: "bg-violet-50 dark:bg-violet-950/30", cardBorder: "border-violet-200 dark:border-violet-800", cardShadow: "shadow-violet-200/40 dark:shadow-violet-900/20", iconBg: "bg-violet-100 dark:bg-violet-900/50", iconColor: "text-violet-600 dark:text-violet-400" },
];

const fleetStatus = [
  { label: "On Road", value: 22, max: 30, color: "emerald" },
  { label: "Idle / Depot", value: 5, max: 30, color: "sky" },
  { label: "Maintenance", value: 3, max: 30, color: "rose" },
];

const fleetTotals = [
  { label: "Total", value: 30 },
  { label: "Trailers", value: 18 },
  { label: "Drivers", value: 32 },
];

const driverHours = [
  { label: "Under 8h — safe", value: 18, max: 24, color: "emerald" },
  { label: "8–10h — caution", value: 4, max: 24, color: "amber" },
  { label: "Over 10h — alert", value: 2, max: 24, color: "rose" },
];

const barColors: Record<string, { bar: string; text: string }> = {
  emerald: { bar: "bg-emerald-500", text: "text-emerald-600" },
  sky: { bar: "bg-sky-500", text: "text-sky-600" },
  amber: { bar: "bg-amber-500", text: "text-amber-600" },
  rose: { bar: "bg-rose-500", text: "text-rose-600" },
};

const trendTone: Record<Trend["tone"], string> = {
  positive: "text-emerald-600",
  warning: "text-amber-600",
  neutral: "text-muted-foreground",
};

// Mock sites (replace with API later)
const MOCK_SITES = [
  { code: "HQ-WH01", name: "HQ Warehouse" },
  { code: "ND-DC02", name: "North Distribution Center" },
  { code: "SH-HB03", name: "South Hub" },
  { code: "EL-TM04", name: "East Logistics Park" },
  { code: "WC-RG05", name: "West Coast Regional" },
];
const ALL_CODES = MOCK_SITES.map((s) => s.code);

type Preset = "today" | "week" | "month" | "custom";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
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

export default function Dashboard() {
  const [selectedSites, setSelectedSites] = useState<string[]>([...ALL_CODES]);
  const [preset, setPreset] = useState<Preset>("today");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  const { from, to } = useMemo(() => rangeForPreset(preset, customRange), [preset, customRange]);

  // Backend payload (mock — just log so it's visible)
  const payload = useMemo(
    () => ({
      sites: (selectedSites.length === MOCK_SITES.length ? ALL_CODES : selectedSites).join(","),
      startDate: format(from, "yyyy-MM-dd"),
      endDate: format(to, "yyyy-MM-dd"),
    }),
    [selectedSites, from, to]
  );

  const toggleSite = (code: string) => {
    setSelectedSites((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };
  const toggleAll = () => {
    setSelectedSites((prev) => (prev.length === MOCK_SITES.length ? [] : [...ALL_CODES]));
  };

  const sitesLabel =
    selectedSites.length === 0
      ? "No sites"
      : selectedSites.length === MOCK_SITES.length
      ? "All sites"
      : `${selectedSites.length} site${selectedSites.length > 1 ? "s" : ""}`;

  const presetLabels: Record<Preset, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    custom: "Custom Range",
  };
  const dateLabel =
    preset === "custom" && customRange.from && customRange.to
      ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d, yyyy")}`
      : presetLabels[preset];

  return (
    <div>
      {/* Filters bar (replaces Operations Overview header) */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-card rounded-xl border border-border shadow-card p-3 mb-6 flex flex-wrap items-center gap-3"
      >
        {/* Sites multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 gap-2 min-w-[200px] justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{sitesLabel}</span>
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-2 border-b border-border">
              <button
                onClick={toggleAll}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent text-sm font-medium"
              >
                <span>Select all</span>
                {selectedSites.length === MOCK_SITES.length && <Check className="w-4 h-4 text-primary" />}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {MOCK_SITES.map((s) => {
                const checked = selectedSites.includes(s.code);
                return (
                  <label
                    key={s.code}
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleSite(s.code)} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{s.code}</span>
                      <span className="text-[11px] text-muted-foreground truncate">{s.name}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date preset */}
        <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-1">
          {(["today", "week", "month", "custom"] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={cn(
                "px-3 h-8 rounded-md text-xs font-medium transition-colors",
                preset === p
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {presetLabels[p]}
            </button>
          ))}
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

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarIcon className="w-3.5 h-3.5" />
          <span className="font-mono">
            {format(from, "yyyy-MM-dd")} → {format(to, "yyyy-MM-dd")}
          </span>
          <span className="text-border">|</span>
          <span>{dateLabel}</span>
              className={cn(
                "px-3 h-8 rounded-md text-xs font-medium transition-colors",
                preset === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ y: -2 }}
              className={cn(
                "relative rounded-xl border p-3 overflow-hidden group transition-shadow hover:shadow-elevated",
                k.cardBg,
                k.cardBorder,
                k.cardShadow
              )}
            >
              <div className="relative flex items-start justify-between mb-2">
                <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", k.iconBg)}>
                  <Icon className={cn("w-4 h-4", k.iconColor)} />
                </div>
              </div>
              <p className="relative text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                {k.label}
              </p>
              <p className="relative text-2xl font-bold text-foreground mb-1 tracking-tight">{k.value}</p>
              <p className={cn("relative text-[11px] font-medium", trendTone[k.trend.tone])}>{k.trend.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Fleet Status + Driver Hours Today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Fleet Status</h3>
          </div>
          <div className="p-5 space-y-5">
            {fleetStatus.map((s) => {
              const c = barColors[s.color];
              const pct = (s.value / s.max) * 100;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{s.label}</span>
                    <span className={cn("text-sm font-semibold", c.text)}>{s.value}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", c.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5 grid grid-cols-3 gap-3">
            {fleetTotals.map((t) => (
              <div key={t.label} className="bg-secondary/60 rounded-lg p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {t.label}
                </p>
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
              const pct = (s.value / s.max) * 100;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{s.label}</span>
                    <span className={cn("text-sm font-semibold", c.text)}>{s.value}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", c.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5">
            <p className="text-xs text-muted-foreground">
              Max limit: 10h/day · <span className="text-amber-600 font-medium">2 drivers on warning</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Hidden debug: payload that would be sent to backend */}
      <div className="hidden">{JSON.stringify(payload)}</div>
    </div>
  );
}
