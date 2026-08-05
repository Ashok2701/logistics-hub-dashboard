import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type Stop } from "../types";

// ═══════════════════════════════════════════════════════
// PRODUCT DETAILS DIALOG — shown when a document/drop/pickup
// number is clicked, listing every product line on that document.
// ═══════════════════════════════════════════════════════
export function ProductDetailsDialog({
  stop, open, onOpenChange,
}: {
  stop: Stop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const products = stop?.products ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Product Details {stop && <span className="font-mono text-primary">— {stop.txn}</span>}</DialogTitle>
          <DialogDescription>
            {stop ? `${stop.client || "—"} · ${stop.city || ""}` : ""}
          </DialogDescription>
        </DialogHeader>

        {products.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No product lines found for this document.
          </div>
        ) : (
          <ScrollArea className="flex-1 border border-border rounded-lg" style={{ maxHeight: 440 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr>
                  <th className="px-2 py-1.5 text-left">Item Code</th>
                  <th className="px-2 py-1.5 text-left">Description</th>
                  <th className="px-2 py-1.5 text-right">Qty Ordered</th>
                  <th className="px-2 py-1.5 text-right">Qty Delivered</th>
                  <th className="px-2 py-1.5 text-left">Unit</th>
                  <th className="px-2 py-1.5 text-right">Net Weight</th>
                  <th className="px-2 py-1.5 text-right">Gross Weight</th>
                  <th className="px-2 py-1.5 text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={`${p.docNum}-${p.lineNum ?? i}`} className={cn("border-t border-border/50", i % 2 === 1 && "bg-muted/20")}>
                    <td className="px-2 py-1.5 font-mono text-primary whitespace-nowrap">{p.itemCode ?? "—"}</td>
                    <td className="px-2 py-1.5 max-w-[220px] truncate" title={[p.itemDesc1, p.itemDesc2].filter(Boolean).join(" ")}>
                      {[p.itemDesc1, p.itemDesc2].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">{p.qtyOrdered ?? 0}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{p.qtyDelivered ?? 0}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{p.packUnit || p.stockUnit || "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">{p.netWeight ?? 0} {p.weightUnit || "KG"}</td>
                    <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">{p.grossWeight ?? 0} {p.weightUnit || "KG"}</td>
                    <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">{p.volume ?? 0} {p.volumeUnit || "M3"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
