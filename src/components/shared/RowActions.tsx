import { useState, useRef, useEffect } from "react";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface RowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex items-center justify-end gap-0.5">
      {/* Desktop inline actions */}
      <div className="hidden sm:flex items-center gap-0.5">
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/8 hover:scale-110 transition-all duration-200"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8 hover:scale-110 transition-all duration-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile ellipsis menu */}
      <div className="sm:hidden relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-elevated py-1 min-w-[140px] animate-fade-in">
            <button
              onClick={() => { onEdit?.(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-primary/6 transition-colors duration-150"
            >
              <Edit className="w-3.5 h-3.5 text-primary" />
              Edit
            </button>
            <button
              onClick={() => { onDelete?.(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/6 transition-colors duration-150"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
