import { type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SortApi {
  sortKey: string | null;
  sortDir: "asc" | "desc";
  toggleSort: (key: string) => void;
}

interface SortableThProps {
  sortKey: string;
  sort: SortApi;
  className?: string;
  align?: "left" | "right" | "center";
  children: ReactNode;
}

export function SortableTh({ sortKey, sort, className, align = "left", children }: SortableThProps) {
  const active = sort.sortKey === sortKey;
  return (
    <th className={cn("select-none", className)}>
      <button
        type="button"
        onClick={() => sort.toggleSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 group/sort transition-colors hover:text-foreground",
          active ? "text-foreground font-semibold" : "text-muted-foreground",
          align === "right" && "justify-end w-full",
          align === "center" && "justify-center w-full"
        )}
      >
        <span>{children}</span>
        {active ? (
          sort.sortDir === "asc" ? (
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
