import { useState } from "react";
import { GripVertical, Lock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Trip, type Stop, priorityColor, stopQty } from "../types";

// ═══════════════════════════════════════════════════════
// STOP LIST VIEW (for selected trip)
// ═══════════════════════════════════════════════════════
export function TripStopListView({
  trip,
  locked = false,
  onReorder,
  onDeleteStop,
  onViewProducts,
}: {
  trip: Trip | null;
  locked?: boolean;
  onReorder?: (newStops: Stop[]) => void;
  /** Remove a single drop/pickup from the trip — parent handles the
   *  confirmation prompt and the actual trip-status/persist logic. */
  onDeleteStop?: (docNum: string) => void;
  /** Opens the product-details popup for a stop's document. */
  onViewProducts?: (stop: Stop) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (!trip) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[320px]">
        <p className="text-sm text-muted-foreground">Select a trip to see its stops</p>
      </div>
    );
  }

    // Reordering is only allowed when the parent gave us a handler AND the
  // trip isn't locked/validated. Deriving canReorder here (rather than
  // just checking onReorder) means this component protects itself even
  // if a future caller passes onReorder without also passing locked.
  const canReorder = !!onReorder && !locked;

  const isOptimised = trip.stops.some((s) => s.arrivalTime || s.departureTime);
  const headers = isOptimised
    ? ["", "Seq","Type","Txn","Client","City","Arrival","Departure","Service","Waiting","Dist (km)","Qty","Weight","Actions"]
    : ["", "Seq","Type","Txn","Client","Address","City","Route","Priority","Qty","Weight","Actions"];

  function handleDrop(i: number) {
    if (!canReorder || dragIndex === null || dragIndex === i) {
      setDragIndex(null); setOverIndex(null);
      return;
    }
    const reordered = [...trip!.stops];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(i, 0, moved);
    // Re-sequence so downstream consumers (map, active panel) stay in sync
    const withSeq = reordered.map((s, idx) => ({ ...s, seq: idx + 1 }));
    onReorder(withSeq);
    setDragIndex(null); setOverIndex(null);
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-auto">
            {locked && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border-b border-amber-200">
          <Lock className="w-3 h-3" />
          Trip is locked — unlock it to reorder stops
        </div>
      )}
      <table className="w-full min-w-[600px]" style={{ fontSize: "11px" }}>
        <thead className="bg-muted/40 sticky top-0 z-10">
          <tr>
            {headers.map((h, i) => (
              <th key={h || `col-${i}`} className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap border-b border-border/30">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trip.stops.map((s, i) => (
            <tr
              key={s.id}
              draggable={canReorder}
              onDragStart={(e) => { if (!canReorder) return; setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { if (!canReorder) return; e.preventDefault(); setOverIndex(i); }}
              onDrop={(e) => { if (!canReorder) return; e.preventDefault(); handleDrop(i); }}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              className={cn(
                "border-b border-border/30 hover:bg-muted/30",
                canReorder ? "hover:bg-muted/30" : "",
                i % 2 === 0 ? "" : "bg-muted/10",
                dragIndex === i && "opacity-40",
                overIndex === i && dragIndex !== null && dragIndex !== i && "border-t-2 border-t-primary"
              )}
            >
              <td className="px-1 py-1.5 text-center">
                {canReorder
                  ? <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 cursor-grab" />
                  : locked
                    ? <Lock className="w-3 h-3 text-muted-foreground/30" />
                    : null}
              </td>
              <td className="px-2.5 py-1.5 font-mono font-bold text-center">{s.seq ?? i + 1}</td>
              <td className="px-2.5 py-1.5">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold",
                  s.type === "DROP" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700")}>{s.type}</span>
              </td>
              <td className="px-2.5 py-1.5 font-mono">
                {onViewProducts ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewProducts(s); }}
                    className="text-primary font-semibold underline decoration-dotted underline-offset-2 hover:text-primary/70"
                    title="View product details"
                  >
                    {s.txn}
                  </button>
                ) : (
                  <span className="text-primary">{s.txn}</span>
                )}
              </td>
              <td className="px-2.5 py-1.5 font-medium">{s.client}</td>
              {isOptimised ? (
                <>
                  <td className="px-2.5 py-1.5">{s.city}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.arrivalTime || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.departureTime || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.serviceTime || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.waitingTime || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono">{s.fromPrevDistance ?? "—"}</td>
                </>
              ) : (
                <>
                  <td className="px-2.5 py-1.5 text-muted-foreground max-w-[120px] truncate">{s.address}</td>
                  <td className="px-2.5 py-1.5">{s.city}</td>
                  <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{s.routeCode}</td>
                  <td className="px-2.5 py-1.5">
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold", priorityColor(s.priority))}>{s.priority}</span>
                  </td>
                </>
              )}
              <td className="px-2.5 py-1.5 font-mono">{stopQty(s)} UN</td>
              <td className="px-2.5 py-1.5 font-mono">{s.netWeight} {s.weightUnit || "KG"}</td>
              <td className="px-2.5 py-1.5">
                {onDeleteStop && (
                  <button
                    onClick={(e) => { e.stopPropagation(); if (!locked) onDeleteStop(s.id); }}
                    disabled={locked}
                    title={locked ? "Trip is locked — unlock it to remove stops" : "Remove this stop"}
                    className={cn(
                      "p-1 rounded transition-colors",
                      locked ? "text-muted-foreground/30 cursor-not-allowed" : "text-destructive hover:bg-destructive/10"
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
