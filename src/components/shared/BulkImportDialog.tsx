import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2, X, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface BulkImportColumn {
  key: string;
  label: string;
  required?: boolean;
  example?: string;
}

export interface ParsedRowResult<T> {
  data: Partial<T> | null;
  errors: string[];
  isUpdate?: boolean;
}

export interface BulkImportPanelProps<T> {
  entityLabel: string;
  columns: BulkImportColumn[];
  parseRow: (raw: Record<string, string>, rowIndex: number) => ParsedRowResult<T>;
  importRow: (row: Partial<T>, isUpdate: boolean) => Promise<void>;
  onImported: () => void;
  templateFilename: string;
  hideHeader?: boolean;
}

export interface BulkImportDialogProps<T> extends BulkImportPanelProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PreviewRow<T> = ParsedRowResult<T> & {
  rowIndex: number;
  raw: Record<string, string>;
  status: "pending" | "importing" | "success" | "failed";
  importError?: string;
};

/**
 * Core upload -> preview -> confirm -> import flow, with no dialog chrome.
 * Used both standalone (the dedicated Bulk Activity page) and wrapped in a
 * modal (BulkImportDialog, below - the per-entity-page "Bulk Import" button).
 */
export function BulkImportPanel<T>({
  entityLabel, columns, parseRow, importRow, onImported, templateFilename, hideHeader,
}: BulkImportPanelProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow<T>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [parseError, setParseError] = useState<string | null>(null);

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.length - validCount;
  const successCount = rows.filter((r) => r.status === "success").length;
  const failedCount = rows.filter((r) => r.status === "failed").length;
  const hasRun = successCount + failedCount > 0;

  function reset() {
    setFileName(null);
    setRows([]);
    setParsing(false);
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function downloadTemplate() {
    const header = columns.map((c) => c.label).join(",");
    const example = columns.map((c) => c.example ?? "").join(",");
    const csv = `${header}\n${example}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function rowsFromSheetData(data: Record<string, string>[]) {
    const parsed: PreviewRow<T>[] = data.map((raw, i) => {
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        normalized[k.trim()] = typeof v === "string" ? v.trim() : String(v ?? "");
      }
      const result = parseRow(normalized, i);
      return { ...result, rowIndex: i, raw: normalized, status: "pending" as const };
    });
    setRows(parsed);
  }

  async function handleFile(file: File) {
    setParseError(null);
    setFileName(file.name);
    setParsing(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "csv") {
        const text = await file.text();
        const { data, errors } = Papa.parse<Record<string, string>>(text, {
          header: true, skipEmptyLines: true,
        });
        if (errors.length) throw new Error(errors[0].message);
        rowsFromSheetData(data);
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
        rowsFromSheetData(data);
      } else {
        throw new Error("Unsupported file type - please upload a .csv, .xlsx, or .xls file.");
      }
    } catch (e: any) {
      setParseError(e?.message ?? "Failed to parse file.");
      setRows([]);
    } finally {
      setParsing(false);
    }
  }

  async function runImport() {
    const toImport = rows.filter((r) => r.errors.length === 0);
    if (!toImport.length) return;
    setImporting(true);
    setProgress({ done: 0, total: toImport.length });

    for (const row of toImport) {
      setRows((prev) => prev.map((r) => r.rowIndex === row.rowIndex ? { ...r, status: "importing" } : r));
      try {
        await importRow(row.data as Partial<T>, !!row.isUpdate);
        setRows((prev) => prev.map((r) => r.rowIndex === row.rowIndex ? { ...r, status: "success" } : r));
      } catch (e: any) {
        setRows((prev) => prev.map((r) => r.rowIndex === row.rowIndex
          ? { ...r, status: "failed", importError: e?.message ?? "Import failed" }
          : r));
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setImporting(false);
    onImported();
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      {!hideHeader && (
        <div>
          <h3 className="text-base font-semibold">Bulk Import {entityLabel}</h3>
          <p className="text-sm text-muted-foreground">
            Upload a CSV or Excel file to create or update multiple {entityLabel.toLowerCase()} at once.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-1.5" /> Download Template
        </Button>
        <span className="text-xs text-muted-foreground">
          Fill in the template, then upload it below. The first row must be the column headers.
        </span>
      </div>

      {!fileName ? (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-10 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm font-medium">Click to choose a file</span>
          <span className="text-xs text-muted-foreground">.csv, .xlsx, or .xls</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="font-medium">{fileName}</span>
            {parsing && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>
          {!importing && (
            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {parseError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {parseError}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} valid
            </span>
            {invalidCount > 0 && (
              <span className="flex items-center gap-1 text-destructive font-medium">
                <XCircle className="w-3.5 h-3.5" /> {invalidCount} with errors (will be skipped)
              </span>
            )}
            {hasRun && (
              <span className="text-muted-foreground">
                Imported: {successCount} succeeded, {failedCount} failed
              </span>
            )}
          </div>

          <ScrollArea className="flex-1 border border-border rounded-lg" style={{ maxHeight: 340 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr>
                  <th className="px-2 py-1.5 text-left w-8">#</th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-2 py-1.5 text-left whitespace-nowrap">{c.label}</th>
                  ))}
                  <th className="px-2 py-1.5 text-left w-40">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowIndex} className={cn(
                    "border-t border-border/50",
                    r.errors.length > 0 && "bg-destructive/5",
                    r.status === "success" && "bg-emerald-50",
                    r.status === "failed" && "bg-destructive/10",
                  )}>
                    <td className="px-2 py-1 text-muted-foreground">{r.rowIndex + 2}</td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-2 py-1 whitespace-nowrap max-w-[140px] truncate">{r.raw[c.label] ?? ""}</td>
                    ))}
                    <td className="px-2 py-1">
                      {r.status === "importing" && <span className="flex items-center gap-1 text-primary"><Loader2 className="w-3 h-3 animate-spin" /> Importing...</span>}
                      {r.status === "success" && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Imported</span>}
                      {r.status === "failed" && <span className="flex items-center gap-1 text-destructive" title={r.importError}><XCircle className="w-3 h-3" /> {r.importError ?? "Failed"}</span>}
                      {r.status === "pending" && r.errors.length > 0 && (
                        <span className="text-destructive" title={r.errors.join("; ")}>! {r.errors[0]}</span>
                      )}
                      {r.status === "pending" && r.errors.length === 0 && (
                        <span className="text-muted-foreground">{r.isUpdate ? "Will update" : "Will create"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>

          {importing && (
            <div className="space-y-1">
              <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
              <p className="text-xs text-muted-foreground text-center">{progress.done} / {progress.total} processed</p>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {fileName && (
          <Button variant="outline" onClick={reset} disabled={importing}>
            {hasRun ? "Import Another File" : "Clear"}
          </Button>
        )}
        {!hasRun && (
          <Button onClick={runImport} disabled={!validCount || importing || parsing}>
            {importing ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Importing...</> : `Import ${validCount} Row${validCount !== 1 ? "s" : ""}`}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Thin modal wrapper around BulkImportPanel - used by the per-page "Bulk Import" button. */
export function BulkImportDialog<T>({
  open, onOpenChange, ...panelProps
}: BulkImportDialogProps<T>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import {panelProps.entityLabel}</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to create or update multiple {panelProps.entityLabel.toLowerCase()} at once.
          </DialogDescription>
        </DialogHeader>
        <BulkImportPanel {...panelProps} hideHeader />
      </DialogContent>
    </Dialog>
  );
}
