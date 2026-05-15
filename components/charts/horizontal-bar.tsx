"use client";

import { cn } from "@/lib/utils";

interface HorizontalBarProps {
  rows: Array<{ label: string; value: number; color?: string; meta?: string }>;
  max?: number;
  format?: (v: number) => string;
  className?: string;
  barClassName?: string;
}

export function HorizontalBar({
  rows,
  max,
  format = (v) => String(v),
  className,
  barClassName,
}: HorizontalBarProps) {
  const realMax = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((r, i) => {
        const pct = Math.max(0, Math.min(100, (r.value / realMax) * 100));
        return (
          <li key={r.label} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{r.label}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {r.meta ?? format(r.value)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700",
                  barClassName
                )}
                style={{
                  width: `${pct}%`,
                  background: r.color ?? "var(--primary)",
                  animationDelay: `${i * 60}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
