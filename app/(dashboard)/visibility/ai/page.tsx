"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Crown,
  Filter,
  MessageSquare,
  MinusCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAiRecommendation } from "@/lib/api/visibility";
import { LineChart } from "@/components/charts/line-chart";
import { Donut } from "@/components/charts/donut";
import { Matrix } from "@/components/charts/matrix";
import { KpiTile } from "@/components/visibility/kpi-tile";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/visibility/section";
import { EmptyState } from "@/components/visibility/empty-state";
import { PillarSkeleton } from "@/components/visibility/pillar-skeleton";
import { ModelMark } from "@/components/icons/model-logos";
import { cn } from "@/lib/utils";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const SENTIMENT_COLORS = {
  favorable: "var(--positive)",
  neutral: "var(--pillar-ai)",
  cautious: "var(--warning)",
  unfavorable: "var(--negative)",
};

const SET_COLORS: Record<string, string> = {
  Discovery: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Comparison: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  Educational: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Bottom-funnel": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const MODEL_BUBBLE: Record<string, string> = {
  chatgpt: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  claude: "bg-orange-500/10 text-orange-900 dark:text-orange-100",
  gemini: "bg-blue-500/10 text-blue-900 dark:text-blue-100",
  perplexity: "bg-teal-500/10 text-teal-900 dark:text-teal-100",
  default: "bg-muted text-foreground",
};

export default function AiRecommendationPage() {
  const { data, isLoading, error, refetch } = useAiRecommendation();
  const [setFilter, setSetFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");

  const filteredPrompts = useMemo(() => {
    if (!data) return [];
    let prompts = data.prompts;
    if (setFilter !== "all")
      prompts = prompts.filter((p) => p.set === setFilter);
    return prompts;
  }, [data, setFilter]);

  const matrixData = useMemo(() => {
    if (!data) return null;
    const models =
      modelFilter === "all"
        ? data.models
        : data.models.filter((m) => m.id === modelFilter);
    return {
      columns: models.map((m) => m.label),
      rows: filteredPrompts.map((p) => ({
        label: p.text,
        sublabel: p.set,
        cells: models.map((m) => {
          const c = data.citations.find(
            (x) => x.promptId === p.id && x.model === m.id
          );
          return {
            value: c?.cited ? (c.position ?? 0) : null,
            label: c?.snippet ?? undefined,
            tone: c?.cited ? ("neutral" as const) : ("muted" as const),
            href: `/visibility/ai/prompts/${p.id}?model=${m.id}`,
          };
        }),
      })),
    };
  }, [data, filteredPrompts, modelFilter]);

  if (isLoading) return <PillarSkeleton />;
  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI Recommendation"
        />
        <EmptyState
          icon={<Sparkles className="size-5" />}
          title="Couldn't load AI recommendation"
          description="The citation crawl couldn't return results just now. Try again."
          action={
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const { summary, trend, sentiment, headToHead, models } = data;
  const sentimentTotal =
    sentiment.favorable +
    sentiment.neutral +
    sentiment.cautious +
    sentiment.unfavorable;
  const dateLabels = trend.map((t) => fmtDate(t.date));

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="AI Recommendation"
        actions={
          <>
            <Select defaultValue="30d">
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm">
              <MessageSquare className="size-3.5" />
              Open sandbox
            </Button>
          </>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Citation share"
          value={summary.citationShare}
          decimals={1}
          suffix="%"
          delta={summary.citationShareDelta}
          deltaSuffix=" pts"
          footnote="Weighted across 4 monitored engines"
        />
        <KpiTile
          label="Prompt coverage"
          value={summary.promptsCovered}
          footnote={`of ${summary.promptsTotal} monitored prompts${
            summary.uncited > 0 ? ` · ${summary.uncited} uncited` : ""
          }`}
        />
        <KpiTile
          label="First-mention rate"
          value={summary.firstMentionRate}
          decimals={1}
          suffix="%"
          footnote="Cited first in answer"
        />
        <KpiTile
          label="Favorable sentiment"
          value={summary.favorableRate}
          decimals={1}
          suffix="%"
          footnote="Of all classified mentions"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Citation share by engine"
          className="lg:col-span-2"
        >
          <LineChart
            xLabels={dateLabels}
            yFormat={(v) => `${v.toFixed(0)}%`}
            ariaLabel="Citation share trend"
            series={[
              {
                name: "ChatGPT",
                color: "var(--pillar-ai)",
                data: trend.map((t) => t.gpt),
              },
              {
                name: "Claude",
                color: "var(--pillar-search)",
                data: trend.map((t) => t.claude),
              },
              {
                name: "Gemini",
                color: "var(--pillar-understanding)",
                data: trend.map((t) => t.gemini),
              },
              {
                name: "Perplexity",
                color: "var(--warning)",
                data: trend.map((t) => t.perplexity),
              },
            ]}
          />
        </Section>

        <Section title="Sentiment" description="Across cited mentions only">
          <Donut
            size={160}
            centerValue={`${Math.round((sentiment.favorable / sentimentTotal) * 100)}%`}
            centerLabel="Favorable"
            segments={[
              {
                label: "Favorable",
                value: sentiment.favorable,
                color: SENTIMENT_COLORS.favorable,
              },
              {
                label: "Neutral",
                value: sentiment.neutral,
                color: SENTIMENT_COLORS.neutral,
              },
              {
                label: "Cautious",
                value: sentiment.cautious,
                color: SENTIMENT_COLORS.cautious,
              },
              {
                label: "Unfavorable",
                value: sentiment.unfavorable,
                color: SENTIMENT_COLORS.unfavorable,
              },
            ]}
          />
        </Section>
      </div>

      <Section
        title="Prompt × model coverage"
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={setFilter}
              onValueChange={(v) => setSetFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <Filter className="size-3 mr-1 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All prompt sets</SelectItem>
                <SelectItem value="Discovery">Discovery</SelectItem>
                <SelectItem value="Comparison">Comparison</SelectItem>
                <SelectItem value="Educational">Educational</SelectItem>
                <SelectItem value="Bottom-funnel">Bottom-funnel</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={modelFilter}
              onValueChange={(v) => setModelFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All engines</SelectItem>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {matrixData && matrixData.rows.length > 0 ? (
          <Matrix
            columns={matrixData.columns}
            rows={matrixData.rows}
            cellSize={72}
            rowLabelWidth={340}
            format={(v) => (v === 0 ? "—" : `#${v}`)}
            colorScale={(v) => {
              if (v === 0) return "var(--muted)";
              const t = 1 - Math.min(1, (v - 1) / 4);
              const alpha = 0.18 + t * 0.72;
              return `color-mix(in oklch, var(--pillar-ai) ${alpha * 100}%, transparent)`;
            }}
          />
        ) : (
          <EmptyState
            icon={<Sparkles className="size-5" />}
            title="No prompts in this filter"
            description="Adjust the filter or add prompts to the monitored set to see coverage."
          />
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Head-to-head citations"
        >
          <ul className="space-y-3">
            {headToHead.map((h) => {
              const total = h.ourCitations + h.theirCitations || 1;
              const winning = h.winRate >= 50;
              return (
                <li key={h.domain} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{h.domain}</span>
                      {h.bothCited > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {h.bothCited} co-cited
                        </Badge>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        winning
                          ? "text-[color:var(--positive)]"
                          : "text-[color:var(--negative)]"
                      )}
                    >
                      {h.winRate}% win
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full transition-[width] duration-700"
                      style={{
                        width: `${(h.ourCitations / total) * 100}%`,
                        background: "var(--pillar-ai)",
                      }}
                    />
                    <div
                      className="h-full transition-[width] duration-700"
                      style={{
                        width: `${(h.theirCitations / total) * 100}%`,
                        background: "var(--muted-foreground)",
                        opacity: 0.5,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>You · {h.ourCitations}</span>
                    <span>
                      {h.domain} · {h.theirCitations}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section
          title="Engine coverage breakdown"
        >
          <ul className="space-y-3">
            {models.map((m) => {
              const cited = data.citations.filter(
                (c) => c.model === m.id && c.cited
              ).length;
              const total = data.citations.filter(
                (c) => c.model === m.id
              ).length;
              const rate = total === 0 ? 0 : Math.round((cited / total) * 100);
              return (
                <li key={m.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {m.vendor}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {cited} / {total} · {rate}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${rate}%`,
                        background: "var(--pillar-ai)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      <Section title="Latest cited mentions">
        <ul className="divide-y divide-border/60">
          {data.citations
            .filter((c) => c.cited && c.snippet)
            .slice(0, 4)
            .map((c, i) => {
              const prompt = data.prompts.find((p) => p.id === c.promptId);
              const model = models.find((m) => m.id === c.model);
              const tint =
                MODEL_BUBBLE[c.model.toLowerCase()] ?? MODEL_BUBBLE.default;
              return (
                <li
                  key={`${c.promptId}-${c.model}-${i}`}
                  className="group -mx-5 px-5 py-6 first:pt-0 last:pb-0 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0 text-sm">
                      <span className="font-semibold">{model?.label}</span>
                      {prompt && (
                        <>
                          <span
                            aria-hidden
                            className="size-1 rounded-full bg-muted-foreground/40"
                          />
                          <span className="text-muted-foreground">
                            {prompt.set}
                          </span>
                        </>
                      )}
                      {c.isFirstMention && (
                        <>
                          <span
                            aria-hidden
                            className="size-1 rounded-full bg-muted-foreground/40"
                          />
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--warning)]">
                            <Crown className="size-3" />
                            first mention
                          </span>
                        </>
                      )}
                    </div>
                    {c.position != null && (
                      <span className="text-xl font-semibold tabular-nums text-muted-foreground/40 leading-none shrink-0">
                        #{c.position}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <div
                      aria-hidden
                      className={cn(
                        "shrink-0 size-7 rounded-full grid place-items-center ring-1 ring-border/60",
                        tint
                      )}
                    >
                      <ModelMark model={c.model} className="size-3.5" />
                    </div>
                    <div
                      className={cn(
                        "max-w-[640px] rounded-2xl rounded-tl-md px-4 py-3 text-[15px] leading-relaxed",
                        tint
                      )}
                    >
                      {c.snippet}
                    </div>
                  </div>
                  <div className="mt-3 ml-10 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                    {prompt ? (
                      <p className="truncate">
                        on{" "}
                        <span className="text-foreground/80">
                          {prompt.text}
                        </span>
                      </p>
                    ) : (
                      <span />
                    )}
                    <SentimentChip sentiment={c.sentiment} />
                  </div>
                </li>
              );
            })}
        </ul>
      </Section>
    </div>
  );
}

function SentimentChip({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const map = {
    favorable: {
      icon: CheckCircle2,
      color: "var(--positive)",
      label: "favorable",
    },
    neutral: {
      icon: MinusCircle,
      color: "var(--muted-foreground)",
      label: "neutral",
    },
    cautious: { icon: MinusCircle, color: "var(--warning)", label: "cautious" },
    unfavorable: {
      icon: XCircle,
      color: "var(--negative)",
      label: "unfavorable",
    },
  } as const;
  const c = map[sentiment as keyof typeof map];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium"
      style={{ color: c.color }}
    >
      <Icon className="size-3" />
      {c.label}
    </span>
  );
}
