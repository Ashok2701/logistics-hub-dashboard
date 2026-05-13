import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Group, ChevronDown, ChevronRight, FileText, PanelLeftClose, PanelLeft, ArrowLeft, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/MetricCard";

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

const sampleData: PODRecord[] = [
  { id: "1", pod: true, site: "CAT01", document: "CAT012602SDH00210", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "06:30", arrivalDate: "02-26-2026", arrivalTime: "08:15", vehicle: "VH-101", driver: "J. Murphy",
    reference: "POD-CAT012602SDH0021", lastUpdate: "02/26/2026 13:48:48", updatedBy: "TMSDV",
    address: "", addressLine1: "178 Galgorm Road", zip: "BT42 1HJ", country: "XI", phone: "", web: "", gpsLong: "17.448565", gpsLat: "78.3617397",
    route: "XVR-260226-CAT01-004", schedule: "", carrierCode: "INTERNAL", carrier: "", carrierEmail: "", grossWeight: 0, netWeight: 0, nbItems: 0,
    etaDate: "02/26/2026", etaTime: "07:18", startUnloadingDate: "02/26/2026", startUnloadingTime: "19:18", qtyUpdateDate: "02/26/2026", qtyUpdateTime: "19:18", endUnloadingDate: "02/26/2026", endUnloadingTime: "19:18", departureDate: "02/26/2026", departureTime: "19:18", etdDate: "02/26/2026", etdTime: "07:28",
    podProducts: [
      { deliveryNum: "CAT012602SDH00210", product: "Mixing Glasses Starburst 700ml", orderedQty: 2, deliveredQty: 2, unit: "EA", packages: 0, mass: 0, massUnit: "KG", volume: 0, volumeUnit: "L", leftQtyToShip: 0 },
    ],
    podImages: [
      { type: "SIGNATURE", document: "CAT012602SDH00210", contentUrl: "", postDate: "02/26/2026 13:48:32" },
      { type: "PHOTO", document: "CAT012602SDH00210", contentUrl: "", postDate: "02/26/2026 13:48:32" },
    ],
    lineItems: [
      { docNum: "CAT012602SDH00210", orderNumber: "CAT012602SON00217", productId: "11699", description: "Mixing Glasses Starburst 700ml", qtyToPrepare: 6, unit: "EA" },
      { docNum: "CAT012602SDH00210", orderNumber: "CAT012602SON00217", productId: "11700", description: "Cocktail Shaker Boston 28oz", qtyToPrepare: 4, unit: "EA" },
    ]},
  { id: "2", pod: true, site: "CAT01", document: "CAT012602SDH00211", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 2, weight: 12, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "06:30", arrivalDate: "02-26-2026", arrivalTime: "08:15", vehicle: "VH-101", driver: "J. Murphy",
    reference: "POD-CAT012602SDH0022", lastUpdate: "02/26/2026 14:10:00", updatedBy: "TMSDV",
    address: "", addressLine1: "178 Galgorm Road", zip: "BT42 1HJ", country: "XI", phone: "", web: "", gpsLong: "17.448565", gpsLat: "78.3617397",
    route: "XVR-260226-CAT01-004", schedule: "", carrierCode: "INTERNAL", carrier: "", carrierEmail: "", grossWeight: 12, netWeight: 10, nbItems: 2,
    etaDate: "02/26/2026", etaTime: "07:18", startUnloadingDate: "02/26/2026", startUnloadingTime: "14:00", qtyUpdateDate: "02/26/2026", qtyUpdateTime: "14:05", endUnloadingDate: "02/26/2026", endUnloadingTime: "14:10", departureDate: "02/26/2026", departureTime: "14:15", etdDate: "02/26/2026", etdTime: "07:28",
    podProducts: [{ deliveryNum: "CAT012602SDH00211", product: "Premium Bar Napkins 1000pk", orderedQty: 10, deliveredQty: 10, unit: "PK", packages: 2, mass: 12, massUnit: "KG", volume: 0, volumeUnit: "L", leftQtyToShip: 0 }],
    podImages: [{ type: "SIGNATURE", document: "CAT012602SDH00211", contentUrl: "", postDate: "02/26/2026 14:10:00" }],
    lineItems: [{ docNum: "CAT012602SDH00211", orderNumber: "CAT012602SON00218", productId: "22450", description: "Premium Bar Napkins 1000pk", qtyToPrepare: 10, unit: "PK" }]},
  { id: "3", pod: true, site: "CAT01", document: "CAT012602SDH00212", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 1, weight: 5, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "07:00", arrivalDate: "02-26-2026", arrivalTime: "09:00", vehicle: "VH-102", driver: "S. O'Brien",
    reference: "POD-CAT012602SDH0023", lastUpdate: "02/26/2026 09:30:00", updatedBy: "TMSDV", route: "XVR-260226-CAT01-005", carrierCode: "INTERNAL",
    podProducts: [], podImages: [], lineItems: [] },
  { id: "4", pod: false, site: "CAT01", document: "CAT012602SDH00213", date: "02-26-2026", type: "DELIVERY", status: "Planned", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "5", pod: true, site: "CAT01", document: "CAT012602SDH00214", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 3, weight: 18, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "07:00", arrivalDate: "02-26-2026", arrivalTime: "09:30", vehicle: "VH-102", driver: "S. O'Brien",
    reference: "POD-CAT012602SDH0025", lastUpdate: "02/26/2026 10:00:00", updatedBy: "TMSDV", route: "XVR-260226-CAT01-005", carrierCode: "INTERNAL",
    podProducts: [{ deliveryNum: "CAT012602SDH00214", product: "Disposable Gloves Medium Box", orderedQty: 20, deliveredQty: 20, unit: "BX", packages: 3, mass: 18, massUnit: "KG", volume: 0, volumeUnit: "L", leftQtyToShip: 0 }],
    podImages: [], lineItems: [{ docNum: "CAT012602SDH00214", orderNumber: "CAT012602SON00220", productId: "33100", description: "Disposable Gloves Medium Box", qtyToPrepare: 20, unit: "BX" }]},
  { id: "6", pod: true, site: "CAT01", document: "CAT012602SDH00216", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "G819", bpName: "Tullyglass House Hotel Ltd", city: "BALLYMENA", state: "Co Antrim", deliveryMode: "OUR", pack: 1, weight: 8, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "02-26-2026", depTime: "08:00", arrivalDate: "02-26-2026", arrivalTime: "10:00", vehicle: "VH-103", driver: "D. Kelly",
    reference: "POD-CAT012602SDH0026", lastUpdate: "02/26/2026 10:30:00", updatedBy: "TMSDV", route: "XVR-260226-CAT01-006", carrierCode: "INTERNAL",
    podProducts: [], podImages: [], lineItems: [] },
  { id: "7", pod: false, site: "CAT01", document: "CAT012602SDH00220", date: "02-27-2026", type: "SHIPMENT PREP", status: "In Progress", bp: "H102", bpName: "Belfast Grand Central", city: "BELFAST", state: "Co Antrim", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "8", pod: false, site: "CAT01", document: "CAT012602SDH00221", date: "02-27-2026", type: "SHIPMENT PREP", status: "Planned", bp: "H102", bpName: "Belfast Grand Central", city: "BELFAST", state: "Co Antrim", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "9", pod: false, site: "HYG01", document: "HYG012602SDH00050", date: "02-26-2026", type: "DELIVERY", status: "To Plan", bp: "K445", bpName: "Hygeia Supplies Ltd", city: "DUBLIN", state: "Leinster", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "10", pod: true, site: "IRE01", document: "IRE012602SDH00101", date: "02-26-2026", type: "DELIVERY", status: "Completed", bp: "M201", bpName: "Galway Bay Seafoods", city: "GALWAY", state: "Connacht", deliveryMode: "OUR", pack: 5, weight: 45, weightUnit: "KG", volume: 2, volumeUnit: "M3", depDate: "02-26-2026", depTime: "05:00", arrivalDate: "02-26-2026", arrivalTime: "11:00", vehicle: "VH-201", driver: "P. Walsh",
    reference: "POD-IRE012602SDH0010", lastUpdate: "02/26/2026 11:30:00", updatedBy: "TMSDV",
    address: "", addressLine1: "Dock Road", zip: "H91 XY12", country: "IE", phone: "", web: "", gpsLong: "-9.0568", gpsLat: "53.2707",
    route: "XVR-260226-IRE01-001", schedule: "", carrierCode: "INTERNAL", carrier: "", carrierEmail: "", grossWeight: 45, netWeight: 40, nbItems: 3,
    etaDate: "02/26/2026", etaTime: "10:00", startUnloadingDate: "02/26/2026", startUnloadingTime: "11:05", qtyUpdateDate: "02/26/2026", qtyUpdateTime: "11:20", endUnloadingDate: "02/26/2026", endUnloadingTime: "11:25", departureDate: "02/26/2026", departureTime: "11:30", etdDate: "02/26/2026", etdTime: "10:30",
    podProducts: [
      { deliveryNum: "IRE012602SDH00101", product: "Fresh Atlantic Salmon 5kg", orderedQty: 8, deliveredQty: 8, unit: "EA", packages: 2, mass: 40, massUnit: "KG", volume: 1, volumeUnit: "L", leftQtyToShip: 0 },
      { deliveryNum: "IRE012602SDH00101", product: "Smoked Mackerel Fillets 1kg", orderedQty: 12, deliveredQty: 12, unit: "EA", packages: 2, mass: 12, massUnit: "KG", volume: 0.5, volumeUnit: "L", leftQtyToShip: 0 },
      { deliveryNum: "IRE012602SDH00101", product: "Prawns Tiger King 2kg", orderedQty: 5, deliveredQty: 5, unit: "EA", packages: 1, mass: 10, massUnit: "KG", volume: 0.5, volumeUnit: "L", leftQtyToShip: 0 },
    ],
    podImages: [
      { type: "SIGNATURE", document: "IRE012602SDH00101", contentUrl: "", postDate: "02/26/2026 11:30:00" },
      { type: "PHOTO", document: "IRE012602SDH00101", contentUrl: "", postDate: "02/26/2026 11:30:00" },
    ],
    lineItems: [
      { docNum: "IRE012602SDH00101", orderNumber: "IRE012602SON00050", productId: "55200", description: "Fresh Atlantic Salmon 5kg", qtyToPrepare: 8, unit: "EA" },
      { docNum: "IRE012602SDH00101", orderNumber: "IRE012602SON00050", productId: "55201", description: "Smoked Mackerel Fillets 1kg", qtyToPrepare: 12, unit: "EA" },
      { docNum: "IRE012602SDH00101", orderNumber: "IRE012602SON00051", productId: "55300", description: "Prawns Tiger King 2kg", qtyToPrepare: 5, unit: "EA" },
    ]},
  { id: "11", pod: false, site: "IRE01", document: "IRE012602SDH00102", date: "02-26-2026", type: "DELIVERY", status: "Skipped", bp: "M201", bpName: "Galway Bay Seafoods", city: "GALWAY", state: "Connacht", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "12", pod: true, site: "IRE01", document: "IRE012602SDH00103", date: "02-27-2026", type: "DELIVERY", status: "Completed", bp: "N330", bpName: "Cork Harbour Foods", city: "CORK", state: "Munster", deliveryMode: "OUR", pack: 2, weight: 15, weightUnit: "KG", volume: 1, volumeUnit: "M3", depDate: "02-27-2026", depTime: "06:00", arrivalDate: "02-27-2026", arrivalTime: "10:30", vehicle: "VH-202", driver: "R. Byrne",
    reference: "POD-IRE012602SDH0013", lastUpdate: "02/27/2026 10:45:00", updatedBy: "TMSDV", route: "XVR-270226-IRE01-002", carrierCode: "INTERNAL",
    podProducts: [], podImages: [], lineItems: [] },
  { id: "13", pod: false, site: "IRE01", document: "IRE012602SDH00104", date: "02-27-2026", type: "SHIPMENT PREP", status: "Planned", bp: "N330", bpName: "Cork Harbour Foods", city: "CORK", state: "Munster", deliveryMode: "OUR", pack: 0, weight: 0, weightUnit: "KG", volume: 0, volumeUnit: "", depDate: "", depTime: "", arrivalDate: "", arrivalTime: "", vehicle: "", driver: "", lineItems: [] },
  { id: "14", pod: true, site: "IRE01", document: "IRE012602SDH00105", date: "02-27-2026", type: "DELIVERY", status: "Completed", bp: "P100", bpName: "Limerick Supply Co", city: "LIMERICK", state: "Munster", deliveryMode: "OUR", pack: 4, weight: 30, weightUnit: "KG", volume: 2, volumeUnit: "M3", depDate: "02-27-2026", depTime: "06:00", arrivalDate: "02-27-2026", arrivalTime: "12:00", vehicle: "VH-203", driver: "T. Flynn",
    reference: "POD-IRE012602SDH0015", lastUpdate: "02/27/2026 12:15:00", updatedBy: "TMSDV", route: "XVR-270226-IRE01-003", carrierCode: "INTERNAL",
    podProducts: [], podImages: [], lineItems: [] },
];

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
