import { type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableThProps {
  sortKey: string;
  currentKey: string | null;
  currentDir: "asc" | "desc";
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
  children: ReactNode;
}

export function SortableTh({ sortKey, currentKey, currentDir, onSort, className, align = "left", children }: SortableThProps) {
  const active = currentKey === sortKey;
  return (
    <th className={cn("select-none", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 group/sort transition-colors hover:text-foreground",
          active ? "text-foreground font-semibold" : "text-muted-foreground",
          align === "right" && "justify-end w-full",
          align === "center" && "justify-center w-full"
        )}
      >
        <span>{children}</span>
        {active ? (
          currentDir === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5 text-primary" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-primary" />
          )
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 group-hover/sort:opacity-70" />
        )}
      </button>
    </th>
  );
}
