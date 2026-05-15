"use client";

import Link from "next/link";
import { Play, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/components/can";
import { RunStatusBadge } from "@/components/dashboard/run-status-badge";
import { NewRunDialog } from "@/components/dashboard/new-run-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { useRuns, type RunListItem } from "@/lib/api/runs";
import { useLiveRuns } from "@/lib/use-live-runs";
import { NEW_RUN_STAGES } from "@/lib/mocks/onboarding-stages";
import { isSessionRun } from "@/lib/mocks/store";
import { formatDistanceToNow } from "@/lib/format";

// ── Score display ───────────────────────────────────────────

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">--</span>;
  return (
    <span className="tabular-nums font-semibold">{Math.round(score)}</span>
  );
}

// ── Loading skeleton ────────────────────────────────────────

function RunsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Play className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No runs yet</p>
      <p className="text-sm text-muted-foreground mt-1">
        Create your first analysis run to get started.
      </p>
      <Can roles={["admin", "analyst"]}>
        <NewRunDialog>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="size-4" />
            New run
          </Button>
        </NewRunDialog>
      </Can>
    </div>
  );
}

// ── Run row ─────────────────────────────────────────────────

function stageLabelFor(run: RunListItem): string | null {
  if (!run.status_stage) return null;
  if (!isSessionRun(run.id)) return null;
  const stage = NEW_RUN_STAGES.find((s) => s.key === run.status_stage);
  if (!stage) return null;
  return stage.label(run.project_name ?? "your site");
}

function RunRow({ run }: { run: RunListItem }) {
  const isActive =
    run.status === "pending" ||
    run.status === "queued" ||
    run.status === "running";
  const stageLabel = isActive ? stageLabelFor(run) : null;

  return (
    <Link
      href={`/runs/${run.id}`}
      className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3 min-w-0">
        <RunStatusBadge status={run.status} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {run.project_name ?? `Run ${run.id.slice(0, 8)}`}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {stageLabel ?? formatDistanceToNow(run.created_at)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {run.status === "completed" && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Score</p>
            <ScoreCell score={run.seenly_score} />
          </div>
        )}
        {isActive && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function RunsPage() {
  useLiveRuns();
  const { data: runs, isLoading, error } = useRuns();

  if (isLoading) return <RunsSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Runs"
        actions={
          <Can roles={["admin", "analyst"]}>
            <NewRunDialog>
              <Button size="sm">
                <Plus className="size-4" />
                New run
              </Button>
            </NewRunDialog>
          </Can>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load runs. Please try again.
        </div>
      )}

      {!error && (!runs || runs.length === 0) && <EmptyState />}

      {runs && runs.length > 0 && (
        <div className="space-y-2">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
