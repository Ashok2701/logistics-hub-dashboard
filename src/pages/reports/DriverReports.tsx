import { PageHeader, DataTableShell } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { fetchLiveReport } from "@/lib/reportsApi";
import { fetchTmsSites, type RpSite } from "@/lib/routePlannerApi";

interface DriverRow {
  name: string;
  deliveries: number;
  distance: number;
  trips: number;
}

type Range = "week" | "month" | "quarter" | "year";
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function rangeFor(r: Range): { from: string; to: string } {
  const now = new Date();
  if (r === "week") {
    const day = now.getDay();                       // Monday to Sunday
    const mon = new Date(now); mon.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: iso(mon), to: iso(sun) };
  }
  if (r === "month") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  if (r === "quarter") return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(new Date(now.getFullYear(), 11, 31)) };
}

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

export default function DriverReports() {
  const [range, setRange] = useState<Range>("month");
  const [site, setSite] = useState<string>("");
  const [sites, setSites] = useState<RpSite[]>([]);
  const [driverData, setDriverData] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchTmsSites().then(setSites).catch(() => setSites([]));
  }, []);

  const { from, to } = useMemo(() => rangeFor(range), [range]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchLiveReport<DriverRow[]>("drivers", site || null, from, to)
      .then((rows) => { if (!cancelled) setDriverData(rows); })
      .catch((e) => { if (!cancelled) { setDriverData([]); setLoadError(String(e?.message ?? e)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, site]);

  const sort = useSortable(driverData);
  const sorted = sort.sorted;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <PageHeader title="Driver Reports" subtitle="Performance analytics by driver" />
        <div className="flex items-center gap-2 text-xs">
          <select value={site} onChange={(e) => setSite(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">All Sites</option>
            {sites.map((st) => <option key={st.siteCode} value={st.siteCode}>{st.siteCode} — {st.siteName}</option>)}
          </select>
          <select value={range} onChange={(e) => setRange(e.target.value as Range)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">This Year</option>
          </select>
          <span className="font-mono text-muted-foreground">{from} → {to}</span>
          {loading && <span className="text-muted-foreground">Loading…</span>}
        </div>
      </div>
      {loadError && <p className="text-xs text-destructive mb-3">Could not load driver data: {loadError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {[
          { title: "Deliveries per Driver", key: "deliveries", color: "hsl(217, 91%, 60%)" },
          { title: "Distance Travelled (km)", key: "distance", color: "hsl(152, 69%, 41%)" },
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
              <BarChart data={driverData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
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
            <SortableTh sortKey="name" sort={sort}>Driver</SortableTh>
            <SortableTh sortKey="deliveries" sort={sort}>Total Deliveries</SortableTh>
            <SortableTh sortKey="distance" sort={sort}>Distance (km)</SortableTh>
            <th>Avg per Trip</th>
          </tr></thead>
          <tbody>
            {sorted.map((d, i) => (
              <motion.tr key={d.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.04 }}>
                <td className="font-medium text-foreground">{d.name}</td>
                <td className="font-mono text-foreground">{d.deliveries}</td>
                <td className="font-mono text-foreground">{d.distance.toLocaleString()}</td>
                <td className="font-mono text-muted-foreground">{d.trips ? Math.round(d.distance / d.trips) : 0} km</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
