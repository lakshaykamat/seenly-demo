"use client";

import { cn } from "@/lib/utils";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

export function Donut({
  segments,
  size = 180,
  thickness = 18,
  centerLabel,
  centerValue,
  className,
}: DonutProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  const offsets: number[] = [];
  segments.reduce((acc, s) => {
    offsets.push(acc);
    return acc + s.value / total;
  }, 0);

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/60"
          strokeWidth={thickness}
        />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = circ * frac;
          const offset = -offsets[i] * circ;
          return (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              className="transition-all"
              style={{
                animation: `draw-in 720ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          );
        })}
      </svg>
      <div className="flex-1 min-w-0">
        {(centerLabel || centerValue) && (
          <div className="mb-3">
            {centerValue && (
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {centerValue}
              </div>
            )}
            {centerLabel && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {centerLabel}
              </div>
            )}
          </div>
        )}
        <ul className="space-y-1.5">
          {segments.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: s.color }}
                />
                <span className="text-muted-foreground truncate">
                  {s.label}
                </span>
              </div>
              <span className="tabular-nums font-medium">
                {Math.round((s.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
