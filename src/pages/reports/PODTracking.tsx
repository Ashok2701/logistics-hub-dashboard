import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Columns, ArrowUpDown, Group, Download, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

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
  deliveryType: string;
}

const sampleData: PODRecord[] = [
  { id: "1", pod: true, site: "CAT01", document: "CAT012602SDH00210", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryType: "OUR" },
  { id: "2", pod: true, site: "CAT01", document: "CAT012602SDH00211", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryType: "OUR" },
  { id: "3", pod: true, site: "CAT01", document: "CAT012602SDH00212", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryType: "OUR" },
  { id: "4", pod: false, site: "CAT01", document: "CAT012602SDH00213", date: "02-26-2026", type: "DELIVERY", status: "Planned", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryType: "OUR" },
  { id: "5", pod: true, site: "CAT01", document: "CAT012602SDH00214", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryType: "OUR" },
  { id: "6", pod: true, site: "CAT01", document: "CAT012602SDH00216", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryType: "OUR" },
  { id: "7", pod: false, site: "CAT01", document: "CAT012602SDH00220", date: "02-27-2026", type: "SHIPMENT PREP", status: "In Progress", bp: "H102", bpName: "Belfast Grand Central", city: "BELFAST", state: "Co Antrim", deliveryType: "OUR" },
  { id: "8", pod: false, site: "CAT01", document: "CAT012602SDH00221", date: "02-27-2026", type: "SHIPMENT PREP", status: "Planned", bp: "H102", bpName: "Belfast Grand Central", city: "BELFAST", state: "Co Antrim", deliveryType: "OUR" },
  { id: "9", pod: false, site: "HYG01", document: "HYG012602SDH00050", date: "02-26-2026", type: "DELIVERY", status: "To Plan", bp: "K445", bpName: "Hygeia Supplies Ltd", city: "DUBLIN", state: "Leinster", deliveryType: "OUR" },
  { id: "10", pod: true, site: "IRE01", document: "IRE012602SDH00101", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "M201", bpName: "Galway Bay Seafoods", city: "GALWAY", state: "Connacht", deliveryType: "OUR" },
  { id: "11", pod: false, site: "IRE01", document: "IRE012602SDH00102", date: "02-26-2026", type: "DELIVERY", status: "Skipped", bp: "M201", bpName: "Galway Bay Seafoods", city: "GALWAY", state: "Connacht", deliveryType: "OUR" },
  { id: "12", pod: true, site: "IRE01", document: "IRE012602SDH00103", date: "02-27-2026", type: "DELIVERY", status: "Completed", bp: "N330", bpName: "Cork Harbour Foods", city: "CORK", state: "Munster", deliveryType: "OUR" },
  { id: "13", pod: false, site: "IRE01", document: "IRE012602SDH00104", date: "02-27-2026", type: "SHIPMENT PREP", status: "Planned", bp: "N330", bpName: "Cork Harbour Foods", city: "CORK", state: "Munster", deliveryType: "OUR" },
  { id: "14", pod: true, site: "IRE01", document: "IRE012602SDH00105", date: "02-27-2026", type: "DELIVERY", status: "Completed", bp: "P100", bpName: "Limerick Supply Co", city: "LIMERICK", state: "Munster", deliveryType: "OUR" },
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

  // Auto-expand all groups on first render / filter change
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-semibold text-foreground">POD Tracking</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Shipment & delivery tracking report</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Filter Sidebar */}
        <div className="w-[220px] flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          {filterSections.map((section) => (
            <div key={section.key} className="border-b border-border">
              <button
                onClick={() => toggleFilterSection(section.key)}
                className="flex items-center gap-2 w-full px-4 py-2.5 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/15 transition-colors"
              >
                {expandedFilters.includes(section.key) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {section.label}
              </button>
              <AnimatePresence>
                {expandedFilters.includes(section.key) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-2 space-y-1">
                      {section.options.map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors hover:bg-muted",
                            selectedFilters[section.key].includes(opt.value) && "bg-primary/8 text-primary font-medium"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilters[section.key].includes(opt.value)}
                            onChange={() => toggleFilter(section.key, opt.value)}
                            className="rounded border-border text-primary focus:ring-primary/20 w-3 h-3"
                          />
                          <span className="text-foreground">{opt.value}</span>
                          <span className="text-muted-foreground ml-auto">({opt.count})</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Quick search..."
                className="pl-9 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-52"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                <Columns className="w-3.5 h-3.5" /> Columns
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                <ArrowUpDown className="w-3.5 h-3.5" /> Sorting
              </button>
              <div className="relative">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors bg-background appearance-none pr-7 cursor-pointer"
                >
                  <option value="site">Group by Site</option>
                  <option value="date">Group by Date</option>
                  <option value="type">Group by Type</option>
                  <option value="none">No Grouping</option>
                </select>
                <Group className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {Object.entries(groupedData).map(([group, records]) => (
              <div key={group}>
                {groupBy !== "none" && (
                  <button
                    onClick={() => toggleGroup(group)}
                    className="flex items-center gap-2 w-full px-5 py-2 text-xs font-semibold text-foreground bg-muted/50 border-b border-border hover:bg-muted transition-colors sticky top-0 z-10"
                  >
                    {expandedGroups.includes(group) ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="uppercase tracking-wider">
                      {groupBy === "site" ? "SITE" : groupBy === "date" ? "Date of DOCUMENT" : "TYPE"} =&gt; {group}
                    </span>
                    <span className="text-muted-foreground font-normal ml-2">({records.length} records)</span>
                  </button>
                )}
                <AnimatePresence>
                  {(groupBy === "none" || expandedGroups.includes(group)) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider w-8"></th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">POD</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Document</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">BP</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">BP Name</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">City</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">State</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Delivery</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r, i) => (
                            <motion.tr
                              key={r.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              className="border-b border-border hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-3 py-2">
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              </td>
                              <td className="px-3 py-2">
                                {r.pod && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-primary/30 text-primary text-[10px] font-medium bg-primary/5">
                                    <FileText className="w-2.5 h-2.5" />
                                    POD
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-foreground">{r.site}</td>
                              <td className="px-3 py-2 font-mono text-primary hover:underline cursor-pointer">{r.document}</td>
                              <td className="px-3 py-2 text-foreground">{r.date}</td>
                              <td className="px-3 py-2 text-foreground">{r.type}</td>
                              <td className={cn("px-3 py-2 font-semibold", statusColor[r.status] || "text-foreground")}>{r.status}</td>
                              <td className="px-3 py-2 text-foreground">{r.bp}</td>
                              <td className="px-3 py-2 text-foreground">{r.bpName}</td>
                              <td className="px-3 py-2 text-foreground">{r.city}</td>
                              <td className="px-3 py-2 text-muted-foreground">{r.state}</td>
                              <td className="px-3 py-2 text-foreground">{r.deliveryType}</td>
                            </motion.tr>
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
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-card text-xs text-muted-foreground">
            <span>{filteredData.length} records found</span>
            <span>Grouped by {groupBy === "none" ? "—" : groupBy}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
