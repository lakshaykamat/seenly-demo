"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface LineSeries {
  name: string;
  color: string;
  data: number[];
}

interface LineChartProps {
  series: LineSeries[];
  xLabels: string[];
  height?: number;
  yFormat?: (v: number) => string;
  yMin?: number;
  yMax?: number;
  showLegend?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function LineChart({
  series,
  xLabels,
  height = 220,
  yFormat = (v) => String(Math.round(v)),
  yMin,
  yMax,
  showLegend = true,
  className,
  ariaLabel,
}: LineChartProps) {
  const padX = 36;
  const padY = 20;
  const padBottom = 28;
  const width = 720;

  const { min, max } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    series.forEach((s) => {
      s.data.forEach((v) => {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      });
    });
    if (yMin != null) lo = yMin;
    if (yMax != null) hi = yMax;
    if (lo === hi) hi = lo + 1;
    return { min: lo, max: hi };
  }, [series, yMin, yMax]);

  const range = max - min || 1;
  const dataLen = series[0]?.data.length ?? 0;
  const innerW = width - padX - 12;
  const innerH = height - padY - padBottom;
  const stepX = innerW / Math.max(dataLen - 1, 1);

  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i <= 4; i++) arr.push(min + (range * i) / 4);
    return arr;
  }, [min, range]);

  const [hover, setHover] = useState<number | null>(null);

  function pointXY(s: LineSeries, i: number): [number, number] {
    const x = padX + i * stepX;
    const norm = (s.data[i] - min) / range;
    const y = padY + (1 - norm) * innerH;
    return [x, y];
  }

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full flex-1 min-h-0"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const target = e.currentTarget;
          const rect = target.getBoundingClientRect();
          const ratio = width / rect.width;
          const xInSvg = (e.clientX - rect.left) * ratio;
          if (xInSvg < padX - 4 || xInSvg > padX + innerW + 4) {
            setHover(null);
            return;
          }
          const idx = Math.round((xInSvg - padX) / stepX);
          setHover(Math.max(0, Math.min(dataLen - 1, idx)));
        }}
      >
        {/* gridlines + y labels */}
        {ticks.map((t, i) => {
          const y = padY + (1 - (t - min) / range) * innerH;
          return (
            <g key={i}>
              <line
                x1={padX}
                x2={padX + innerW}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-border"
                strokeDasharray={i === 0 ? "0" : "3 4"}
                strokeWidth={i === 0 ? 1 : 0.75}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={padX - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {yFormat(t)}
              </text>
            </g>
          );
        })}

        {/* x labels — first, middle, last */}
        {[0, Math.floor(dataLen / 2), dataLen - 1].map((i) => {
          if (i < 0 || i >= dataLen) return null;
          const x = padX + i * stepX;
          return (
            <text
              key={`x${i}`}
              x={x}
              y={height - 8}
              textAnchor={
                i === 0 ? "start" : i === dataLen - 1 ? "end" : "middle"
              }
              className="fill-muted-foreground text-[10px]"
            >
              {xLabels[i]}
            </text>
          );
        })}

        {/* series paths + areas */}
        {series.map((s, sIdx) => {
          const points = s.data.map((_, i) => pointXY(s, i));
          const path = points
            .map(
              ([x, y], i) =>
                `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
            )
            .join(" ");
          const area = `${path} L${(padX + innerW).toFixed(2)},${(padY + innerH).toFixed(2)} L${padX.toFixed(2)},${(padY + innerH).toFixed(2)} Z`;
          const gradId = `lcg-${sIdx}-${Math.random().toString(36).slice(2, 7)}`;
          return (
            <g key={s.name}>
              <defs>
                <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              {series.length === 1 && (
                <path d={area} fill={`url(#${gradId})`} />
              )}
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="animate-draw-in"
                style={{ animationDelay: `${sIdx * 80}ms` }}
              />
            </g>
          );
        })}

        {/* hover indicator */}
        {hover != null && (
          <g>
            <line
              x1={padX + hover * stepX}
              x2={padX + hover * stepX}
              y1={padY}
              y2={padY + innerH}
              stroke="currentColor"
              className="text-foreground/30"
              strokeWidth={1}
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
            {series.map((s) => {
              const [cx, cy] = pointXY(s, hover);
              return (
                <circle
                  key={s.name}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="var(--background)"
                  stroke={s.color}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
        )}
      </svg>

      {hover != null && (
        <div className="mt-2 rounded-lg border bg-popover px-3 py-2 text-xs shadow-sm">
          <p className="text-muted-foreground mb-1">{xLabels[hover]}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-muted-foreground">{s.name}</span>
                <span className="font-medium tabular-nums">
                  {yFormat(s.data[hover])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLegend && series.length > 1 && hover == null && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs">
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
