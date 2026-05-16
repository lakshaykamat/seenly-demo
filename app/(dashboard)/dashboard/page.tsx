"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getQuota } from "@/lib/mocks/store";
import {
  useRuns,
  useRun,
  useCompetitors,
  type RunListItem,
} from "@/lib/api/runs";
import { useRecommendations } from "@/lib/api/recommendations";
import { Can } from "@/components/can";
import { UpgradeMessage } from "@/components/upgrade-message";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiTile } from "@/components/visibility/kpi-tile";
import { RunStatusBadge } from "@/components/dashboard/run-status-badge";
import { NewRunDialog } from "@/components/dashboard/new-run-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatDistanceToNow } from "@/lib/format";
import {
  ArrowRight,
  Plus,
  Search,
  Sparkles,
  Network,
  AlertTriangle,
  Trophy,
  ChevronRight,
} from "lucide-react";
import type { QuotaResponse } from "@/types";
import type {
  Recommendation,
  RecommendationPillar,
} from "@/lib/mocks/recommendations";

const PILLAR_ACCENT: Record<
  RecommendationPillar,
  { color: string; soft: string; label: string }
> = {
  search: {
    color: "var(--pillar-search)",
    soft: "var(--pillar-search-soft)",
    label: "Search",
  },
  ai: {
    color: "var(--pillar-ai)",
    soft: "var(--pillar-ai-soft)",
    label: "AI",
  },
  understanding: {
    color: "var(--pillar-understanding)",
    soft: "var(--pillar-understanding-soft)",
    label: "Understanding",
  },
};

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: runs } = useRuns();
  const { data: recommendations } = useRecommendations();

  const { data: quota } = useQuery<QuotaResponse>({
    queryKey: ["quota"],
    queryFn: () => getQuota(),
    enabled: !!user,
  });

  const completedRuns = useMemo(
    () =>
      (runs ?? [])
        .filter((r) => r.status === "completed" && r.seenly_score != null)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [runs]
  );

  const latestRun = completedRuns[completedRuns.length - 1] ?? null;
  const previousRun = completedRuns[completedRuns.length - 2] ?? null;

  const { data: latestDetail } = useRun(latestRun?.id ?? "");
  const { data: prevDetail } = useRun(previousRun?.id ?? "");
  const { data: competitors } = useCompetitors(
    latestRun?.id ?? "",
    !!latestRun
  );

  const seenlyDelta =
    latestRun && previousRun
      ? Number(
          (
            (latestRun.seenly_score ?? 0) - (previousRun.seenly_score ?? 0)
          ).toFixed(1)
        )
      : undefined;

  const avs = latestDetail?.scores?.avs_score ?? null;
  const aeo = latestDetail?.scores?.aeo_score ?? null;
  const sentiment = latestDetail?.scores?.sentiment_score ?? null;

  const avsDelta =
    avs != null && prevDetail?.scores?.avs_score != null
      ? round1(avs - prevDetail.scores.avs_score)
      : undefined;
  const aeoDelta =
    aeo != null && prevDetail?.scores?.aeo_score != null
      ? round1(aeo - prevDetail.scores.aeo_score)
      : undefined;
  const sentimentDelta =
    sentiment != null && prevDetail?.scores?.sentiment_score != null
      ? round1(sentiment - prevDetail.scores.sentiment_score)
      : undefined;

  const recentRuns = (runs ?? []).slice(0, 2);

  const topRecs = useMemo(() => {
    if (!recommendations) return [];
    return recommendations
      .filter((r) => r.status === "open" || r.status === "in_progress")
      .sort((a, b) => {
        if (b.impactScore !== a.impactScore)
          return b.impactScore - a.impactScore;
        return a.effortScore - b.effortScore;
      })
      .slice(0, 4);
  }, [recommendations]);

  const topCompetitors = (competitors ?? [])
    .slice()
    .sort((a, b) => b.mention_count - a.mention_count)
    .slice(0, 5);

  if (!runs || !recommendations) return <DashboardSkeleton />;

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <Can roles={["admin", "analyst"]}>
            <NewRunDialog>
              <Button size="sm" disabled={quota != null && !quota.allowed}>
                <Plus className="size-4" />
                New run
              </Button>
            </NewRunDialog>
          </Can>
        }
      />

      {/* Hero KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Rankly score"
          value={latestRun?.seenly_score ?? 0}
          decimals={1}
          delta={seenlyDelta}
          footnote={
            previousRun ? `vs ${previousRun.seenly_score?.toFixed(1)} prior` : undefined
          }
        />
        <KpiTile
          label="AVS · search"
          value={avs ?? 0}
          decimals={1}
          delta={avsDelta}
          footnote="Search visibility"
        />
        <KpiTile
          label="AEO · AI"
          value={aeo ?? 0}
          decimals={1}
          delta={aeoDelta}
          footnote="Answer-engine optimization"
        />
        <KpiTile
          label="Sentiment"
          value={sentiment ?? 0}
          decimals={1}
          delta={sentimentDelta}
          footnote="Across cited mentions"
        />
      </div>

      {/* Pillar shortcuts */}
      <div className="grid gap-3 sm:grid-cols-3">
        <PillarShortcut
          href="/visibility/search"
          icon={<Search className="size-4" />}
          label="Search Visibility"
          description="SERP presence and rank movement"
          accent="search"
        />
        <PillarShortcut
          href="/visibility/ai"
          icon={<Sparkles className="size-4" />}
          label="AI Recommendation"
          description="Citation share across AI engines"
          accent="ai"
        />
        <PillarShortcut
          href="/visibility/understanding"
          icon={<Network className="size-4" />}
          label="AI Understanding"
          description="Schema, llms.txt, and crawler access"
          accent="understanding"
        />
      </div>

      {/* Two-column: Recent runs + Top recommendations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Recent runs</CardTitle>
            <Link
              href="/runs"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentRuns.length === 0 ? (
              <p className="px-6 py-10 text-sm text-muted-foreground text-center">
                No runs yet.
              </p>
            ) : (
              <ul className="divide-y">
                {recentRuns.map((run) => (
                  <RecentRunRow key={run.id} run={run} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <CardTitle className="text-base font-semibold">
                Top recommendations
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {topRecs.length} of{" "}
                {
                  recommendations.filter(
                    (r) => r.status === "open" || r.status === "in_progress"
                  ).length
                }{" "}
                open · ranked by impact
              </p>
            </div>
            <Link
              href="/recommendations"
              className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              View all
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {topRecs.length === 0 ? (
              <p className="px-6 py-10 text-sm text-muted-foreground text-center">
                Nothing open.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {topRecs.map((rec) => (
                  <RecommendationRow key={rec.id} rec={rec} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Competitors + Quota */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium inline-flex items-center gap-2">
              <Trophy className="size-4 text-muted-foreground" />
              Top competitors by mentions
            </CardTitle>
            <Link
              href="/competitors"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {topCompetitors.length === 0 ? (
              <p className="px-6 py-10 text-sm text-muted-foreground text-center">
                No competitor data on the latest run yet.
              </p>
            ) : (
              <ul className="divide-y">
                {topCompetitors.map((c, i) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-4 px-6 py-2.5 text-sm"
                  >
                    <span className="w-5 text-xs text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate font-medium">
                      {c.domain}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {c.mention_count} mentions
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">
                      avg pos {c.avg_position?.toFixed(1) ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                Monthly usage
              </CardTitle>
              {quota && quota.limit !== -1 && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {quota.used} / {quota.limit}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!quota && <Skeleton className="h-2 w-full" />}
            {quota && quota.limit !== -1 && (
              <>
                <Progress
                  value={Math.min((quota.used / quota.limit) * 100, 100)}
                />
                <p className="text-xs text-muted-foreground">
                  Runs used this billing cycle
                </p>
              </>
            )}
            {quota && quota.limit === -1 && (
              <p className="text-sm text-muted-foreground">
                Unlimited runs on your Enterprise plan.
              </p>
            )}
            {quota && !quota.allowed && (
              <UpgradeMessage message="You've reached your monthly run limit. Upgrade to continue." />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function PillarShortcut({
  href,
  icon,
  label,
  description,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  accent: "search" | "ai" | "understanding";
}) {
  const acc = PILLAR_ACCENT[accent];
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl bg-card ring-1 ring-border p-4 hover:ring-foreground/15 transition-all"
    >
      <div
        className="absolute -top-10 -right-10 size-28 rounded-full opacity-60 blur-2xl"
        style={{ background: acc.soft }}
        aria-hidden
      />
      <div className="relative">
        <div
          className="size-9 rounded-lg grid place-items-center"
          style={{ background: acc.soft, color: acc.color }}
        >
          {icon}
        </div>
        <p className="mt-3 text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

function RecentRunRow({ run }: { run: RunListItem }) {
  const showSpinner =
    run.status === "pending" ||
    run.status === "queued" ||
    run.status === "running";
  return (
    <li>
      <Link
        href={`/runs/${run.id}`}
        className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <RunStatusBadge status={run.status} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {run.project_name ?? `Run ${run.id.slice(0, 8)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(run.created_at)}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {run.status === "completed" && run.seenly_score != null ? (
            <span className="text-sm font-semibold tabular-nums">
              {run.seenly_score.toFixed(1)}
            </span>
          ) : run.status === "failed" ? (
            <AlertTriangle className="size-4 text-[color:var(--negative)]" />
          ) : showSpinner ? (
            <span className="text-xs text-muted-foreground">processing</span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function RecommendationRow({ rec }: { rec: Recommendation }) {
  const acc = PILLAR_ACCENT[rec.pillar];
  const dueDate = rec.dueAt
    ? new Date(rec.dueAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <li>
      <Link
        href="/recommendations"
        className="group flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-muted/30"
      >
        <span
          aria-hidden
          className="size-1.5 rounded-full shrink-0"
          style={{ background: acc.color }}
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground truncate">
            {rec.title}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{acc.label}</span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span className="capitalize">{rec.impact} impact</span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>{rec.effort} effort</span>
            {dueDate && (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span>Due {dueDate}</span>
              </>
            )}
            {rec.status === "in_progress" && (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-[color:var(--warning)]">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: "var(--warning)" }}
                  />
                  In progress
                </span>
              </>
            )}
          </div>
        </div>

        <ChevronRight className="size-4 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground shrink-0" />
      </Link>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
