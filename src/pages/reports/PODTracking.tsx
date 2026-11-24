import { useState, useMemo, useEffect } from "react";
import { fetchLiveReport } from "@/lib/reportsApi";
import { fetchTmsSites } from "@/lib/routePlannerApi";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Group, ChevronDown, ChevronRight, FileText, PanelLeftClose, PanelLeft, ArrowLeft, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/MetricCard";
import { SortableTh } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";

interface PODLineItem {
  docNum: string;
  orderNumber: string;
  productId: string;
  description: string;
  qtyToPrepare: number;
  unit: string;
}

interface PODProduct {
  deliveryNum: string;
  product: string;
  orderedQty: number;
  deliveredQty: number;
  unit: string;
  packages: number;
  mass: number;
  massUnit: string;
  volume: number;
  volumeUnit: string;
  leftQtyToShip: number;
}

interface PODImage {
  type: string;
  document: string;
  contentUrl: string;
  postDate: string;
}

interface PODRecord {
  id: string;
  pod: boolean;
  site: string;
  document: string;
  date: string;
  type: string;
  status: string;
  bp: string;
  bpName: string;
  city: string;
  state: string;
  deliveryMode: string;
  pack: number;
  weight: number;
  weightUnit: string;
  volume: number;
  volumeUnit: string;
  depDate: string;
  depTime: string;
  arrivalDate: string;
  arrivalTime: string;
  vehicle: string;
  driver: string;
  lineItems: PODLineItem[];
  // POD detail fields
  reference?: string;
  lastUpdate?: string;
  updatedBy?: string;
  address?: string;
  addressLine1?: string;
  zip?: string;
  country?: string;
  phone?: string;
  web?: string;
  gpsLong?: string;
  gpsLat?: string;
  route?: string;
  schedule?: string;
  carrierCode?: string;
  carrier?: string;
  carrierEmail?: string;
  grossWeight?: number;
  netWeight?: number;
  nbItems?: number;
  etaDate?: string;
  etaTime?: string;
  startUnloadingDate?: string;
  startUnloadingTime?: string;
  qtyUpdateDate?: string;
  qtyUpdateTime?: string;
  endUnloadingDate?: string;
  endUnloadingTime?: string;
  departureDate?: string;
  departureTime?: string;
  etdDate?: string;
  etdTime?: string;
  podProducts?: PODProduct[];
  podImages?: PODImage[];
}

type FilterKey = "site" | "type" | "status";

interface FilterSection {
  key: FilterKey;
  label: string;
  options: { value: string; count: number }[];
}


/* ─── POD Detail Page ─── */
function PODDetailView({ record, onBack }: { record: PODRecord; onBack: () => void }) {
  const [expandedSections, setExpandedSections] = useState<string[]>(["pod", "address", "transportation", "timeTracking", "products", "podImages"]);

  const toggleSection = (s: string) =>
    setExpandedSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const SectionHeader = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center gap-2 w-full px-4 py-2 bg-muted/60 text-foreground text-xs font-bold uppercase tracking-wider hover:bg-muted transition-colors border-b border-border"
    >
      {expandedSections.includes(id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      {label}
    </button>
  );

  const Field = ({ label, value, highlight }: { label: string; value?: string | number; highlight?: boolean }) => (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider w-32 shrink-0">{label}</span>
      <span className={cn("text-[11px] px-2 py-0.5 border border-border rounded bg-background min-w-[100px]", highlight ? "text-primary font-bold" : "text-foreground")}>
        {value || "—"}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background overflow-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-primary/5">
        <h1 className="text-sm font-bold text-primary uppercase tracking-wide">Proof of Delivery</h1>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium border border-border rounded bg-background hover:bg-muted transition-colors text-foreground"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {/* Proof of Delivery */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <SectionHeader id="pod" label="Proof of Delivery" />
          <AnimatePresence>
            {expandedSections.includes("pod") && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1">
                  <Field label="Document *" value={record.document} highlight />
                  <Field label="Delivery Date" value={record.date} />
                  <Field label="BP Code" value={record.bp} />
                  <Field label="BP Name" value={record.bpName} />
                  <Field label="Reference" value={record.reference} />
                  <Field label="Last Update" value={record.lastUpdate} />
                  <Field label="Update By" value={record.updatedBy} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Address */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <SectionHeader id="address" label="Address" />
          <AnimatePresence>
            {expandedSections.includes("address") && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1">
                  <Field label="Ship to Customer" value={record.bp} />
                  <Field label="Shipment Customer Name" value={record.bpName} />
                  <Field label="Address" value={record.address} />
                  <Field label="Line 1" value={record.addressLine1} />
                  <Field label="City" value={record.city} />
                  <Field label="ZIP" value={record.zip} />
                  <Field label="Country" value={record.country} />
                  <Field label="Phone" value={record.phone} />
                  <Field label="Web" value={record.web} />
                  <Field label="GPS Long" value={record.gpsLong} />
                  <Field label="GPS Lat" value={record.gpsLat} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Google Map */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <SectionHeader id="googleMap" label="Google Map" />
          <AnimatePresence>
            {expandedSections.includes("googleMap") && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 py-3">
                  <a href={`https://www.google.com/maps?q=${record.gpsLat},${record.gpsLong}`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> View on Map
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Time Tracking */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <SectionHeader id="timeTracking" label="Time Tracking" />
          <AnimatePresence>
            {expandedSections.includes("timeTracking") && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                  <Field label="ETA Date" value={record.etaDate} highlight />
                  <Field label="ETA Time" value={record.etaTime} />
                  <Field label="Arrival Date" value={record.arrivalDate} />
                  <Field label="Arrival Time" value={record.arrivalTime} />
                  <Field label="Start Unloading" value={record.startUnloadingDate} />
                  <Field label="Time" value={record.startUnloadingTime} />
                  <Field label="Qty Update Date" value={record.qtyUpdateDate} />
                  <Field label="Qty Update Time" value={record.qtyUpdateTime} />
                  <Field label="End Unloading" value={record.endUnloadingDate} />
                  <Field label="Time" value={record.endUnloadingTime} />
                  <Field label="Departure Date" value={record.departureDate} />
                  <Field label="Time" value={record.departureTime} />
                  <Field label="ETD Date" value={record.etdDate} highlight />
                  <Field label="ETD Time" value={record.etdTime} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Transportation */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <SectionHeader id="transportation" label="Transportation" />
          <AnimatePresence>
            {expandedSections.includes("transportation") && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1">
                  <Field label="Route" value={record.route} />
                  <Field label="Schedule" value={record.schedule} />
                  <Field label="Vehicle" value={record.vehicle} />
                  <Field label="Driver" value={record.driver} />
                  <Field label="Carrier Code" value={record.carrierCode} />
                  <Field label="Carrier" value={record.carrier} />
                  <Field label="Carrier Email" value={record.carrierEmail} />
                  <Field label="Gross Weight" value={record.grossWeight} />
                  <Field label="Net Weight" value={record.netWeight} />
                  <Field label="Unit" value={record.weightUnit} />
                  <Field label="Volume" value={record.volume} />
                  <Field label="Volume Unit" value={record.volumeUnit} />
                  <Field label="NB Items" value={record.nbItems} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Products */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <SectionHeader id="products" label="Products" />
          <AnimatePresence>
            {expandedSections.includes("products") && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 py-3">
                  {record.podProducts && record.podProducts.length > 0 ? (
                    <div className="overflow-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-border bg-primary/8">
                            <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Delivery #</th>
                            <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Product</th>
                            <th className="px-3 py-1.5 text-right font-bold text-primary uppercase tracking-wider text-[10px]">Ordered Qty</th>
                            <th className="px-3 py-1.5 text-right font-bold text-primary uppercase tracking-wider text-[10px]">Delivered Qty</th>
                            <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Unit</th>
                            <th className="px-3 py-1.5 text-right font-bold text-primary uppercase tracking-wider text-[10px]">Packages</th>
                            <th className="px-3 py-1.5 text-right font-bold text-primary uppercase tracking-wider text-[10px]">Mass</th>
                            <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Unit</th>
                            <th className="px-3 py-1.5 text-right font-bold text-primary uppercase tracking-wider text-[10px]">Volume</th>
                            <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Unit</th>
                            <th className="px-3 py-1.5 text-right font-bold text-primary uppercase tracking-wider text-[10px]">Left Qty to Ship</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.podProducts.map((p, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="px-3 py-1.5 font-mono text-primary text-[10px]">{p.deliveryNum}</td>
                              <td className="px-3 py-1.5 text-foreground">{p.product}</td>
                              <td className="px-3 py-1.5 text-right text-primary font-semibold">{p.orderedQty}</td>
                              <td className="px-3 py-1.5 text-right text-primary font-semibold">{p.deliveredQty}</td>
                              <td className="px-3 py-1.5 text-foreground">{p.unit}</td>
                              <td className="px-3 py-1.5 text-right text-foreground">{p.packages}</td>
                              <td className="px-3 py-1.5 text-right text-foreground">{p.mass}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{p.massUnit}</td>
                              <td className="px-3 py-1.5 text-right text-foreground">{p.volume}</td>
                              <td className="px-3 py-1.5 text-primary">{p.volumeUnit}</td>
                              <td className="px-3 py-1.5 text-right text-foreground">{p.leftQtyToShip}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text-right text-[10px] text-muted-foreground mt-1 px-3">[1 to {record.podProducts.length} of {record.podProducts.length}]</div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">No products available.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* POD Images */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <SectionHeader id="podImages" label="POD Images" />
          <AnimatePresence>
            {expandedSections.includes("podImages") && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 py-3">
                  {record.podImages && record.podImages.length > 0 ? (
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-border bg-primary/8">
                          <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Type</th>
                          <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Document</th>
                          <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Content</th>
                          <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Post Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.podImages.map((img, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="px-3 py-1.5 text-foreground font-medium">{img.type}</td>
                            <td className="px-3 py-1.5 font-mono text-[10px] text-foreground">{img.document}</td>
                            <td className="px-3 py-2">
                              <div className="w-24 h-16 border border-border rounded bg-muted/30 flex items-center justify-center text-[9px] text-muted-foreground">
                                {img.type === "SIGNATURE" ? "✍ Signature" : "📷 Photo"}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-foreground">{img.postDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">No images available.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── Main POD Tracking List ─── */
export default function PODTracking() {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<FilterKey, string[]>>({
    site: [],
    type: [],
    status: [],
  });
  const [expandedFilters, setExpandedFilters] = useState<FilterKey[]>(["site", "type", "status"]);
  const [groupBy, setGroupBy] = useState<"site" | "date" | "type" | "none">("site");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedPOD, setSelectedPOD] = useState<PODRecord | null>(null);
  const [data, setData] = useState<PODRecord[]>([]);
  const [allSiteCodes, setAllSiteCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Local dates (not UTC), so the range is right in the early morning too.
  const daysFromToday = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [dateFrom, setDateFrom] = useState<string>(daysFromToday(-30));
  const [dateTo, setDateTo] = useState<string>(daysFromToday(7));

  // Every site, so the Site filter lists them all even when a site has no records in the range.
  useEffect(() => {
    fetchTmsSites().then((rows) => setAllSiteCodes(rows.map((r) => r.siteCode))).catch(() => setAllSiteCodes([]));
  }, []);

  // Real POD data for the chosen dates.
  useEffect(() => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchLiveReport<PODRecord[]>("pod-tracking", null, dateFrom, dateTo)
      .then((rows) => { if (!cancelled) setData(rows); })
      .catch((e) => { if (!cancelled) { setData([]); setLoadError(String(e?.message ?? e)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  const filterSections: FilterSection[] = useMemo(() => {
    const siteCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    allSiteCodes.forEach((c) => { siteCounts[c] = 0; });
    data.forEach((r) => {
      siteCounts[r.site] = (siteCounts[r.site] || 0) + 1;
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    return [
      { key: "site" as FilterKey, label: "SITE", options: Object.entries(siteCounts).map(([value, count]) => ({ value, count })) },
      { key: "type" as FilterKey, label: "TYPE", options: Object.entries(typeCounts).map(([value, count]) => ({ value, count })) },
      { key: "status" as FilterKey, label: "STATUS", options: Object.entries(statusCounts).map(([value, count]) => ({ value, count })) },
    ];
  }, [data, allSiteCodes]);

  const filteredData = useMemo(() => {
    return data.filter((r) => {
      if (selectedFilters.site.length && !selectedFilters.site.includes(r.site)) return false;
      if (selectedFilters.type.length && !selectedFilters.type.includes(r.type)) return false;
      if (selectedFilters.status.length && !selectedFilters.status.includes(r.status)) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.document.toLowerCase().includes(q) || r.bpName.toLowerCase().includes(q) || r.bp.toLowerCase().includes(q) || r.city.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, selectedFilters, search]);

  const sort = useSortable(filteredData);

  const groupedData = useMemo(() => {
    if (groupBy === "none") return { "All Records": sort.sorted };
    const groups: Record<string, PODRecord[]> = {};
    sort.sorted.forEach((r) => {
      const key = groupBy === "site" ? r.site : groupBy === "date" ? r.date : r.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [sort.sorted, groupBy]);

  useMemo(() => {
    setExpandedGroups(Object.keys(groupedData));
  }, [Object.keys(groupedData).join(",")]);

  const toggleFilter = (key: FilterKey, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
  };

  const toggleFilterSection = (key: FilterKey) => {
    setExpandedFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const columns = [
    { key: "expand", label: "", width: "w-8" },
    { key: "pod", label: "POD", width: "w-16" },
    { key: "site", label: "Site", width: "w-16" },
    { key: "document", label: "Document", width: "w-44" },
    { key: "date", label: "Date", width: "w-24" },
    { key: "type", label: "Type", width: "w-28" },
    { key: "status", label: "Status", width: "w-24" },
    { key: "bp", label: "BP", width: "w-14" },
    { key: "bpName", label: "BP Name", width: "w-44" },
    { key: "city", label: "City", width: "w-24" },
    { key: "state", label: "State", width: "w-24" },
    { key: "deliveryMode", label: "Delivery Mode", width: "w-24" },
    { key: "pack", label: "Pack", width: "w-14" },
    { key: "weight", label: "Weight", width: "w-14" },
    { key: "weightUnit", label: "Unit", width: "w-12" },
    { key: "volume", label: "Volume", width: "w-16" },
    { key: "volumeUnit", label: "Unit", width: "w-12" },
    { key: "depDate", label: "Dep Date", width: "w-24" },
    { key: "depTime", label: "Dep Time", width: "w-20" },
    { key: "arrivalDate", label: "Arrival Date", width: "w-24" },
    { key: "arrivalTime", label: "Arrival Time", width: "w-20" },
    { key: "vehicle", label: "Vehicle", width: "w-20" },
    { key: "driver", label: "Driver", width: "w-24" },
  ];

  // Show POD detail view
  if (selectedPOD) {
    return <PODDetailView record={selectedPOD} onBack={() => setSelectedPOD(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-primary/5">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-primary uppercase tracking-wide">POD Tracking</h1>
          <span className="text-[10px] text-muted-foreground">Shipment & delivery tracking report</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)}
              className="px-1.5 py-0.5 text-[11px] border border-border rounded bg-background text-foreground" />
            <span>to</span>
            <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
              className="px-1.5 py-0.5 text-[11px] border border-border rounded bg-background text-foreground" />
            {loading && <span>Loading…</span>}
            {loadError && <span className="text-destructive" title={loadError}>Could not load POD data</span>}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-3 py-1 text-[11px] border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-44"
            />
          </div>
          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="px-2 py-1 text-[11px] font-medium text-foreground border border-border rounded bg-background appearance-none pr-6 cursor-pointer"
            >
              <option value="site">Group: Site</option>
              <option value="date">Group: Date</option>
              <option value="type">Group: Type</option>
              <option value="none">No Grouping</option>
            </select>
            <Group className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute z-20 flex items-center justify-center w-5 h-10 bg-card border border-border rounded-r-md shadow-sm hover:bg-muted transition-colors"
          style={{ left: sidebarOpen ? '190px' : '0px', top: '50%', transform: 'translateY(-50%)' }}
          title={sidebarOpen ? "Hide filters" : "Show filters"}
        >
          {sidebarOpen ? <PanelLeftClose className="w-3 h-3 text-muted-foreground" /> : <PanelLeft className="w-3 h-3 text-muted-foreground" />}
        </button>

        {/* Left Filter Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 190, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 border-r border-border bg-card overflow-y-auto overflow-x-hidden"
            >
              {filterSections.map((section) => (
                <div key={section.key} className="border-b border-border">
                  <button
                    onClick={() => toggleFilterSection(section.key)}
                    className="flex items-center gap-1.5 w-full px-3 py-2 bg-primary/8 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary/12 transition-colors"
                  >
                    {expandedFilters.includes(section.key) ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                    {section.label}
                  </button>
                  <AnimatePresence>
                    {expandedFilters.includes(section.key) && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                        <div className="px-2 py-1.5 space-y-0.5">
                          {section.options.map((opt) => (
                            <label
                              key={opt.value}
                              className={cn(
                                "flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] cursor-pointer transition-colors hover:bg-muted",
                                selectedFilters[section.key].includes(opt.value) && "bg-primary/8 text-primary font-medium"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedFilters[section.key].includes(opt.value)}
                                onChange={() => toggleFilter(section.key, opt.value)}
                                className="rounded border-border text-primary focus:ring-primary/20 w-2.5 h-2.5"
                              />
                              <span className="text-foreground">{opt.value}</span>
                              <span className="text-muted-foreground ml-auto text-[10px]">({opt.count})</span>
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Table */}
          <div className="flex-1 overflow-auto">
            {Object.entries(groupedData).map(([group, records]) => (
              <div key={group}>
                {groupBy !== "none" && (
                  <button
                    onClick={() => toggleGroup(group)}
                    className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[11px] font-semibold text-primary bg-primary/5 border-b border-border hover:bg-primary/10 transition-colors sticky top-0 z-10"
                  >
                    {expandedGroups.includes(group) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span className="uppercase tracking-wider">
                      {groupBy === "site" ? "SITE" : groupBy === "date" ? "Date of DOCUMENT" : "TYPE"} =&gt; {group}
                    </span>
                    <span className="text-muted-foreground font-normal ml-1">({records.length})</span>
                  </button>
                )}
                <AnimatePresence>
                  {(groupBy === "none" || expandedGroups.includes(group)) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.12 }}>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-border bg-primary/8">
                            {columns.map((col) =>
                              col.key === "expand" || col.key === "pod" ? (
                                <th key={col.key} className={cn("px-2 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px] whitespace-nowrap", col.width)}>
                                  {col.label}
                                </th>
                              ) : (
                                <SortableTh key={col.key} sortKey={col.key} sort={sort} className={cn("px-2 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px] whitespace-nowrap", col.width)}>
                                  {col.label}
                                </SortableTh>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r) => (
                            <>
                              <tr
                                key={r.id}
                                className={cn(
                                  "border-b border-border hover:bg-muted/40 transition-colors cursor-pointer",
                                  expandedRows.includes(r.id) && "bg-muted/30"
                                )}
                                onClick={() => toggleRow(r.id)}
                              >
                                <td className="px-2 py-1.5">
                                  <motion.div animate={{ rotate: expandedRows.includes(r.id) ? 90 : 0 }} transition={{ duration: 0.15 }}>
                                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                  </motion.div>
                                </td>
                                <td className="px-2 py-1.5">
                                  {r.status === "Completed" && r.pod ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedPOD(r); }}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-primary/30 text-primary text-[9px] font-semibold bg-primary/5 hover:bg-primary/15 hover:border-primary/50 transition-colors cursor-pointer"
                                    >
                                      <FileText className="w-2 h-2" /> POD
                                    </button>
                                  ) : r.pod ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border text-muted-foreground text-[9px] font-semibold bg-muted/30 cursor-not-allowed opacity-50">
                                      <FileText className="w-2 h-2" /> POD
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-2 py-1.5 text-foreground">{r.site}</td>
                                <td className="px-2 py-1.5 font-mono text-primary text-[10px]">{r.document}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.date}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.type}</td>
                                <td className="px-2 py-1.5"><StatusBadge status={r.status} variant={r.status === "Completed" ? "success" : r.status === "In Progress" ? "warning" : r.status === "Planned" ? "primary" : "muted"} /></td>
                                <td className="px-2 py-1.5 text-foreground">{r.bp}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.bpName}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.city}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{r.state}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.deliveryMode}</td>
                                <td className="px-2 py-1.5 text-foreground text-right">{r.pack}</td>
                                <td className="px-2 py-1.5 text-foreground text-right">{r.weight}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{r.weightUnit}</td>
                                <td className="px-2 py-1.5 text-foreground text-right">{r.volume}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{r.volumeUnit}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.depDate}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.depTime}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.arrivalDate}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.arrivalTime}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.vehicle}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.driver}</td>
                              </tr>
                              <AnimatePresence>
                                {expandedRows.includes(r.id) && r.lineItems.length > 0 && (
                                  <motion.tr key={`${r.id}-detail`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                                    <td colSpan={columns.length} className="p-0">
                                      <div className="bg-muted/20 border-b border-border">
                                        <table className="w-full text-[11px] ml-8" style={{ maxWidth: "calc(100% - 2rem)" }}>
                                          <thead>
                                            <tr className="border-b border-border bg-muted/40">
                                              <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Doc Num</th>
                                              <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Order Number</th>
                                              <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Product ID</th>
                                              <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Description</th>
                                              <th className="px-3 py-1.5 text-right font-bold text-primary uppercase tracking-wider text-[10px]">Qty to Prepare</th>
                                              <th className="px-3 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px]">Unit</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {r.lineItems.map((item, idx) => (
                                              <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                                                <td className="px-3 py-1.5 font-mono text-[10px] text-foreground">{item.docNum}</td>
                                                <td className="px-3 py-1.5 font-mono text-[10px] text-foreground">{item.orderNumber}</td>
                                                <td className="px-3 py-1.5 text-foreground">{item.productId}</td>
                                                <td className="px-3 py-1.5 text-foreground">{item.description}</td>
                                                <td className="px-3 py-1.5 text-foreground text-right font-semibold">{item.qtyToPrepare}</td>
                                                <td className="px-3 py-1.5 text-muted-foreground">{item.unit}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </motion.tr>
                                )}
                              </AnimatePresence>
                            </>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-primary/5 text-[10px] text-muted-foreground">
            <span>{filteredData.length} records</span>
            <span>Grouped by {groupBy === "none" ? "—" : groupBy}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
