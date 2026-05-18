import { useMemo, useState, useCallback } from "react";

export type SortDir = "asc" | "desc";

export interface SortState {
  key: string | null;
  dir: SortDir;
}

function getByPath(obj: any, path: string): any {
  if (obj == null) return obj;
  if (path in obj) return obj[path];
  return path.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

function compare(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  // Numeric
  if (typeof a === "number" && typeof b === "number") return a - b;

  const sa = String(a);
  const sb = String(b);

  // Try numeric extraction (e.g. "20 tons", "DL-98234", "$120")
  const na = parseFloat(sa.replace(/[^0-9.\-]/g, ""));
  const nb = parseFloat(sb.replace(/[^0-9.\-]/g, ""));
  if (!isNaN(na) && !isNaN(nb) && /\d/.test(sa) && /\d/.test(sb)) {
    if (na !== nb) return na - nb;
  }

  // Date
  const da = Date.parse(sa);
  const db = Date.parse(sb);
  if (!isNaN(da) && !isNaN(db) && /\d{4}/.test(sa) && /\d{4}/.test(sb)) {
    if (da !== db) return da - db;
  }

  return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
}

export function useSortable<T extends Record<string, any>>(data: T[], initialKey: string | null = null, initialDir: SortDir = "asc") {
  const [sort, setSort] = useState<SortState>({ key: initialKey, dir: initialDir });

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: "asc" };
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sort.key) return data;
    const arr = [...data];
    const key = sort.key;
    arr.sort((a, b) => {
      const r = compare(getByPath(a, key), getByPath(b, key));
      return sort.dir === "asc" ? r : -r;
    });
    return arr;
  }, [data, sort]);

  return { sorted, sortKey: sort.key, sortDir: sort.dir, toggleSort };
}
