"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingStage } from "@/lib/mocks/onboarding-stages";

interface ProcessingStagesProps {
  domain: string;
  stages: OnboardingStage[];
  totalMs: number;
  finalScore?: number;
  onDone: () => void;
  holdMs?: number;
}

export function ProcessingStages({
  domain,
  stages,
  totalMs,
  finalScore = 74.6,
  onDone,
  holdMs = 1200,
}: ProcessingStagesProps) {
  const [elapsed, setElapsed] = useState(0);
  const [sublineIdx, setSublineIdx] = useState(0);
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

  useEffect(() => {
    const id = window.setInterval(() => setSublineIdx((i) => i + 1), 750);
    return () => window.clearInterval(id);
  }, []);

  const activeIdx = (() => {
    let idx = 0;
    for (let i = 0; i < stages.length; i++) {
      if (elapsed >= stages[i].startMs) idx = i;
    }
    return idx;
  })();

  const isComplete = elapsed >= totalMs;
  const percent = Math.min(100, Math.round((elapsed / totalMs) * 100));
  const active = stages[activeIdx];
  const labelText = active.label(domain);
  const subline = active.sublines[sublineIdx % active.sublines.length];

  return (
    <div className="rounded-2xl border bg-card shadow-sm p-8 md:p-10">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>Analyzing {domain}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>

      <div className="mt-6 min-h-[88px]">
        <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
          {isComplete && active.key === "done"
            ? `Ready — Rankly score ${finalScore.toFixed(1)} · routing to dashboard…`
            : labelText}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground transition-opacity">
          {subline}
        </p>
      </div>

      <div className="mt-6 relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-150 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-8 space-y-2.5">
        {stages.map((stage, i) => {
          const state =
            i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
          return (
            <li
              key={stage.key}
              className={cn(
                "flex items-center gap-3 text-sm transition-colors",
                state === "done" && "text-foreground/80",
                state === "active" && "text-foreground",
                state === "pending" && "text-muted-foreground/60"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full border text-[10px]",
                  state === "done" && "border-primary bg-primary text-primary-foreground",
                  state === "active" && "border-primary text-primary",
                  state === "pending" && "border-muted-foreground/30"
                )}
              >
                {state === "done" ? (
                  <Check className="size-3" />
                ) : state === "active" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              <span className="truncate">{stage.label(domain)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
