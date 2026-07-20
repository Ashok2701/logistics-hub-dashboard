import type { DragEvent } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { type Stop, priorityColor } from "../types";

// ═══════════════════════════════════════════════════════
// STOP ROW — used in drops/pickups table
// ═══════════════════════════════════════════════════════
export function StopRow({
  stop, selected, onToggle, onDragStart, dragging, used, index,
}: {
  stop: Stop; selected: boolean; onToggle: () => void;
  onDragStart: (e: DragEvent) => void; dragging: boolean;
  used?: boolean; index?: number;
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
      <td className="px-2 py-1.5 font-mono text-xs text-primary font-semibold whitespace-nowrap">{stop.txn}</td>
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
      <td className="px-2 py-1.5 text-xs font-mono">{stop.qty}</td>
      <td className="px-2 py-1.5 text-xs font-mono">{stop.netweight}</td>
      <td className="px-2 py-1.5">
        {!used && <GripVertical className="w-3 h-3 text-muted-foreground/30" />}
      </td>
    </tr>
  );
}
