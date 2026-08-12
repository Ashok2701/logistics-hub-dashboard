import type { DragEvent } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { type Stop, priorityColor, stopQty } from "../types";

// ═══════════════════════════════════════════════════════
// STOP ROW — used in drops/pickups table
// ═══════════════════════════════════════════════════════
export function StopRow({
  stop, selected, onToggle, onDragStart, dragging, used, index, onViewProducts,
}: {
  stop: Stop; selected: boolean; onToggle: () => void;
  onDragStart: (e: DragEvent) => void; dragging: boolean;
  used?: boolean; index?: number;
  /** Opens the product-details popup for this stop's document. */
  onViewProducts?: (stop: Stop) => void;
}) {
  const tagColor = stop.routeTagColor || "#e2e8f0";
  const tagText  = stop.routeTagColor ? "#ffffff" : "#334155";
  return (
    <tr
      draggable={!used}
      onDragStart={(e) => { if (used) { e.preventDefault(); return; } onDragStart(e); }}
      onClick={() => { if (!used) onToggle(); }}
      className={cn(
        "border-b border-border/20 transition-colors select-none group",
        used
          ? "opacity-50 cursor-not-allowed bg-muted/40"
          : cn(
              "cursor-pointer",
              selected
                ? "bg-primary/5 border-l-2 border-l-primary"
                : (index ?? 0) % 2 === 1
                  ? "bg-muted/30 hover:bg-[#eff6ff]"
                  : "hover:bg-[#eff6ff]"
            ),
        dragging && "opacity-50"
      )}
    >
      <td className="px-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggle} disabled={used} />
      </td>
      <td className="px-2 py-1.5 font-mono text-xs whitespace-nowrap">
        {onViewProducts ? (
          <button
            onClick={(e) => { e.stopPropagation(); onViewProducts(stop); }}
            className="text-primary font-semibold underline decoration-dotted underline-offset-2 hover:text-primary/70"
            title="View product details"
          >
            {stop.txn}
          </button>
        ) : (
          <span className="text-primary font-semibold">{stop.txn}</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-xs">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
          style={{ background: tagColor, color: tagText }}
        >
          {stop.prepList}
        </span>
      </td>
      <td className="px-2 py-1.5 text-xs">
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold", priorityColor(stop.priority))}>{stop.priority}</span>
      </td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground font-mono">{stop.bpcode}</td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground">{stop.routeCode}</td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground max-w-[100px] truncate">{stop.postalCity}</td>
      <td className="px-2 py-1.5 text-xs font-mono whitespace-nowrap">{stopQty(stop)} UN</td>
      <td className="px-2 py-1.5 text-xs font-mono whitespace-nowrap">{stop.netWeight} {stop.weightUnit || "KG"}</td>
      <td className="px-2 py-1.5">
        {!used && <GripVertical className="w-3 h-3 text-muted-foreground/30" />}
      </td>
    </tr>
  );
}
