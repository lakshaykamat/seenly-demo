"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Globe, Layers, Quote, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ENGINE_PROBES,
  FIRST_RUN_ACTIVITY,
  getEngineState,
  type ActivityEvent,
  type ActivityStatus,
  type OnboardingStage,
} from "@/lib/mocks/onboarding-stages";

interface OnboardingActivityProps {
  domain: string;
  stages: OnboardingStage[];
  totalMs: number;
  finalScore?: number;
  onDone: () => void;
  holdMs?: number;
}

const KIND_GLYPH: Record<ActivityEvent["kind"], string> = {
  sys: "·",
  crawl: "↳",
  serp: "↳",
  engine: "↳",
  cite: "↳",
};

const KIND_LABEL: Record<ActivityEvent["kind"], string> = {
  sys: "sys",
  crawl: "crawl",
  serp: "serp",
  engine: "engine",
  cite: "cite",
};

export function OnboardingActivity({
  domain,
  stages,
  totalMs,
  finalScore = 74.6,
  onDone,
  holdMs = 1400,
}: OnboardingActivityProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const doneCalledRef = useRef(false);

  useEffect(() => {
    startRef.current = performance.now();
    const tick = () => {
      const now = performance.now();
      const ms = Math.min(now - startRef.current, totalMs);
      setElapsed(ms);
      if (ms < totalMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!doneCalledRef.current) {
        doneCalledRef.current = true;
        window.setTimeout(onDone, holdMs);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [totalMs, holdMs, onDone]);

  const activeIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < stages.length; i++) {
      if (elapsed >= stages[i].startMs) idx = i;
    }
    return idx;
  }, [stages, elapsed]);

  const percent = Math.min(100, (elapsed / totalMs) * 100);
  const active = stages[activeIdx];
  const isProbing = active.key === "probing_engines";
  const isDone = elapsed >= totalMs;

  const visibleEvents = useMemo(() => {
    const fired = FIRST_RUN_ACTIVITY.filter((e) => e.atMs <= elapsed);
    return fired.slice(-9).reverse();
  }, [elapsed]);

  const elapsedClock = formatClock(elapsed);

  const heading = isDone
    ? `Ready · Rankly score ${finalScore.toFixed(1)}`
    : active.label(domain);

  return (
    <div className="relative w-full">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground font-mono tracking-wider">
        <span className="uppercase">{domain}</span>
        <span className="tabular-nums">
          elapsed <span className="text-foreground">{elapsedClock}</span>
        </span>
      </div>

      <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      <h2 className="mt-10 font-semibold text-3xl md:text-4xl text-foreground leading-[1.1] tracking-tight">
        {heading}
      </h2>
      <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
        {active.sublines[Math.floor(elapsed / 750) % active.sublines.length]}
      </p>

      <div className="mt-8 relative h-[3px] w-full rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-150 ease-linear"
          style={{ width: `${percent}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary blur-md transition-[width] duration-150 ease-linear"
          style={{ width: `${percent}%`, opacity: 0.45 }}
        />
      </div>

      {isProbing && (
        <div className="mt-10 rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur-sm p-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/80">
            engines
          </div>
          <ul className="mt-3 space-y-3">
            {ENGINE_PROBES.map((probe) => {
              const s = getEngineState(probe, elapsed);
              const askedPct = (s.asked / probe.total) * 100;
              return (
                <li
                  key={probe.id}
                  className="grid grid-cols-[10px_minmax(0,160px)_1fr_72px] items-center gap-3 text-sm"
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      s.state === "queued" && "bg-muted-foreground/30",
                      s.state === "active" && "bg-emerald-500 animate-pulse",
                      s.state === "done" && "bg-foreground/70"
                    )}
                  />
                  <span className="font-mono text-foreground/85 truncate">
                    {probe.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-[width] duration-150 ease-linear"
                        style={{ width: `${askedPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {s.asked}/{probe.total}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-foreground/70 tabular-nums text-right">
                    {s.state === "queued" ? "—" : `cited ${s.cited}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/80">
          <span>live activity</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            streaming
          </span>
        </div>
        <div className="mt-3 h-px w-full bg-border" />
        <ul className="mt-2 font-mono text-[12.5px] leading-7">
          {visibleEvents.length === 0 && (
            <li className="text-muted-foreground/60">waiting for activity…</li>
          )}
          {visibleEvents.map((ev) => (
            <ActivityRow key={ev.atMs} event={ev} elapsed={elapsed} />
          ))}
        </ul>
      </div>

      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
        {stages
          .filter((s) => s.key !== "done")
          .map((stage, i) => {
            const isActive = i === activeIdx;
            const isDoneStage = i < activeIdx;
            return (
              <div
                key={stage.key}
                className="flex items-center gap-2.5 font-mono text-[11px]"
              >
                <span
                  className={cn(
                    "inline-flex size-4 items-center justify-center rounded-full border text-[9px]",
                    isDoneStage && "bg-primary border-primary text-primary-foreground",
                    isActive && "border-primary text-primary",
                    !isActive && !isDoneStage && "border-border text-muted-foreground/50"
                  )}
                >
                  {isDoneStage ? (
                    <Check className="size-2.5" strokeWidth={3} />
                  ) : isActive ? (
                    <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "uppercase tracking-wider truncate",
                    isDoneStage && "text-foreground/65",
                    isActive && "text-foreground",
                    !isActive && !isDoneStage && "text-muted-foreground/50"
                  )}
                >
                  {STAGE_SHORT[stage.key] ?? stage.key}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

const STAGE_SHORT: Record<string, string> = {
  validating: "validate",
  discovering_pages: "discover",
  fetching_serp: "serp",
  crawling_pages: "crawl",
  probing_engines: "ai engines",
  analyzing_citations: "citations",
  scoring: "score",
  building_workspace: "workspace",
};

function ActivityRow({
  event,
  elapsed,
}: {
  event: ActivityEvent;
  elapsed: number;
}) {
  const age = elapsed - event.atMs;
  const fade = age > 6000 ? 0.4 : age > 3500 ? 0.65 : age > 1500 ? 0.85 : 1;
  return (
    <li
      style={{ opacity: fade }}
      className="grid grid-cols-[60px_72px_24px_1fr_auto] items-baseline gap-x-3 animate-fade-up"
    >
      <span className="text-muted-foreground/70 tabular-nums">
        {formatClock(event.atMs)}
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <KindIcon kind={event.kind} />
        {KIND_LABEL[event.kind]}
      </span>
      <span className="text-muted-foreground/50">{KIND_GLYPH[event.kind]}</span>
      <span className="text-foreground/90 truncate">
        <span className="text-muted-foreground">{event.source}</span>
        <span className="mx-2 text-border">·</span>
        {event.message}
      </span>
      <StatusBadge status={event.status} meta={event.meta} />
    </li>
  );
}

function KindIcon({ kind }: { kind: ActivityEvent["kind"] }) {
  const cls = "size-3 opacity-70";
  if (kind === "engine") return <Sparkles className={cls} />;
  if (kind === "crawl") return <Layers className={cls} />;
  if (kind === "serp") return <Globe className={cls} />;
  if (kind === "cite") return <Quote className={cls} />;
  return <span className="size-3 inline-block" />;
}

function StatusBadge({
  status,
  meta,
}: {
  status?: ActivityStatus;
  meta?: string;
}) {
  if (!status && !meta) return <span />;
  if (status === "cited") {
    return (
      <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-600">
        cited
      </span>
    );
  }
  if (status === "no-mention") {
    return (
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60">
        no mention
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="font-mono text-[11px] uppercase tracking-wider text-amber-600">
        warn
      </span>
    );
  }
  if (status === "ok") {
    return (
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        ok
      </span>
    );
  }
  if (status === "up") {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600">
        <TrendingUp className="size-3" />
        {meta}
      </span>
    );
  }
  if (status === "down") {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-rose-600">
        <TrendingDown className="size-3" />
        {meta}
      </span>
    );
  }
  return <span />;
}

function formatClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
