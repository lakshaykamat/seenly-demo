"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRuns, type RunListItem } from "@/lib/api/runs";
import { NEW_RUN_STAGES } from "@/lib/mocks/onboarding-stages";
import { isSessionRun } from "@/lib/mocks/store";
import { useLiveRuns } from "@/lib/use-live-runs";

function activeStageLabel(run: RunListItem): string {
  if (run.status_stage) {
    const stage = NEW_RUN_STAGES.find((s) => s.key === run.status_stage);
    if (stage) {
      const short = stage.label(run.project_name ?? "your site");
      return short.length > 60 ? short.slice(0, 57) + "…" : short;
    }
  }
  return run.status === "queued" ? "Queued" : "Processing";
}

export function ActiveRunPill() {
  useLiveRuns();
  const { data: runs } = useRuns();
  const [, setTick] = useState(0);

  // Tick once per second so the stage label refreshes between store events.
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Only surface runs whose staged progression is actually advancing in this
  // session — seed runs in "running" state are static fixture data and would
  // otherwise pin the pill on a meaningless stage forever.
  const active = runs?.find(
    (r) =>
      (r.status === "queued" || r.status === "running") && isSessionRun(r.id)
  );

  if (!active) return null;

  return (
    <Link
      href={`/runs/${active.id}`}
      className="hidden sm:inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 max-w-[420px]"
    >
      <Loader2 className="size-3 animate-spin" />
      <span className="truncate">Run in progress · {activeStageLabel(active)}</span>
    </Link>
  );
}
