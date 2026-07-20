import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════
export function KpiCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: typeof Truck }) {
  return (
    <div className={cn("rounded-md px-2.5 py-1.5 text-white flex items-center justify-between", color)}>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/65 leading-none">{label}</p>
        <p className="text-lg font-bold leading-none mt-0.5">{value}</p>
      </div>
      <Icon className="w-4 h-4 text-white/30" />
    </div>
  );
}
