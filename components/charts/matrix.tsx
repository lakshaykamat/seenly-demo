"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export interface MatrixCell {
  value: number | null;
  label?: string;
  tone?: "positive" | "negative" | "neutral" | "muted";
  href?: string;
}

interface MatrixProps {
  columns: string[];
  rows: Array<{ label: string; sublabel?: string; cells: MatrixCell[] }>;
  cellSize?: number;
  rowLabelWidth?: number;
  colorScale?: (v: number, max: number) => string;
  format?: (v: number) => string;
  className?: string;
}

const defaultScale = (v: number, max: number): string => {
  if (max <= 0) return "var(--muted)";
  const t = Math.max(0, Math.min(1, v / max));
  // map 0..1 → low alpha to high alpha of pillar-ai (violet)
  const alpha = 0.08 + t * 0.85;
  return `color-mix(in oklch, var(--pillar-ai) ${alpha * 100}%, transparent)`;
};

export function Matrix({
  columns,
  rows,
  cellSize = 44,
  rowLabelWidth = 220,
  colorScale = defaultScale,
  format = (v) => String(v),
  className,
}: MatrixProps) {
  const max = Math.max(
    1,
    ...rows.flatMap((r) => r.cells.map((c) => c.value ?? 0))
  );

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="w-full">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `minmax(${rowLabelWidth}px, 1fr) repeat(${columns.length}, ${cellSize}px)`,
          }}
        >
          <div />
          {columns.map((c) => (
            <div
              key={c}
              className="text-[10px] font-medium text-muted-foreground text-center pb-2 truncate px-1"
              title={c}
            >
              {c}
            </div>
          ))}

          {rows.map((row, ri) => (
            <div key={row.label} className="contents">
              <div className="flex flex-col justify-center pr-3 py-1 border-t border-border/60">
                <span className="text-sm truncate">{row.label}</span>
                {row.sublabel && (
                  <span className="text-[10px] text-muted-foreground">
                    {row.sublabel}
                  </span>
                )}
              </div>
              {row.cells.map((cell, ci) => {
                const v = cell.value ?? 0;
                const isNull = cell.value == null;
                const bg = isNull
                  ? "var(--muted)"
                  : cell.tone === "negative"
                    ? `color-mix(in oklch, var(--negative) ${30 + (v / max) * 60}%, transparent)`
                    : cell.tone === "positive"
                      ? `color-mix(in oklch, var(--positive) ${30 + (v / max) * 60}%, transparent)`
                      : cell.tone === "muted"
                        ? "var(--muted)"
                        : colorScale(v, max);
                const swatch = (
                  <div
                    className="size-[36px] rounded-md flex items-center justify-center text-[11px] font-medium tabular-nums animate-fade-up transition-transform group-hover:scale-110"
                    style={{
                      background: bg,
                      color: isNull
                        ? "var(--muted-foreground)"
                        : "var(--foreground)",
                      animationDelay: `${(ri * columns.length + ci) * 8}ms`,
                    }}
                    title={cell.label}
                  >
                    {isNull ? "—" : format(v)}
                  </div>
                );
                return (
                  <div
                    key={ci}
                    className="border-t border-l border-border/60 flex items-center justify-center"
                    style={{ height: cellSize }}
                  >
                    {cell.href ? (
                      <Link
                        href={cell.href}
                        className="group block"
                        title={cell.label}
                      >
                        {swatch}
                      </Link>
                    ) : (
                      swatch
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
