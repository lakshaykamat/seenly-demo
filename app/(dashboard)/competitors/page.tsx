"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Crosshair,
  ExternalLink,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useAddToWatchlist,
  useCompetitorRadar,
  useRemoveFromWatchlist,
  useToggleWatchlistAlert,
  useWatchlist,
} from "@/lib/api/competitors";
import { LineChart } from "@/components/charts/line-chart";
import { KpiTile } from "@/components/visibility/kpi-tile";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/visibility/section";
import { EmptyState } from "@/components/visibility/empty-state";
import { PillarSkeleton } from "@/components/visibility/pillar-skeleton";
import { cn } from "@/lib/utils";
import type { CompetitorScores } from "@/lib/api/competitors";

const TARGET_DOMAIN = "octify.ai";
const TARGET_LABEL = "Octify AI";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CompetitorsPage() {
  const { data, isLoading, error, refetch } = useCompetitorRadar();
  const { data: watchlist } = useWatchlist();
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();
  const toggle = useToggleWatchlistAlert();
  const [newDomain, setNewDomain] = useState("");
  const [selected, setSelected] = useState<string[]>([
    "datadog.com",
    "newrelic.com",
    "honeycomb.io",
  ]);

  const allCompetitors = useMemo(() => data?.scores ?? [], [data]);
  const us = useMemo(
    () => allCompetitors.find((c) => c.domain === TARGET_DOMAIN),
    [allCompetitors]
  );
  const visible = useMemo(
    () =>
      allCompetitors.filter(
        (c) => c.domain !== TARGET_DOMAIN && selected.includes(c.domain)
      ),
    [allCompetitors, selected]
  );

  if (isLoading) return <PillarSkeleton />;
  if (error || !data || !us) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Competitors Radar"
        />
        <EmptyState
          icon={<Crosshair className="size-5" />}
          title="Couldn't load competitor data"
          description="The latest competitor scan didn't return. Most failures clear in a few seconds."
          action={
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const competitorAverage = (key: keyof CompetitorScores) => {
    const values = allCompetitors
      .filter((c) => c.domain !== TARGET_DOMAIN)
      .map((c) => Number(c[key]) || 0);
    if (values.length === 0) return 0;
    return (
      Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
    );
  };

  const trackedDomains = [TARGET_DOMAIN, ...visible.map((c) => c.domain)];
  const colors: Record<string, string> = {
    "octify.ai": "var(--pillar-ai)",
    "datadog.com": "var(--pillar-search)",
    "newrelic.com": "var(--pillar-understanding)",
    "honeycomb.io": "var(--warning)",
    "grafana.com": "var(--negative)",
  };
  const dateLabels = data.mentionTimeline.map((t) => fmtDate(t.date));

  function toggleSelected(domain: string) {
    setSelected((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  }

  async function onAddWatchlist() {
    const raw = newDomain.trim().toLowerCase();
    if (!raw) return;
    const cleaned = raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const name = cleaned.split(".")[0];
    try {
      await add.mutateAsync({
        domain: cleaned,
        name: name.charAt(0).toUpperCase() + name.slice(1),
      });
      toast.success(`${cleaned} added to watchlist`);
      setNewDomain("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add competitor");
    }
  }

  async function onRemoveWatchlist(id: string, domain: string) {
    try {
      await remove.mutateAsync(id);
      toast.success(`${domain} removed from watchlist`);
    } catch {
      toast.error("Couldn't remove. Please try again.");
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Competitors Radar"
        actions={
          <Button size="sm" variant="outline">
            <Plus className="size-3.5" />
            Add competitor
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Overall lead"
          value={us.overall - competitorAverage("overall")}
          decimals={1}
          delta={us.delta}
          deltaSuffix=" pts"
          footnote="vs. competitor average"
        />
        <KpiTile
          label="Citation share"
          value={us.citationShare}
          decimals={1}
          suffix="%"
          footnote={`Leader: ${highestCompetitor(allCompetitors, "citationShare").name} ${highestCompetitor(allCompetitors, "citationShare").value.toFixed(1)}%`}
        />
        <KpiTile
          label="Top-3 keywords"
          value={us.topThree}
          footnote={`of ${us.trackedKeywords} · ${competitorTopThreeGap(allCompetitors)} gap`}
        />
        <KpiTile
          label="AI Understanding"
          value={us.aiUnderstanding}
          decimals={1}
          footnote={`Avg. competitor ${competitorAverage("aiUnderstanding")}`}
        />
      </div>

      <Section
        title="Pillar comparison"
        actions={
          <div className="flex flex-wrap gap-1.5">
            {allCompetitors
              .filter((c) => c.domain !== TARGET_DOMAIN)
              .map((c) => {
                const active = selected.includes(c.domain);
                return (
                  <button
                    key={c.domain}
                    onClick={() => toggleSelected(c.domain)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: colors[c.domain] ?? "currentColor" }}
                    />
                    {c.name}
                  </button>
                );
              })}
          </div>
        }
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                <th className="text-left font-medium px-5 py-3">Competitor</th>
                <th className="text-right font-medium px-3 py-3">Search</th>
                <th className="text-right font-medium px-3 py-3">AI Rec.</th>
                <th className="text-right font-medium px-3 py-3">
                  AI Underst.
                </th>
                <th className="text-right font-medium px-3 py-3">Overall</th>
                <th className="text-right font-medium px-3 py-3">Δ 30d</th>
                <th className="text-right font-medium px-5 py-3 hidden md:table-cell">
                  Citations
                </th>
              </tr>
            </thead>
            <tbody>
              <RadarRow row={us} isTarget />
              {visible.map((c) => (
                <RadarRow key={c.domain} row={c} compareTo={us} />
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Mention timeline"
          className="lg:col-span-2"
        >
          <LineChart
            xLabels={dateLabels}
            yFormat={(v) => `${v.toFixed(0)}`}
            ariaLabel="Mention timeline"
            series={trackedDomains.map((d) => ({
              name: d === TARGET_DOMAIN ? TARGET_LABEL : d,
              color: colors[d] ?? "var(--muted-foreground)",
              data: data.mentionTimeline.map((t) => t.values[d] ?? 0),
            }))}
          />
        </Section>

        <Section
          title="Where they beat us"
        >
          <ul className="space-y-3">
            {data.gaps.map((g, i) => {
              const negative = g.gap < 0;
              return (
                <li
                  key={i}
                  className={cn(
                    "rounded-lg border p-3 space-y-1.5",
                    negative
                      ? "border-[color:var(--negative)]/30 bg-[color:var(--negative)]/[0.04]"
                      : "border-[color:var(--positive)]/30 bg-[color:var(--positive)]/[0.04]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold truncate">
                        {g.competitor}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {g.metric}
                      </Badge>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums shrink-0",
                        negative
                          ? "text-[color:var(--negative)]"
                          : "text-[color:var(--positive)]"
                      )}
                    >
                      {g.gap > 0 ? "+" : ""}
                      {g.gap}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {g.recommendation}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    Us {g.ours} · Them {g.theirs}
                  </p>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      <Section
        title="Citation overlap"
      >
        {(() => {
          const rows = visible.map((c) => {
            const overlap = Math.max(
              0,
              Math.round(us.citationShare * 0.34 - c.ourGap * 0.6)
            );
            const usOnly = Math.max(0, Math.round(us.citationShare * 0.66));
            const themOnly = Math.max(0, Math.round(c.citationShare * 0.7));
            return {
              name: c.name,
              domain: c.domain,
              usOnly,
              overlap,
              themOnly,
            };
          });
          if (rows.length === 0) {
            return (
              <p className="text-sm text-muted-foreground text-center py-6">
                Select at least one competitor to compare.
              </p>
            );
          }
          return (
            <ul className="space-y-4">
              {rows.map((r) => {
                const total = r.usOnly + r.overlap + r.themOnly || 1;
                return (
                  <li key={r.domain} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        Us-only {r.usOnly} · Co-cited {r.overlap} · Them-only{" "}
                        {r.themOnly}
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      <div
                        className="h-full transition-[width] duration-700"
                        style={{
                          width: `${(r.usOnly / total) * 100}%`,
                          background: "var(--pillar-ai)",
                        }}
                      />
                      <div
                        className="h-full transition-[width] duration-700"
                        style={{
                          width: `${(r.overlap / total) * 100}%`,
                          background: "var(--warning)",
                          opacity: 0.75,
                        }}
                      />
                      <div
                        className="h-full transition-[width] duration-700"
                        style={{
                          width: `${(r.themOnly / total) * 100}%`,
                          background: "var(--muted-foreground)",
                          opacity: 0.5,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        })()}
      </Section>

      <Section
        title="Competitor watchlist"
        actions={
          <div className="flex items-center gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="domain.com"
              className="w-44 h-9 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddWatchlist();
              }}
            />
            <Button
              size="sm"
              onClick={onAddWatchlist}
              disabled={add.isPending || !newDomain.trim()}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        }
      >
        {(watchlist?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Crosshair className="size-5" />}
            title="No competitors pinned"
            description="Add a domain to watch and receive alerts when their citation share or rank shifts."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {(watchlist ?? []).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {w.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <ExternalLink className="size-3" />
                      {w.domain}
                    </span>
                  </div>
                  {w.notes && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {w.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => toggle.mutate(w.id)}
                    title={w.alertOnDrop ? "Alerts on" : "Alerts off"}
                  >
                    {w.alertOnDrop ? (
                      <Bell className="size-3.5 text-[color:var(--pillar-ai)]" />
                    ) : (
                      <BellOff className="size-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-muted-foreground hover:text-[color:var(--negative)]"
                    onClick={() => onRemoveWatchlist(w.id, w.domain)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function RadarRow({
  row,
  isTarget = false,
  compareTo,
}: {
  row: CompetitorScores;
  isTarget?: boolean;
  compareTo?: CompetitorScores;
}) {
  return (
    <tr
      className={cn(
        "border-b last:border-b-0 transition-colors",
        isTarget ? "bg-[color:var(--pillar-ai-soft)]/40" : "hover:bg-muted/40"
      )}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          {isTarget && (
            <span className="inline-flex items-center justify-center size-5 rounded bg-[color:var(--pillar-ai)] text-white text-[10px] font-semibold">
              You
            </span>
          )}
          <div>
            <p className="font-medium text-sm">{row.name}</p>
            <p className="text-[11px] text-muted-foreground">{row.domain}</p>
          </div>
        </div>
      </td>
      <ScoreCell
        value={row.searchVisibility}
        compare={compareTo?.searchVisibility}
      />
      <ScoreCell
        value={row.aiRecommendation}
        compare={compareTo?.aiRecommendation}
      />
      <ScoreCell
        value={row.aiUnderstanding}
        compare={compareTo?.aiUnderstanding}
      />
      <ScoreCell value={row.overall} compare={compareTo?.overall} bold />
      <td className="px-3 py-3.5 text-right">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
            row.delta > 0
              ? "text-[color:var(--positive)]"
              : row.delta < 0
                ? "text-[color:var(--negative)]"
                : "text-muted-foreground"
          )}
        >
          {row.delta > 0 ? (
            <TrendingUp className="size-3" />
          ) : row.delta < 0 ? (
            <TrendingDown className="size-3" />
          ) : null}
          {row.delta > 0 ? "+" : ""}
          {row.delta.toFixed(1)}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right tabular-nums hidden md:table-cell">
        <span className="text-sm font-medium">{row.citationShare}%</span>
      </td>
    </tr>
  );
}

function ScoreCell({
  value,
  compare,
  bold,
}: {
  value: number;
  compare?: number;
  bold?: boolean;
}) {
  const beats = compare != null && value > compare;
  return (
    <td className="px-3 py-3.5 text-right tabular-nums">
      <span className={cn("text-sm", bold ? "font-semibold" : "font-medium")}>
        {value.toFixed(1)}
      </span>
      {beats && (
        <span className="ml-1.5 inline-flex items-center px-1 rounded text-[9px] font-semibold bg-[color:var(--negative)]/10 text-[color:var(--negative)]">
          BEATS US
        </span>
      )}
    </td>
  );
}

function highestCompetitor(
  scores: CompetitorScores[],
  key: keyof CompetitorScores
): { name: string; value: number } {
  const competitors = scores.filter((s) => s.domain !== TARGET_DOMAIN);
  if (competitors.length === 0) return { name: "—", value: 0 };
  const top = competitors.reduce((acc, c) =>
    (Number(c[key]) || 0) > (Number(acc[key]) || 0) ? c : acc
  );
  return { name: top.name, value: Number(top[key]) || 0 };
}

function competitorTopThreeGap(scores: CompetitorScores[]): string {
  const us = scores.find((s) => s.domain === TARGET_DOMAIN);
  if (!us) return "—";
  const top = scores
    .filter((s) => s.domain !== TARGET_DOMAIN)
    .reduce((acc, c) => (c.topThree > acc.topThree ? c : acc));
  const gap = us.topThree - top.topThree;
  return gap === 0 ? "even" : gap > 0 ? `+${gap}` : `${gap}`;
}
