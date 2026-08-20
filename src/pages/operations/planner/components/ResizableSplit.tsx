import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ResizableSplit({
  left, right, defaultLeftPct = 35, minPct = 20, maxPct = 80, leftLabel,
}: {
  left: React.ReactNode; right: React.ReactNode;
  defaultLeftPct?: number; minPct?: number; maxPct?: number; leftLabel?: string;
}) {
  const [leftPct, setLeftPct] = useState(defaultLeftPct);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number | null>(null);

  const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);

    const getX = (ev: MouseEvent | TouchEvent) =>
      "touches" in ev ? ev.touches[0].clientX : ev.clientX;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = containerRef.current!.getBoundingClientRect();
        const raw  = ((getX(ev) - rect.left) / rect.width) * 100;
        setLeftPct(Math.min(maxPct, Math.max(minPct, raw)));
      });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);
  }, [minPct, maxPct]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);


  return (
    <div className="h-full min-h-0">
      {/* Split panels */}
      <div ref={containerRef} className="flex gap-0 relative h-full min-h-0 overflow-hidden">
        {/* Left panel */}
        <div style={{ width: `calc(${leftPct}% - 5px)` }} className="flex-shrink-0 min-w-0 min-h-0 h-full overflow-hidden">
          {left}
        </div>

        {/* Draggable divider */}
        <div
          onMouseDown={startDrag} onTouchStart={startDrag}
          className={cn(
            "flex-shrink-0 flex flex-col items-center justify-center gap-1 cursor-col-resize select-none z-10 transition-colors group",
            "w-[10px] mx-0 rounded-sm",
            dragging ? "bg-primary/20" : "hover:bg-primary/10"
          )}
          title="Drag to resize"
        >
          {/* Visual handle pill */}
          <div className={cn(
            "w-1 rounded-full transition-all",
            dragging ? "h-16 bg-primary" : "h-10 bg-border group-hover:bg-primary/60"
          )} />
          {/* 3-dot grip */}
          {[0,1,2].map((i) => (
            <div key={i} className={cn(
              "w-1 h-1 rounded-full transition-colors",
              dragging ? "bg-primary" : "bg-border/60 group-hover:bg-primary/40"
            )} />
          ))}
        </div>

        {/* Right panel */}
        <div style={{ width: `calc(${100 - leftPct}% - 5px)` }} className="flex-shrink-0 min-w-0 min-h-0 h-full overflow-hidden">
          {right}
        </div>

        {/* Full-width drag capture overlay when dragging */}
        {dragging && (
          <div className="absolute inset-0 z-20 cursor-col-resize" />
        )}
      </div>
    </div>
  );
}
