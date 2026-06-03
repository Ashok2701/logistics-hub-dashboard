import { type ReactNode, type CSSProperties } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";

export interface SortApi {
  sortKey: string | null;
  sortDir: "asc" | "desc";
  toggleSort: (key: string) => void;
}

interface BaseProps {
  sortKey: string;
  sort: SortApi;
  className?: string;
  style?: CSSProperties;
  align?: "left" | "right" | "center";
  children: ReactNode;
}

function SortIndicator({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 group-hover/sort:opacity-70" />;
  return dir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
}

export function SortableTh({ sortKey, sort, className, style, align = "left", children }: BaseProps) {
  const active = sort.sortKey === sortKey;
  return (
    <th className={cn("select-none", className)} style={style}>
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
        <SortIndicator active={active} dir={sort.sortDir} />
      </button>
    </th>
  );
}

// For shadcn <Table> usage with TableHead
export function SortableTableHead({ sortKey, sort, className, style, align = "left", children }: BaseProps) {
  const active = sort.sortKey === sortKey;
  return (
    <TableHead className={cn("select-none", className)} style={style}>
      <button
        type="button"
        onClick={() => sort.toggleSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 group/sort transition-colors hover:text-foreground",
          active ? "text-foreground" : "",
          align === "right" && "justify-end w-full",
          align === "center" && "justify-center w-full"
        )}
      >
        <span>{children}</span>
        <SortIndicator active={active} dir={sort.sortDir} />
      </button>
    </TableHead>
  );
}
