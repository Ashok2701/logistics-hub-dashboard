import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, X, Truck, User, Route, MapPin, Package, Clock, Calendar as CalendarIcon, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface OrderProduct {
  productId: string;
  description: string;
  qty: number;
  unit: string;
  weight: number;
  weightUnit: string;
}

interface Order {
  id: string;
  orderNumber: string;
  site: string;
  customer: string;
  customerName: string;
  type: "DELIVERY" | "PICKUP" | "SHIPMENT PREP";
  status: "Completed" | "Planned" | "In Progress" | "To Plan";
  date: Date;
  time: string;
  vehicle: string;
  driver: string;
  routeNumber: string;
  origin: string;
  destination: string;
  totalPacks: number;
  totalWeight: number;
  products: OrderProduct[];
}

const sampleOrders: Order[] = [
  {
    id: "1", orderNumber: "CAT012602SON00210", site: "CAT01", customer: "G819", customerName: "Tullyglass House Hotel Ltd",
    type: "DELIVERY", status: "Completed", date: new Date(2026, 2, 26), time: "08:30", vehicle: "VH-101", driver: "J. Murphy",
    routeNumber: "RT-001", origin: "CAT01 Warehouse", destination: "Ballymena",
    totalPacks: 4, totalWeight: 32,
    products: [
      { productId: "11699", description: "Mixing Glasses Starburst 700ml", qty: 6, unit: "EA", weight: 4.2, weightUnit: "KG" },
      { productId: "11700", description: "Cocktail Shaker Boston 28oz", qty: 4, unit: "EA", weight: 2.8, weightUnit: "KG" },
      { productId: "22450", description: "Premium Bar Napkins 1000pk", qty: 10, unit: "PK", weight: 5.0, weightUnit: "KG" },
    ],
  },
  {
    id: "2", orderNumber: "CAT012602SON00211", site: "CAT01", customer: "G819", customerName: "Tullyglass House Hotel Ltd",
    type: "DELIVERY", status: "Completed", date: new Date(2026, 2, 26), time: "10:00", vehicle: "VH-101", driver: "J. Murphy",
    routeNumber: "RT-001", origin: "CAT01 Warehouse", destination: "Ballymena",
    totalPacks: 2, totalWeight: 12,
    products: [
      { productId: "33100", description: "Disposable Gloves Medium Box", qty: 20, unit: "BX", weight: 6.0, weightUnit: "KG" },
    ],
  },
  {
    id: "3", orderNumber: "CAT012602SON00212", site: "CAT01", customer: "H102", customerName: "Belfast Grand Central",
    type: "SHIPMENT PREP", status: "In Progress", date: new Date(2026, 2, 27), time: "07:00", vehicle: "VH-102", driver: "S. O'Brien",
    routeNumber: "RT-003", origin: "CAT01 Warehouse", destination: "Belfast",
    totalPacks: 0, totalWeight: 0,
    products: [],
  },
  {
    id: "4", orderNumber: "IRE012602SON00050", site: "IRE01", customer: "M201", customerName: "Galway Bay Seafoods",
    type: "DELIVERY", status: "Completed", date: new Date(2026, 2, 26), time: "05:30", vehicle: "VH-201", driver: "P. Walsh",
    routeNumber: "RT-010", origin: "IRE01 Warehouse", destination: "Galway",
    totalPacks: 5, totalWeight: 45,
    products: [
      { productId: "55200", description: "Fresh Atlantic Salmon 5kg", qty: 8, unit: "EA", weight: 40.0, weightUnit: "KG" },
      { productId: "55201", description: "Smoked Mackerel Fillets 1kg", qty: 12, unit: "EA", weight: 12.0, weightUnit: "KG" },
    ],
  },
  {
    id: "5", orderNumber: "IRE012602SON00051", site: "IRE01", customer: "N330", customerName: "Cork Harbour Foods",
    type: "DELIVERY", status: "Planned", date: new Date(2026, 2, 28), time: "06:00", vehicle: "VH-202", driver: "R. Byrne",
    routeNumber: "RT-012", origin: "IRE01 Warehouse", destination: "Cork",
    totalPacks: 2, totalWeight: 15,
    products: [
      { productId: "55300", description: "Prawns Tiger King 2kg", qty: 5, unit: "EA", weight: 10.0, weightUnit: "KG" },
    ],
  },
  {
    id: "6", orderNumber: "CAT012602SON00215", site: "CAT01", customer: "G819", customerName: "Tullyglass House Hotel Ltd",
    type: "DELIVERY", status: "Planned", date: new Date(2026, 2, 30), time: "09:00", vehicle: "", driver: "",
    routeNumber: "RT-005", origin: "CAT01 Warehouse", destination: "Ballymena",
    totalPacks: 0, totalWeight: 0,
    products: [
      { productId: "44100", description: "Glass Polishing Cloth Pack", qty: 15, unit: "PK", weight: 3.0, weightUnit: "KG" },
    ],
  },
  {
    id: "7", orderNumber: "HYG012602SON00060", site: "HYG01", customer: "K445", customerName: "Hygeia Supplies Ltd",
    type: "PICKUP", status: "To Plan", date: new Date(2026, 2, 25), time: "14:00", vehicle: "", driver: "",
    routeNumber: "", origin: "Dublin Depot", destination: "HYG01 Warehouse",
    totalPacks: 3, totalWeight: 22,
    products: [
      { productId: "66100", description: "Industrial Sanitizer 5L", qty: 10, unit: "EA", weight: 50.0, weightUnit: "KG" },
    ],
  },
  {
    id: "8", orderNumber: "CAT012602SON00220", site: "CAT01", customer: "G819", customerName: "Tullyglass House Hotel Ltd",
    type: "DELIVERY", status: "Completed", date: new Date(2026, 2, 24), time: "08:00", vehicle: "VH-103", driver: "D. Kelly",
    routeNumber: "RT-002", origin: "CAT01 Warehouse", destination: "Ballymena",
    totalPacks: 1, totalWeight: 8,
    products: [],
  },
];

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  Planned: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
  "In Progress": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  "To Plan": { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" },
};

const typeColor: Record<string, string> = {
  DELIVERY: "border-l-primary",
  PICKUP: "border-l-amber-500",
  "SHIPMENT PREP": "border-l-violet-500",
};

type ViewMode = "month" | "week" | "day";

export default function CalendarReport() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 26));
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const navigate = (dir: "prev" | "next") => {
    if (viewMode === "month") setCurrentDate(dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(dir === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    else setCurrentDate(dir === "prev" ? addDays(currentDate, -1) : addDays(currentDate, 1));
  };

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy");
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }, [currentDate, viewMode]);

  // Generate calendar days for month view
  const monthDays = useMemo(() => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const calStart = startOfWeek(ms, { weekStartsOn: 1 });
    const calEnd = endOfWeek(me, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // Generate week days
  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate]);

  const getOrdersForDate = (date: Date) => sampleOrders.filter((o) => isSameDay(o.date, date));

  const OrderChip = ({ order }: { order: Order }) => {
    const sc = statusConfig[order.status] || statusConfig.Planned;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
        className={cn(
          "w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate border-l-2 transition-all hover:shadow-sm hover:scale-[1.02]",
          typeColor[order.type] || "border-l-muted",
          sc.bg, sc.text,
        )}
        title={`${order.orderNumber} - ${order.customerName}`}
      >
        <span className="font-medium">{order.time}</span>{" "}
        <span className="opacity-80">{order.customerName.split(" ").slice(0, 2).join(" ")}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-primary/5">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-bold text-primary uppercase tracking-wide">Order Calendar</h1>
          <span className="text-[10px] text-muted-foreground">Schedule & delivery overview</span>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-muted rounded-md p-0.5">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1 text-[11px] font-medium rounded transition-all capitalize",
                  viewMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          {/* Navigation */}
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => navigate("prev")} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-[12px] font-semibold text-foreground min-w-[160px] text-center">{headerLabel}</span>
            <button onClick={() => navigate("next")} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <button
            onClick={() => setCurrentDate(new Date(2026, 2, 26))}
            className="px-2.5 py-1 text-[11px] font-medium text-primary border border-primary/20 rounded hover:bg-primary/5 transition-colors ml-1"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-auto">
        {viewMode === "month" && (
          <div className="h-full flex flex-col">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  {d}
                </div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {monthDays.map((day, i) => {
                const orders = getOrdersForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date(2026, 2, 26));
                return (
                  <div
                    key={i}
                    className={cn(
                      "border-b border-r border-border p-1 min-h-[90px] transition-colors",
                      !isCurrentMonth && "bg-muted/20",
                      isToday && "bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={cn(
                          "text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full",
                          isToday && "bg-primary text-primary-foreground",
                          !isCurrentMonth && "text-muted-foreground/50",
                          isCurrentMonth && !isToday && "text-foreground",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {orders.length > 0 && (
                        <span className="text-[9px] text-muted-foreground">{orders.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {orders.slice(0, 3).map((o) => (
                        <OrderChip key={o.id} order={o} />
                      ))}
                      {orders.length > 3 && (
                        <span className="text-[9px] text-muted-foreground pl-1">+{orders.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <div className="h-full flex flex-col">
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className={cn("px-2 py-2 text-center border-r border-border", isSameDay(day, new Date(2026, 2, 26)) && "bg-primary/5")}>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">{format(day, "EEE")}</div>
                  <div className={cn("text-lg font-bold", isSameDay(day, new Date(2026, 2, 26)) ? "text-primary" : "text-foreground")}>{format(day, "d")}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1">
              {weekDays.map((day) => {
                const orders = getOrdersForDate(day);
                return (
                  <div key={day.toISOString()} className={cn("border-r border-border p-2 space-y-1 overflow-y-auto", isSameDay(day, new Date(2026, 2, 26)) && "bg-primary/3")}>
                    {orders.map((o) => {
                      const sc = statusConfig[o.status] || statusConfig.Planned;
                      return (
                        <button
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className={cn("w-full text-left p-2 rounded-md border-l-2 transition-all hover:shadow-md", typeColor[o.type], sc.bg)}
                        >
                          <div className={cn("text-[11px] font-semibold", sc.text)}>{o.time} — {o.type}</div>
                          <div className="text-[10px] text-foreground/70 truncate mt-0.5">{o.customerName}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">{o.orderNumber}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                            <span className={cn("text-[9px] font-medium", sc.text)}>{o.status}</span>
                          </div>
                        </button>
                      );
                    })}
                    {orders.length === 0 && (
                      <div className="text-[10px] text-muted-foreground/40 text-center pt-4">No orders</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "day" && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-2 max-w-4xl mx-auto">
              {getOrdersForDate(currentDate).length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No orders for this day</p>
                </div>
              ) : (
                getOrdersForDate(currentDate).map((o) => {
                  const sc = statusConfig[o.status] || statusConfig.Planned;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border border-border border-l-4 bg-card hover:shadow-md transition-all",
                        typeColor[o.type],
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-[13px] font-semibold text-foreground">{o.orderNumber}</div>
                            <div className="text-[11px] text-muted-foreground">{o.customerName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium", sc.bg, sc.text)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                            {o.status}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{o.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{o.vehicle || "—"}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{o.driver || "—"}</span>
                        <span className="flex items-center gap-1"><Route className="w-3 h-3" />{o.routeNumber || "—"}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{o.destination}</span>
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" />{o.totalPacks} packs, {o.totalWeight} KG</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-primary/5">
                <div>
                  <h2 className="text-sm font-bold text-foreground">{selectedOrder.orderNumber}</h2>
                  <p className="text-[11px] text-muted-foreground">{selectedOrder.customerName}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto max-h-[calc(80vh-120px)]">
                {/* Status & Type */}
                <div className="flex items-center gap-2 mb-4">
                  {(() => {
                    const sc = statusConfig[selectedOrder.status];
                    return (
                      <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium", sc.bg, sc.text)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                        {selectedOrder.status}
                      </span>
                    );
                  })()}
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-foreground">{selectedOrder.type}</span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-foreground">Site: {selectedOrder.site}</span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { icon: Truck, label: "Vehicle", value: selectedOrder.vehicle || "Not assigned" },
                    { icon: User, label: "Driver", value: selectedOrder.driver || "Not assigned" },
                    { icon: Route, label: "Route Number", value: selectedOrder.routeNumber || "—" },
                    { icon: Clock, label: "Scheduled Time", value: `${format(selectedOrder.date, "MMM d, yyyy")} at ${selectedOrder.time}` },
                    { icon: MapPin, label: "Origin", value: selectedOrder.origin },
                    { icon: MapPin, label: "Destination", value: selectedOrder.destination },
                    { icon: Package, label: "Total Packs", value: String(selectedOrder.totalPacks) },
                    { icon: Package, label: "Total Weight", value: `${selectedOrder.totalWeight} KG` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <item.icon className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</p>
                        <p className="text-[12px] font-medium text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Products Table */}
                <div>
                  <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    Products ({selectedOrder.products.length})
                  </h3>
                  {selectedOrder.products.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-muted-foreground bg-muted/30 rounded-lg">No products listed</div>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Product ID</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                            <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Qty</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Unit</th>
                            <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Weight</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.products.map((p, i) => (
                            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2 font-mono text-primary font-medium">{p.productId}</td>
                              <td className="px-3 py-2 text-foreground">{p.description}</td>
                              <td className="px-3 py-2 text-right font-medium text-foreground">{p.qty}</td>
                              <td className="px-3 py-2 text-muted-foreground">{p.unit}</td>
                              <td className="px-3 py-2 text-right font-medium text-foreground">{p.weight}</td>
                              <td className="px-3 py-2 text-muted-foreground">{p.weightUnit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
