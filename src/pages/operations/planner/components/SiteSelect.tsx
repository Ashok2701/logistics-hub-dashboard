import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { RpSite } from "@/lib/routePlannerApi";

// ═══════════════════════════════════════════════════════
// SITE SELECT — driven by real API sites
// ═══════════════════════════════════════════════════════
export function SiteSelect({ sites, value, onChange }: { sites: RpSite[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-[200px] text-xs">
        <SelectValue placeholder="Select site…" />
      </SelectTrigger>
      <SelectContent>
        {sites.map((s) => (
          <SelectItem key={s.siteCode} value={s.siteCode}>
            <span className="font-mono text-xs text-primary mr-1.5">{s.siteCode}</span>
            <span className="text-muted-foreground text-[11px]">{s.siteName}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
