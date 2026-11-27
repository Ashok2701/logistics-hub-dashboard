import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/shared/MetricCard";
import { SortableTableHead } from "@/components/shared/SortableTh";
import { useSortable } from "@/hooks/useSortable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowLeft, Pencil, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { productApi, type Product } from "@/lib/fleetApi";

// X3 management codes: 1 = not managed. Higher codes are different kinds of management (X3 has 3 stock,
// 4 lot and 3 serial options); the code is shown until the exact X3 wording is mapped.
const mgmt = (v?: number | null) => (v == null || v === 0 ? "" : v === 1 ? "Not managed" : `Managed (code ${v})`);
const fmtQty = (n?: number | null) => (n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }));

export default function ProductManagement() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Product | null>(null);
  const [siteStock, setSiteStock] = useState<{ siteCode: string; quantity: number }[]>([]);

  const load = async () => {
    setLoading(true);
    try { setItems((await productApi.list()) ?? []); }
    catch (err: any) { toast({ title: "Failed to load products", description: err?.message ?? String(err), variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((p) => {
      const m = (p.productName ?? "").toLowerCase().includes(q) ||
                (p.productCode ?? "").toLowerCase().includes(q) ||
                (p.productCategory ?? "").toLowerCase().includes(q);
      const s = statusFilter === "all" || (statusFilter === "active" ? !!p.active : !p.active);
      return m && s;
    });
  }, [items, search, statusFilter]);
  const sort = useSortable(filtered);

  const openEdit = (p: Product) => {
    setEditing(p);
    setSiteStock([]);
    productApi.stock(p.productCode).then((r) => setSiteStock(r ?? [])).catch(() => setSiteStock([]));
    setView("form");
  };
  const goBack = () => { setView("list"); setEditing(null); };

  if (view === "form" && editing) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        {/* Sticky header + tab nav */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors duration-150">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Product Details</h1>
                <p className="text-xs text-muted-foreground">{editing.productCode} — {editing.productName}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card mt-6">
          <div className="p-6 space-y-8 scroll-smooth">
            <section id="section-general" className="scroll-mt-40">
              <Section title="Product Information (from X3)">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Product Code"><ReadOnly value={editing.productCode} mono /></Field>
                  <Field label="Product Name"><ReadOnly value={editing.productName ?? ""} /></Field>
                  <Field label="Category"><ReadOnly value={editing.productCategory ?? ""} mono /></Field>
                  <Field label="Short Description"><ReadOnly value={editing.shortDescription ?? ""} /></Field>
                  <Field label="Unit of Measure"><ReadOnly value={editing.unitOfMeasure ?? ""} mono /></Field>
                  <Field label="Sales Unit"><ReadOnly value={editing.salesUnit ?? ""} mono /></Field>
                  <Field label="Net Weight"><ReadOnly value={editing.netWeight != null ? `${editing.netWeight} ${editing.weightUnit ?? ""}` : ""} /></Field>
                  <Field label="Gross Weight"><ReadOnly value={editing.grossWeight != null ? `${editing.grossWeight} ${editing.weightUnit ?? ""}` : ""} /></Field>
                  <Field label="Volume"><ReadOnly value={editing.volume != null ? `${editing.volume} ${editing.volumeUnit ?? ""}` : ""} /></Field>
                </div>
              </Section>
            </section>

            <Separator />

            <section id="section-stock" className="scroll-mt-40">
              <Section title="Stock & Accounting (from X3)">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Stock Management"><ReadOnly value={mgmt(editing.stockManagement)} /></Field>
                  <Field label="Lot Management"><ReadOnly value={mgmt(editing.lotManagement)} /></Field>
                  <Field label="Serial Management"><ReadOnly value={mgmt(editing.serialManagement)} /></Field>
                  <Field label="Accounting Code"><ReadOnly value={editing.accountingCode ?? ""} mono /></Field>
                  <Field label="Tax Code"><ReadOnly value={editing.taxCode ?? ""} mono /></Field>
                  <Field label="Available Quantity (all sites)"><ReadOnly value={fmtQty(editing.availableQty)} /></Field>
                </div>
              </Section>
              <div className="mt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Stock by Site</h4>
                {siteStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No stock recorded at any site.</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden max-w-md">
                    <Table>
                      <TableHeader><TableRow className="bg-secondary/50 hover:bg-secondary/50">
                        <TableHead className="text-xs uppercase">Site</TableHead>
                        <TableHead className="text-xs uppercase text-right">Available Qty</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {siteStock.map((x) => (
                          <TableRow key={x.siteCode}>
                            <TableCell className="font-mono text-sm">{x.siteCode}</TableCell>
                            <TableCell className="text-sm text-right">{fmtQty(x.quantity)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <PageHeader title="Products" subtitle="Product master data from X3" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg bg-secondary/50 border-border/50 text-sm" />
        </div>
        <div className="flex items-end gap-3 w-full sm:w-auto">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-36 rounded-lg bg-secondary/50 border-border/50 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button onClick={load} disabled={loading} className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-secondary inline-flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      <motion.div className="bg-card rounded-xl border border-border shadow-card overflow-hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <SortableTableHead sortKey="productCode" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Code</SortableTableHead>
              <SortableTableHead sortKey="productName" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Name</SortableTableHead>
              <SortableTableHead sortKey="productCategory" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Category</SortableTableHead>
              <SortableTableHead sortKey="unitOfMeasure" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">UOM</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Product Site</TableHead>
              <SortableTableHead sortKey="availableQty" sort={sort} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell text-right">Available Qty</SortableTableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading products…</TableCell></TableRow>
            ) : sort.sorted.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No products found</TableCell></TableRow>
            ) : sort.sorted.map((p, i) => {
              const on = !!p.active;
              return (
                <TableRow key={p.productCode} onClick={() => openEdit(p)} className={cn("transition-colors cursor-pointer", i % 2 === 1 && "bg-secondary/20", "hover:bg-primary/[0.05]")}>
                  <TableCell className="font-medium text-sm font-mono">{p.productCode}</TableCell>
                  <TableCell className="text-sm">{p.productName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{p.productCategory ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{p.unitOfMeasure ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono hidden lg:table-cell">{p.sites && p.sites.length ? p.sites.join(", ") : "—"}</TableCell>
                  <TableCell className="text-sm text-right hidden lg:table-cell">{fmtQty(p.availableQty)}</TableCell>
                  <TableCell><StatusBadge status={on ? "Active" : "Inactive"} variant={on ? "primary" : "muted"} /></TableCell>
                  <TableCell className="text-right">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="w-4 h-4" /></button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h3 className="text-sm font-semibold">{title}</h3>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function ReadOnly({ value, mono }: { value: string; mono?: boolean }) {
  return <Input value={value} readOnly className={cn("h-9 bg-secondary/40", mono && "font-mono")} />;
}
