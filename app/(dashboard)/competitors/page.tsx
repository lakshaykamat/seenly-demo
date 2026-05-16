"use client";

import { useEffect, useMemo, useState } from "react";
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
import COMPANY from "@/lib/mocks/data/company.json";

const TARGET_DOMAIN = COMPANY.brand.domain;
const TARGET_LABEL = COMPANY.brand.fullName;

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
  const [selected, setSelected] = useState<string[]>([]);

  const allCompetitors = useMemo(() => data?.scores ?? [], [data]);

  useEffect(() => {
    if (selected.length === 0 && allCompetitors.length > 0) {
      setSelected(
        allCompetitors
          .filter((c) => c.domain !== TARGET_DOMAIN)
          .slice(0, 3)
          .map((c) => c.domain)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCompetitors]);
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
  const palette = [
    "var(--pillar-search)",
    "var(--pillar-understanding)",
    "var(--warning)",
    "var(--negative)",
    "var(--chart-2)",
    "var(--chart-5)",
  ];
  const colors: Record<string, string> = {
    [TARGET_DOMAIN]: "var(--primary)",
    ...Object.fromEntries(
      allCompetitors
        .filter((c) => c.domain !== TARGET_DOMAIN)
        .map((c, i) => [c.domain, palette[i % palette.length]])
    ),
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
          <div className="flex flex-wrap gap-1">
            {allCompetitors
              .filter((c) => c.domain !== TARGET_DOMAIN)
              .map((c) => {
                const active = selected.includes(c.domain);
                return (
                  <button
                    key={c.domain}
                    onClick={() => toggleSelected(c.domain)}
                    aria-pressed={active}
                    className={cn(
                      "group inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-all",
                      active
                        ? "bg-card text-foreground ring-1 ring-inset ring-border shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                        : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full transition-opacity",
                        active ? "opacity-100" : "opacity-40 group-hover:opacity-80"
                      )}
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
              <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 border-b border-border/50">
                <th className="text-left font-medium px-6 py-3">Competitor</th>
                <th className="text-right font-medium px-3 py-3">Search</th>
                <th className="text-right font-medium px-3 py-3">AI Rec.</th>
                <th className="text-right font-medium px-3 py-3">
                  AI Underst.
                </th>
                <th className="text-right font-medium px-3 py-3">Overall</th>
                <th className="text-right font-medium px-3 py-3">Δ 30d</th>
                <th className="text-right font-medium px-6 py-3 hidden md:table-cell">
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
                          background: "var(--primary)",
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
                      <Bell className="size-3.5 text-primary" />
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
        "border-b border-border/40 last:border-b-0 transition-colors group",
        isTarget ? "bg-primary/[0.04]" : "hover:bg-muted/30"
      )}
    >
      <td className="px-6 py-4 relative">
        {isTarget && (
          <span
            aria-hidden
            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
            style={{ background: "var(--primary)" }}
          />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate text-foreground">
              {row.name}
            </p>
            {isTarget && (
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] bg-primary/10 text-primary"
              >
                You
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {row.domain}
          </p>
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
      <td className="px-3 py-4 text-right">
        <span
          className={cn(
            "inline-flex items-center justify-end gap-0.5 text-xs font-medium tabular-nums",
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
      <td className="px-6 py-4 text-right hidden md:table-cell">
        <div className="inline-flex flex-col items-end gap-1">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {row.citationShare}%
          </span>
          <span
            aria-hidden
            className="block h-1 w-16 rounded-full bg-muted overflow-hidden"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.min(100, (row.citationShare / 30) * 100)}%`,
                background: isTarget
                  ? "var(--primary)"
                  : "var(--muted-foreground)",
                opacity: isTarget ? 1 : 0.45,
              }}
            />
          </span>
        </div>
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
  const diff = compare != null ? value - compare : null;
  const beats = diff != null && diff > 0.05;
  return (
    <td className="px-3 py-4 text-right tabular-nums">
      <div className="inline-flex flex-col items-end leading-tight">
        <span
          className={cn(
            "text-sm text-foreground",
            bold ? "font-semibold" : "font-medium"
          )}
        >
          {value.toFixed(1)}
        </span>
        {beats && (
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums text-[color:var(--negative)]/85">
            <TrendingUp className="size-2.5" />+{diff!.toFixed(1)}
          </span>
        )}
      </div>
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
