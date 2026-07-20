import { useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Trip, type Stop, priorityColor } from "../types";

// ═══════════════════════════════════════════════════════
// STOP LIST VIEW (for selected trip)
// ═══════════════════════════════════════════════════════
export function TripStopListView({
  trip,
  onReorder,
}: {
  trip: Trip | null;
  onReorder?: (newStops: Stop[]) => void;
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

  const isOptimised = trip.stops.some((s) => s.arrivalTime || s.departureTime);
  const headers = isOptimised
    ? ["", "Seq","Type","Txn","Client","City","Arrival","Departure","Service","Waiting","Dist (km)","Qty","Weight"]
    : ["", "Seq","Type","Txn","Client","Address","City","Route","Priority","Qty","Weight"];

  function handleDrop(i: number) {
    if (dragIndex === null || dragIndex === i || !onReorder) {
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
    <div className="flex-1 overflow-auto min-h-[320px]">
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
              draggable={!!onReorder}
              onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              className={cn(
                "border-b border-border/30 hover:bg-muted/30",
                i % 2 === 0 ? "" : "bg-muted/10",
                dragIndex === i && "opacity-40",
                overIndex === i && dragIndex !== null && dragIndex !== i && "border-t-2 border-t-primary"
              )}
            >
              <td className="px-1 py-1.5 text-center">
                {onReorder && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 cursor-grab" />}
              </td>
              <td className="px-2.5 py-1.5 font-mono font-bold text-center">{s.seq ?? i + 1}</td>
              <td className="px-2.5 py-1.5">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold",
                  s.type === "DROP" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700")}>{s.type}</span>
              </td>
              <td className="px-2.5 py-1.5 font-mono text-primary">{s.txn}</td>
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
              <td className="px-2.5 py-1.5 font-mono">{s.qty}</td>
              <td className="px-2.5 py-1.5 font-mono">{s.netweight} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
