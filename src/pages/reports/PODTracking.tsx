import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Group, ChevronDown, ChevronRight, FileText, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PODLineItem {
  docNum: string;
  orderNumber: string;
  productId: string;
  description: string;
  qtyToPrepare: number;
  unit: string;
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
}

const sampleData: PODRecord[] = [
  { id: "1", pod: true, site: "CAT01", document: "CAT012602SDH00210", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "06:30", arrivalDate: "02-26-2026", arrivalTime: "08:15", vehicle: "VH-101", driver: "J. Murphy", lineItems: [
    { docNum: "CAT012602SDH00210", orderNumber: "CAT012602SON00217", productId: "11699", description: "Mixing Glasses Starburst 700ml", qtyToPrepare: 6, unit: "EA" },
    { docNum: "CAT012602SDH00210", orderNumber: "CAT012602SON00217", productId: "11700", description: "Cocktail Shaker Boston 28oz", qtyToPrepare: 4, unit: "EA" },
  ]},
  { id: "2", pod: true, site: "CAT01", document: "CAT012602SDH00211", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 2, weight: 12, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "06:30", arrivalDate: "02-26-2026", arrivalTime: "08:15", vehicle: "VH-101", driver: "J. Murphy", lineItems: [
    { docNum: "CAT012602SDH00211", orderNumber: "CAT012602SON00218", productId: "22450", description: "Premium Bar Napkins 1000pk", qtyToPrepare: 10, unit: "PK" },
  ]},
  { id: "3", pod: true, site: "CAT01", document: "CAT012602SDH00212", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 1, weight: 5, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "07:00", arrivalDate: "02-26-2026", arrivalTime: "09:00", vehicle: "VH-102", driver: "S. O'Brien", lineItems: [] },
  { id: "4", pod: false, site: "CAT01", document: "CAT012602SDH00213", date: "02-26-2026", type: "DELIVERY", status: "Planned", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "5", pod: true, site: "CAT01", document: "CAT012602SDH00214", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 3, weight: 18, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "07:00", arrivalDate: "02-26-2026", arrivalTime: "09:30", vehicle: "VH-102", driver: "S. O'Brien", lineItems: [
    { docNum: "CAT012602SDH00214", orderNumber: "CAT012602SON00220", productId: "33100", description: "Disposable Gloves Medium Box", qtyToPrepare: 20, unit: "BX" },
  ]},
  { id: "6", pod: true, site: "CAT01", document: "CAT012602SDH00216", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 1, weight: 8, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "08:00", arrivalDate: "02-26-2026", arrivalTime: "10:00", vehicle: "VH-103", driver: "D. Kelly", lineItems: [] },
  { id: "7", pod: false, site: "CAT01", document: "CAT012602SDH00220", date: "02-27-2026", type: "SHIPMENT PREP", status: "In Progress", bp: "H102", bpName: "Belfast Grand Central", city: "BELFAST", state: "Co Antrim", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "8", pod: false, site: "CAT01", document: "CAT012602SDH00221", date: "02-27-2026", type: "SHIPMENT PREP", status: "Planned", bp: "H102", bpName: "Belfast Grand Central", city: "BELFAST", state: "Co Antrim", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "9", pod: false, site: "HYG01", document: "HYG012602SDH00050", date: "02-26-2026", type: "DELIVERY", status: "To Plan", bp: "K445", bpName: "Hygeia Supplies Ltd", city: "DUBLIN", state: "Leinster", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "10", pod: true, site: "IRE01", document: "IRE012602SDH00101", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "M201", bpName: "Galway Bay Seafoods", city: "GALWAY", state: "Connacht", deliveryMode: "OUR", pack: 5, weight: 45, weightUnit: "KG", volume: 2, volumeUnit: "M3", depDate: "02-26-2026", depTime: "05:00", arrivalDate: "02-26-2026", arrivalTime: "11:00", vehicle: "VH-201", driver: "P. Walsh", lineItems: [
    { docNum: "IRE012602SDH00101", orderNumber: "IRE012602SON00050", productId: "55200", description: "Fresh Atlantic Salmon 5kg", qtyToPrepare: 8, unit: "EA" },
    { docNum: "IRE012602SDH00101", orderNumber: "IRE012602SON00050", productId: "55201", description: "Smoked Mackerel Fillets 1kg", qtyToPrepare: 12, unit: "EA" },
    { docNum: "IRE012602SDH00101", orderNumber: "IRE012602SON00051", productId: "55300", description: "Prawns Tiger King 2kg", qtyToPrepare: 5, unit: "EA" },
  ]},
  { id: "11", pod: false, site: "IRE01", document: "IRE012602SDH00102", date: "02-26-2026", type: "DELIVERY", status: "Skipped", bp: "M201", bpName: "Galway Bay Seafoods", city: "GALWAY", state: "Connacht", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "12", pod: true, site: "IRE01", document: "IRE012602SDH00103", date: "02-27-2026", type: "DELIVERY", status: "Completed", bp: "N330", bpName: "Cork Harbour Foods", city: "CORK", state: "Munster", deliveryMode: "OUR", pack: 2, weight: 15, weightUnit: "KG", volume: 1, volumeUnit: "M3", depDate: "02-27-2026", depTime: "06:00", arrivalDate: "02-27-2026", arrivalTime: "10:30", vehicle: "VH-202", driver: "R. Byrne", lineItems: [] },
  { id: "13", pod: false, site: "IRE01", document: "IRE012602SDH00104", date: "02-27-2026", type: "SHIPMENT PREP", status: "Planned", bp: "N330", bpName: "Cork Harbour Foods", city: "CORK", state: "Munster", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "14", pod: true, site: "IRE01", document: "IRE012602SDH00105", date: "02-27-2026", type: "DELIVERY", status: "Completed", bp: "P100", bpName: "Limerick Supply Co", city: "LIMERICK", state: "Munster", deliveryMode: "OUR", pack: 4, weight: 30, weightUnit: "KG", volume: 2, volumeUnit: "M3", depDate: "02-27-2026", depTime: "06:00", arrivalDate: "02-27-2026", arrivalTime: "12:00", vehicle: "VH-203", driver: "T. Flynn", lineItems: [] },
];

type FilterKey = "site" | "type" | "status";

interface FilterSection {
  key: FilterKey;
  label: string;
  options: { value: string; count: number }[];
}

const statusColor: Record<string, string> = {
  Completed: "text-emerald-600",
  Planned: "text-red-500",
  "In Progress": "text-amber-500",
  Skipped: "text-muted-foreground",
  "To Plan": "text-blue-500",
};

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

  const filterSections: FilterSection[] = useMemo(() => {
    const siteCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    sampleData.forEach((r) => {
      siteCounts[r.site] = (siteCounts[r.site] || 0) + 1;
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    return [
      { key: "site" as FilterKey, label: "SITE", options: Object.entries(siteCounts).map(([value, count]) => ({ value, count })) },
      { key: "type" as FilterKey, label: "TYPE", options: Object.entries(typeCounts).map(([value, count]) => ({ value, count })) },
      { key: "status" as FilterKey, label: "STATUS", options: Object.entries(statusCounts).map(([value, count]) => ({ value, count })) },
    ];
  }, []);

  const filteredData = useMemo(() => {
    return sampleData.filter((r) => {
      if (selectedFilters.site.length && !selectedFilters.site.includes(r.site)) return false;
      if (selectedFilters.type.length && !selectedFilters.type.includes(r.type)) return false;
      if (selectedFilters.status.length && !selectedFilters.status.includes(r.status)) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.document.toLowerCase().includes(q) || r.bpName.toLowerCase().includes(q) || r.bp.toLowerCase().includes(q) || r.city.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedFilters, search]);

  const groupedData = useMemo(() => {
    if (groupBy === "none") return { "All Records": filteredData };
    const groups: Record<string, PODRecord[]> = {};
    filteredData.forEach((r) => {
      const key = groupBy === "site" ? r.site : groupBy === "date" ? r.date : r.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [filteredData, groupBy]);

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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-primary/5">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-primary uppercase tracking-wide">POD Tracking</h1>
          <span className="text-[10px] text-muted-foreground">Shipment & delivery tracking report</span>
        </div>
        <div className="flex items-center gap-2">
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
                            {columns.map((col) => (
                              <th key={col.key} className={cn("px-2 py-1.5 text-left font-bold text-primary uppercase tracking-wider text-[10px] whitespace-nowrap", col.width)}>
                                {col.label}
                              </th>
                            ))}
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
                                  {r.pod && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-primary/30 text-primary text-[9px] font-semibold bg-primary/5">
                                      <FileText className="w-2 h-2" /> POD
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 text-foreground">{r.site}</td>
                                <td className="px-2 py-1.5 font-mono text-primary text-[10px]">{r.document}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.date}</td>
                                <td className="px-2 py-1.5 text-foreground">{r.type}</td>
                                <td className={cn("px-2 py-1.5 font-semibold", statusColor[r.status] || "text-foreground")}>{r.status}</td>
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
