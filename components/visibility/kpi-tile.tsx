"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/charts/animated-number";

interface KpiTileProps {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  delta?: number;
  deltaSuffix?: string;
  invertDelta?: boolean;
  accent?: "search" | "ai" | "understanding" | "default";
  className?: string;
  footnote?: string;
}

const ACCENTS = {
  search: { soft: "var(--pillar-search-soft)" },
  ai: { soft: "var(--pillar-ai-soft)" },
  understanding: { soft: "var(--pillar-understanding-soft)" },
  default: { soft: "var(--accent)" },
};

export function KpiTile({
  label,
  value,
  decimals = 0,
  suffix,
  prefix,
  delta,
  deltaSuffix = "",
  invertDelta = false,
  accent = "default",
  className,
  footnote,
}: KpiTileProps) {
  const acc = ACCENTS[accent];
  const isUp = delta != null && delta > 0;
  const isDown = delta != null && delta < 0;
  const isFlat = delta != null && delta === 0;
  const trendPositive = invertDelta ? isDown : isUp;
  const trendNegative = invertDelta ? isUp : isDown;

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border p-4 hover:ring-foreground/15 transition-[box-shadow,ring,transform] duration-200",
        className
      )}
    >
      <div
        className="absolute -top-12 -right-12 size-32 rounded-full opacity-50 blur-2xl"
        style={{ background: acc.soft }}
        aria-hidden
      />

      <p className="relative text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>

      <div className="relative mt-3 flex items-baseline gap-2">
        <div className="text-3xl font-semibold tracking-tight tabular-nums leading-none">
          <AnimatedNumber
            value={value}
            decimals={decimals}
            prefix={prefix}
            suffix={suffix}
          />
        </div>
        {delta != null && (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              trendPositive && "text-[color:var(--positive)]",
              trendNegative && "text-[color:var(--negative)]",
              isFlat && "text-muted-foreground"
            )}
          >
            {isUp && <ArrowUp className="size-3" />}
            {isDown && <ArrowDown className="size-3" />}
            {isFlat && <Minus className="size-3" />}
            {Math.abs(delta).toFixed(decimals)}
            {deltaSuffix}
          </div>
        )}
      </div>

      {footnote && (
        <p className="relative mt-auto pt-4 text-xs text-muted-foreground truncate">
          {footnote}
        </p>
      )}
    </div>
  );
}
