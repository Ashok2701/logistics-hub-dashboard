import React from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════
// TOOLBAR BUTTON
// ═══════════════════════════════════════════════════════
export function ToolbarBtn({
  icon: Icon, label, onClick, disabled = false,
  color = "text-muted-foreground", bg = "hover:bg-muted", spin = false,
}: {
  icon: React.ElementType; label: string; onClick?: () => void;
  disabled?: boolean; color?: string; bg?: string; spin?: boolean;
}) {
  return (
    <div className="relative group">
      <button
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "h-9 w-9 rounded-xl border border-input/80 bg-white/90 backdrop-blur flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40",
          bg, color
        )}
      >
        <Icon className={cn("w-5 h-5", spin && "animate-spin")} />
      </button>
      <span className="absolute left-1/2 -translate-x-1/2 top-10 z-50 px-2 py-1 rounded bg-foreground text-background text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
        {label}
      </span>
    </div>
  );
}
