"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
  Square,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RunStatusBadge } from "@/components/dashboard/run-status-badge";
import { RunProgressCard } from "@/components/dashboard/run-progress-card";
import {
  useRun,
  useEvidence,
  useCompetitors,
  type AiResult,
  type CrawlPage,
  type Competitor,
} from "@/lib/api/runs";
import {
  createRun as createRunMock,
  cancelRun as cancelRunMock,
} from "@/lib/mocks/store";
import { useLiveRuns } from "@/lib/use-live-runs";
import { formatDistanceToNow } from "@/lib/format";

// ── Score card ──────────────────────────────────────────────

function ScoreCard({
  title,
  score,
  confidence,
  suffix,
}: {
  title: string;
  score: number | null;
  confidence?: number | null;
  suffix?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {score !== null ? (
          <div>
            <span className="text-2xl font-bold tabular-nums">
              {Math.round(score)}
            </span>
            {suffix && (
              <span className="text-sm text-muted-foreground ml-1">
                {suffix}
              </span>
            )}
            {confidence !== null && confidence !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                Confidence: {Math.round(confidence)}%
              </p>
            )}
          </div>
        ) : (
          <span className="text-2xl font-bold text-muted-foreground">N/A</span>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sentiment badge ─────────────────────────────────────────

const SENTIMENT_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  favorable: "default",
  neutral: "secondary",
  cautious: "outline",
  unfavorable: "destructive",
};

function SentimentBadge({ sentiment }: { sentiment: AiResult["sentiment"] }) {
  if (!sentiment) return <span className="text-muted-foreground">--</span>;
  return (
    <Badge variant={SENTIMENT_VARIANT[sentiment]} className="capitalize">
      {sentiment}
    </Badge>
  );
}

// ── Crawl status badge ──────────────────────────────────────

const CRAWL_VARIANT: Record<
  CrawlPage["crawl_status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  ok: "default",
  partial: "outline",
  blocked: "destructive",
  unreachable: "destructive",
};

// ── Evidence tab ────────────────────────────────────────────

function EvidenceTable({ results }: { results: AiResult[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No evidence data available.
      </p>
    );
  }

  // Build consensus map: query → set of engines that cite target
  const consensusMap = new Map<string, Set<string>>();
  for (const r of results) {
    if (r.is_target) {
      const set = consensusMap.get(r.query) ?? new Set();
      set.add(r.engine);
      consensusMap.set(r.query, set);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Query</th>
            <th className="pb-2 pr-3 font-medium">Engine</th>
            <th className="pb-2 pr-3 font-medium">Pos</th>
            <th className="pb-2 pr-3 font-medium">Domain</th>
            <th className="pb-2 pr-3 font-medium">Snippet</th>
            <th className="pb-2 pr-3 font-medium">Sentiment</th>
            <th className="pb-2 font-medium">Consensus</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const isConsensus = (consensusMap.get(r.query)?.size ?? 0) >= 2;
            return (
              <tr
                key={r.id}
                className={`border-b last:border-0 ${r.is_degraded ? "opacity-50" : ""}`}
                title={
                  r.is_degraded
                    ? "Degraded: response quality was too low to score reliably"
                    : undefined
                }
              >
                <td className="py-2 pr-3 max-w-50 truncate" title={r.query}>
                  {r.query}
                </td>
                <td className="py-2 pr-3 capitalize">{r.engine}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.position !== null ? `#${r.position}` : "--"}
                </td>
                <td className="py-2 pr-3 max-w-40 truncate font-mono text-xs">
                  {r.cited_domain ?? "--"}
                </td>
                <td
                  className={`py-2 pr-3 text-xs text-muted-foreground cursor-pointer select-none ${expandedId === r.id ? "whitespace-normal" : "max-w-75 truncate"}`}
                  title={
                    expandedId === r.id ? undefined : (r.snippet ?? undefined)
                  }
                  onClick={() =>
                    setExpandedId(expandedId === r.id ? null : r.id)
                  }
                >
                  {r.snippet ?? "--"}
                </td>
                <td className="py-2 pr-3">
                  <SentimentBadge sentiment={r.sentiment} />
                </td>
                <td className="py-2">
                  {r.is_target && isConsensus ? (
                    <Badge variant="default">Yes</Badge>
                  ) : r.is_target ? (
                    <Badge variant="outline">Single</Badge>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Crawl tab ───────────────────────────────────────────────

function CrawlRow({ page }: { page: CrawlPage }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b cursor-pointer hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-2 pr-3">
          <div className="flex items-center gap-1">
            {expanded ? (
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span
              className="max-w-70 truncate font-mono text-xs"
              title={page.url}
            >
              {page.url}
            </span>
          </div>
        </td>
        <td className="py-2 pr-3">
          <Badge
            variant={CRAWL_VARIANT[page.crawl_status]}
            className="capitalize"
          >
            {page.crawl_status}
          </Badge>
        </td>
        <td className="py-2 pr-3">
          {page.page_quality_score !== null ? (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${page.page_quality_score}%` }}
                />
              </div>
              <span className="tabular-nums text-xs">
                {Math.round(page.page_quality_score)}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">--</span>
          )}
        </td>
        <td className="py-2 text-xs">{page.extraction_method ?? "--"}</td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/20">
          <td colSpan={4} className="p-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">H1:</span>{" "}
                {page.h1 ?? "None"}
              </div>
              <div>
                <span className="text-muted-foreground">FAQ:</span>{" "}
                {page.has_faq ? "Yes" : "No"}
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">H2s:</span>{" "}
                {page.h2s?.join(", ") || "None"}
              </div>
              <div>
                <span className="text-muted-foreground">Schema:</span>{" "}
                {page.has_schema
                  ? (page.schema_types?.join(", ") ?? "Yes")
                  : "No"}
              </div>
              <div>
                <span className="text-muted-foreground">Links:</span>{" "}
                {page.internal_link_count ?? "N/A"}
              </div>
              <div>
                <span className="text-muted-foreground">Text length:</span>{" "}
                {page.text_length !== null
                  ? page.text_length.toLocaleString()
                  : "N/A"}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CrawlTable({ pages }: { pages: CrawlPage[] }) {
  if (pages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No crawl data available.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">URL</th>
            <th className="pb-2 pr-3 font-medium">Status</th>
            <th className="pb-2 pr-3 font-medium">Quality</th>
            <th className="pb-2 font-medium">Method</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <CrawlRow key={page.id} page={page} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Competitors tab ─────────────────────────────────────────

function CompetitorsTable({ competitors }: { competitors: Competitor[] }) {
  if (competitors.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No competitors detected.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Domain</th>
            <th className="pb-2 pr-3 font-medium">Mentions</th>
            <th className="pb-2 pr-3 font-medium">Queries</th>
            <th className="pb-2 font-medium">Avg position</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2 pr-3 font-mono text-xs">{c.domain}</td>
              <td className="py-2 pr-3 tabular-nums">{c.mention_count}</td>
              <td className="py-2 pr-3 tabular-nums">{c.query_count}</td>
              <td className="py-2 tabular-nums">
                {c.avg_position !== null
                  ? `#${c.avg_position.toFixed(1)}`
                  : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  useLiveRuns();
  const { data: run, isLoading, error } = useRun(id);

  const retryRun = useMutation({
    mutationFn: (projectId: string | null) => createRunMock({ projectId }),
    onSuccess: (newRun) => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      toast.success("Run created");
      router.push(`/runs/${newRun.id}`);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to create run");
    },
  });

  const cancelRun = useMutation({
    mutationFn: () => cancelRunMock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", id] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      toast.success("Run cancelled");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to cancel run");
    },
  });

  const isCompleted = run?.status === "completed";
  const isCancelled = run?.status === "cancelled";
  const isProcessing =
    run?.status === "pending" ||
    run?.status === "queued" ||
    run?.status === "running";

  const { data: evidence, isLoading: evidenceLoading } = useEvidence(
    id,
    isCompleted
  );

  const { data: competitorData, isLoading: competitorsLoading } =
    useCompetitors(id, isCompleted);

  if (isLoading) return <DetailSkeleton />;

  if (error || !run) {
    return (
      <div className="space-y-4">
        <Link
          href="/runs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to runs
        </Link>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="size-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Run not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This run may have been deleted or you don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/runs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to runs
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {run.project_name ?? `Run ${run.id.slice(0, 8)}`}
          </h1>
          <RunStatusBadge status={run.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Created {formatDistanceToNow(run.created_at)}
          {run.status === "completed" && (
            <span>
              {" "}
              &middot; {run.summary.total_queries} queries &middot;{" "}
              {run.summary.total_pages} pages &middot;{" "}
              {run.summary.total_competitors} competitors
            </span>
          )}
        </p>
      </div>

      {/* Failed state */}
      {run.status === "failed" && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Run failed</p>
            <p className="mt-1 text-destructive/80">
              {run.results_meta?.error ?? "The analysis encountered an error."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10"
            disabled={retryRun.isPending}
            onClick={() => retryRun.mutate(run.project_id)}
          >
            {retryRun.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Retry
          </Button>
        </div>
      )}

      {/* Cancelled state */}
      {isCancelled && (
        <div className="rounded-lg border border-muted bg-muted/30 p-4 text-sm flex items-start gap-2">
          <Square className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">Run cancelled</p>
            <p className="mt-1 text-muted-foreground">
              This run was stopped before it completed.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            disabled={retryRun.isPending}
            onClick={() => retryRun.mutate(run.project_id)}
          >
            {retryRun.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Restart
          </Button>
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="space-y-4">
          <RunProgressCard
            run={run}
            domain={run.project_name ?? `Run ${run.id.slice(0, 8)}`}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="text-muted-foreground"
              disabled={cancelRun.isPending}
              onClick={() => cancelRun.mutate()}
            >
              {cancelRun.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Square className="size-3.5" />
              )}
              Stop run
            </Button>
          </div>
        </div>
      )}

      {/* Score cards — show when completed */}
      {isCompleted && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ScoreCard
              title="Rankly Score"
              score={run.scores?.seenly_score_final ?? null}
              suffix="/100"
            />
            <ScoreCard
              title="AVS"
              score={run.scores?.avs_score ?? null}
              confidence={run.scores?.avs_confidence}
            />
            <ScoreCard
              title="AEO"
              score={run.scores?.aeo_score ?? null}
              confidence={run.scores?.aeo_confidence}
            />
            <ScoreCard
              title="Sentiment"
              score={run.scores?.sentiment_score ?? null}
            />
          </div>

          {/* Penalties notice */}
          {run.scores?.penalties_applied &&
            run.scores.penalties_applied.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                <span className="font-medium">Penalties applied:</span>{" "}
                {run.scores.penalties_applied
                  .map((p) =>
                    typeof p === "object" && p !== null && "description" in p
                      ? String((p as { description: string }).description)
                      : String(p)
                  )
                  .join("; ")}
                {run.scores.seenly_score_base !== null &&
                  run.scores.seenly_score_final !== null &&
                  run.scores.seenly_score_base !==
                    run.scores.seenly_score_final && (
                    <span className="ml-1">
                      (base: {Math.round(run.scores.seenly_score_base)} &rarr;
                      final: {Math.round(run.scores.seenly_score_final)})
                    </span>
                  )}
              </div>
            )}

          {/* Crawl fallback notice */}
          {run.results_meta?.crawl_status === "fallback" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary flex items-center gap-2">
              <Info className="size-3.5 shrink-0" />
              Site content couldn&apos;t be extracted (blocked or too thin).
              Queries were generated from project settings instead.
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="evidence">
            <TabsList>
              <TabsTrigger value="evidence">
                Evidence
                {evidence && evidence.ai_results.length > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    ({evidence.ai_results.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="crawl">
                Crawl
                {evidence && evidence.crawl_pages.length > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    ({evidence.crawl_pages.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="competitors">
                Competitors
                {competitorData && competitorData.length > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    ({competitorData.length})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="evidence">
              {evidenceLoading ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <EvidenceTable results={evidence?.ai_results ?? []} />
              )}
            </TabsContent>

            <TabsContent value="crawl">
              {evidenceLoading ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <CrawlTable pages={evidence?.crawl_pages ?? []} />
              )}
            </TabsContent>

            <TabsContent value="competitors">
              {competitorsLoading ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <CompetitorsTable competitors={competitorData ?? []} />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
