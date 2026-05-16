"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Filter,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchVisibility, type KeywordRow } from "@/lib/api/visibility";
import { LineChart } from "@/components/charts/line-chart";
import { HorizontalBar } from "@/components/charts/horizontal-bar";
import { Sparkline } from "@/components/charts/sparkline";
import { KpiTile } from "@/components/visibility/kpi-tile";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/visibility/section";
import { EmptyState } from "@/components/visibility/empty-state";
import { PillarSkeleton } from "@/components/visibility/pillar-skeleton";
import { cn } from "@/lib/utils";

const FEATURE_LABEL: Record<string, string> = {
  ai_overview: "AI Overview",
  featured_snippet: "Snippet",
  people_also_ask: "PAA",
  image_pack: "Images",
  video: "Video",
  knowledge_panel: "Panel",
};

const INTENT_TONE: Record<string, string> = {
  informational: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  commercial: "bg-primary/10 text-primary",
  transactional: "bg-positive/10 text-positive",
  navigational: "bg-warning/10 text-warning",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SearchVisibilityPage() {
  const { data, isLoading, error, refetch } = useSearchVisibility();
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<string>("all");
  const [position, setPosition] = useState<string>("all");
  const [sort, setSort] = useState<string>("volume");

  const filtered = useMemo<KeywordRow[]>(() => {
    if (!data) return [];
    let rows = data.keywords;
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => r.keyword.toLowerCase().includes(q));
    }
    if (intent !== "all") rows = rows.filter((r) => r.intent === intent);
    if (position !== "all") {
      rows = rows.filter((r) => {
        if (r.position == null) return position === "unranked";
        if (position === "top3") return r.position <= 3;
        if (position === "top10") return r.position <= 10;
        if (position === "top30") return r.position <= 30;
        if (position === "unranked") return false;
        return true;
      });
    }
    rows = [...rows];
    if (sort === "volume") rows.sort((a, b) => b.volume - a.volume);
    else if (sort === "position")
      rows.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    else if (sort === "gainers")
      rows.sort(
        (a, b) =>
          (b.previousPosition ?? 100) -
          (b.position ?? 100) -
          ((a.previousPosition ?? 100) - (a.position ?? 100))
      );
    else if (sort === "difficulty")
      rows.sort((a, b) => a.difficulty - b.difficulty);
    return rows;
  }, [data, query, intent, position, sort]);

  if (isLoading) return <PillarSkeleton />;

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Search Visibility"
        />
        <EmptyState
          icon={<Search className="size-5" />}
          title="Couldn't load search visibility"
          description="The latest scan didn't return. Try refreshing — most failures resolve within a few seconds."
          action={
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const { summary, trend, serpFeatures, topMovers } = data;
  const dateLabels = trend.map((t) => fmtDate(t.date));

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Search Visibility"
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
            <Button size="sm" variant="outline">
              <SlidersHorizontal className="size-3.5" />
              Configure
            </Button>
          </>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Visibility score"
          value={summary.visibility}
          decimals={1}
          delta={summary.visibilityDelta}
          deltaSuffix=" pts"
          footnote="Across tracked keywords"
        />
        <KpiTile
          label="Share of voice"
          value={summary.shareOfVoice}
          decimals={1}
          suffix="%"
          delta={summary.shareOfVoiceDelta}
          deltaSuffix=" pts"
        />
        <KpiTile
          label="Keywords tracked"
          value={summary.keywordsTracked}
          footnote={`${summary.keywordsTop3} top 3 · ${summary.keywordsTop10} top 10`}
        />
        <KpiTile
          label="SERP features owned"
          value={summary.serpFeaturesOwned}
          footnote={
            summary.cannibalized > 0
              ? `${summary.cannibalized} cannibalization signals`
              : "No cannibalization signals"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Visibility trend"
          className="lg:col-span-2"
        >
          <LineChart
            xLabels={dateLabels}
            yFormat={(v) => `${v.toFixed(0)}`}
            ariaLabel="Visibility trend"
            series={[
              {
                name: "Visibility",
                color: "var(--pillar-search)",
                data: trend.map((t) => t.visibility),
              },
              {
                name: "Share of voice",
                color: "var(--pillar-ai)",
                data: trend.map((t) => t.shareOfVoice),
              },
              {
                name: "Feature ownership %",
                color: "var(--pillar-understanding)",
                data: trend.map((t) => t.serpFeatureOwnership),
              },
            ]}
          />
        </Section>

        <Section
          title="SERP feature ownership"
        >
          <ul className="space-y-3">
            {serpFeatures.map((f) => {
              const ratio = f.total === 0 ? 0 : f.owned / f.total;
              return (
                <li key={f.feature} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {f.owned} / {f.total}
                      {f.delta !== 0 && (
                        <span
                          className={cn(
                            "ml-2 inline-flex items-center gap-0.5",
                            f.delta > 0
                              ? "text-[color:var(--positive)]"
                              : "text-[color:var(--negative)]"
                          )}
                        >
                          {f.delta > 0 ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )}
                          {Math.abs(f.delta)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${ratio * 100}%`,
                        background: "var(--pillar-search)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Top gainers">
          <MoversList rows={topMovers.gainers} variant="gain" />
        </Section>
        <Section title="Top losers">
          <MoversList rows={topMovers.losers} variant="loss" />
        </Section>
      </div>

      <Section
        title="Tracked keywords"
        description={`${filtered.length} of ${data.keywords.length} keywords`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search keywords"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 w-48 h-9 text-xs"
              />
            </div>
            <Select value={intent} onValueChange={(v) => setIntent(v ?? "all")}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <Filter className="size-3 mr-1 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All intents</SelectItem>
                <SelectItem value="informational">Informational</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="navigational">Navigational</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={position}
              onValueChange={(v) => setPosition(v ?? "all")}
            >
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All positions</SelectItem>
                <SelectItem value="top3">Top 3</SelectItem>
                <SelectItem value="top10">Top 10</SelectItem>
                <SelectItem value="top30">Top 30</SelectItem>
                <SelectItem value="unranked">Unranked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v ?? "volume")}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volume">Sort: Volume</SelectItem>
                <SelectItem value="position">Sort: Position</SelectItem>
                <SelectItem value="gainers">Sort: Gainers</SelectItem>
                <SelectItem value="difficulty">Sort: Difficulty</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        contentClassName="p-0"
      >
        {filtered.length === 0 ? (
          <div className="px-5 py-12">
            <EmptyState
              icon={<Search className="size-5" />}
              title="No keywords match"
              description="Try removing a filter or broadening the search."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setIntent("all");
                    setPosition("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                  <th className="text-left font-medium px-5 py-3">Keyword</th>
                  <th className="text-left font-medium px-3 py-3">Intent</th>
                  <th className="text-right font-medium px-3 py-3">Position</th>
                  <th className="text-right font-medium px-3 py-3">Δ 7d</th>
                  <th className="text-left font-medium px-3 py-3 hidden md:table-cell">
                    Trend
                  </th>
                  <th className="text-right font-medium px-3 py-3 hidden sm:table-cell">
                    Volume
                  </th>
                  <th className="text-right font-medium px-3 py-3 hidden md:table-cell">
                    Diff.
                  </th>
                  <th className="text-left font-medium px-3 py-3 hidden lg:table-cell">
                    SERP features
                  </th>
                  <th className="text-left font-medium px-5 py-3">URL</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k, i) => {
                  const delta =
                    k.position != null && k.previousPosition != null
                      ? Math.round((k.previousPosition - k.position) * 10) / 10
                      : null;
                  return (
                    <tr
                      key={k.id}
                      className={cn(
                        "border-b last:border-b-0 hover:bg-muted/40 transition-colors",
                        i % 2 === 1 && "bg-muted/[0.15]"
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link
                            href={`/visibility/search/keywords/${k.id}`}
                            className="truncate font-medium hover:text-primary hover:underline underline-offset-2"
                          >
                            {k.keyword}
                          </Link>
                          {k.cannibalized && (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                            >
                              cannibalized
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                            INTENT_TONE[k.intent] ??
                              "bg-muted text-muted-foreground"
                          )}
                        >
                          {k.intent}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {k.position != null ? (
                          <span className="font-semibold">{k.position}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {delta != null ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 text-xs tabular-nums",
                              delta > 0
                                ? "text-[color:var(--positive)]"
                                : delta < 0
                                  ? "text-[color:var(--negative)]"
                                  : "text-muted-foreground"
                            )}
                          >
                            {delta > 0 ? (
                              <ArrowUp className="size-3" />
                            ) : delta < 0 ? (
                              <ArrowDown className="size-3" />
                            ) : null}
                            {Math.abs(delta) || "0"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-[color:var(--pillar-search)]">
                        <Sparkline
                          data={k.history}
                          width={70}
                          height={24}
                          invert
                        />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums hidden sm:table-cell">
                        {k.volume.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right hidden md:table-cell">
                        <DifficultyChip value={k.difficulty} />
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {k.serpFeatures.slice(0, 3).map((f) => (
                            <span
                              key={f}
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border",
                                k.ownedFeatures.includes(f)
                                  ? "border-[color:var(--pillar-search)]/40 text-[color:var(--pillar-search)] bg-[color:var(--pillar-search-soft)]"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {FEATURE_LABEL[f] ?? f}
                            </span>
                          ))}
                          {k.serpFeatures.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{k.serpFeatures.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 w-full">
                        {k.url ? (
                          <a
                            href={k.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground max-w-[280px]"
                          >
                            <span className="truncate min-w-0">
                              {k.url.replace("https://", "")}
                            </span>
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Sparkles className="size-3" /> Opportunity
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="Cannibalization watch"
      >
        <HorizontalBar
          rows={data.keywords
            .filter((k) => k.cannibalized)
            .map((k) => ({
              label: k.keyword,
              value: k.volume,
              color: "var(--warning)",
              meta: `${k.volume.toLocaleString()} vol · pos ${k.position ?? "—"}`,
            }))}
        />
      </Section>
    </div>
  );
}

function MoversList({
  rows,
  variant,
}: {
  rows: KeywordRow[];
  variant: "gain" | "loss";
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No movement to report.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border/60">
      {rows.map((k, i) => {
        const delta =
          k.position != null && k.previousPosition != null
            ? Math.round((k.previousPosition - k.position) * 10) / 10
            : 0;
        const positive = delta > 0;
        return (
          <li key={k.id}>
            <Link
              href={`/visibility/search/keywords/${k.id}`}
              className={cn(
                "group flex items-center justify-between gap-4 -mx-3 px-3 py-4 rounded-lg hover:bg-muted/40 transition-colors",
                i === 0 && "pt-0",
                i === rows.length - 1 && "pb-0"
              )}
            >
              <div className="min-w-0 space-y-1">
                <p className="text-[15px] font-medium truncate group-hover:text-primary transition-colors">
                  {k.keyword}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Position {k.position ?? "—"} · {k.volume.toLocaleString()} vol/mo
                </p>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-sm font-semibold tabular-nums shrink-0",
                  variant === "gain"
                    ? "text-[color:var(--positive)]"
                    : "text-[color:var(--negative)]"
                )}
              >
                {positive ? (
                  <ArrowUp className="size-3.5" />
                ) : (
                  <ArrowDown className="size-3.5" />
                )}
                {Math.abs(delta).toFixed(1)}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function DifficultyChip({ value }: { value: number }) {
  const tone =
    value >= 60
      ? "text-[color:var(--negative)] bg-[color:var(--negative)]/10"
      : value >= 40
        ? "text-[color:var(--warning)] bg-[color:var(--warning)]/10"
        : "text-[color:var(--positive)] bg-[color:var(--positive)]/10";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[36px] px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums",
        tone
      )}
    >
      {value}
    </span>
  );
}
