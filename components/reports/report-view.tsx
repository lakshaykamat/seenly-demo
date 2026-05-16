"use client";

import { ArrowDown, ArrowUp, Minus, Sparkles, Search, Network } from "lucide-react";
import type { Report } from "@/lib/mocks/reports";
import { PILLAR_LABEL } from "@/lib/mocks/reports";
import { LineChart } from "@/components/charts/line-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

const PILLAR_COLOR: Record<Report["pillars"][number]["pillar"], string> = {
  search: "var(--pillar-search)",
  ai: "var(--pillar-ai)",
  understanding: "var(--pillar-understanding)",
};

const PILLAR_SOFT: Record<Report["pillars"][number]["pillar"], string> = {
  search: "var(--pillar-search-soft)",
  ai: "var(--pillar-ai-soft)",
  understanding: "var(--pillar-understanding-soft)",
};

const PILLAR_ICON: Record<Report["pillars"][number]["pillar"], React.ComponentType<{ className?: string }>> = {
  search: Search,
  ai: Sparkles,
  understanding: Network,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function deltaPill(delta: number, invertGood = false) {
  const positive = invertGood ? delta < 0 : delta > 0;
  const negative = invertGood ? delta > 0 : delta < 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        positive && "text-[color:var(--positive)]",
        negative && "text-[color:var(--negative)]",
        delta === 0 && "text-muted-foreground"
      )}
    >
      <Icon className="size-3" />
      {Math.abs(delta).toFixed(1)}
    </span>
  );
}

export function ReportView({ report }: { report: Report }) {
  const xLabels = report.visibilitySeries.map((p) =>
    new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  );

  return (
    <div className="space-y-10">
      {/* Cover */}
      <header className="rounded-2xl bg-gradient-to-br from-card to-muted/40 ring-1 ring-border p-8 sm:p-10">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Executive report
        </p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight">
          {report.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          {report.subtitle}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>Generated {formatDate(report.generatedAt)}</span>
          <span>{report.pages} pages</span>
          <span>{report.recipients.length} recipients</span>
        </div>
      </header>

      {/* KPIs */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight mb-3">Headline metrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {report.kpis.map((kpi) => {
            const invertGood = kpi.unit === "count" && kpi.label.toLowerCase().includes("rank");
            return (
              <div
                key={kpi.label}
                className="rounded-xl bg-card ring-1 ring-border p-4"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {kpi.label}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">
                    {kpi.value.toFixed(1)}
                    {kpi.unit === "%" && "%"}
                  </span>
                  {deltaPill(kpi.delta, invertGood)}
                </div>
                <div className="mt-2 text-muted-foreground">
                  <Sparkline data={kpi.trend} width={140} height={32} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trend */}
      <section className="rounded-xl bg-card ring-1 ring-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Visibility trend</h2>
            <p className="text-xs text-muted-foreground">
              Daily visibility score across the period.
            </p>
          </div>
        </div>
        <LineChart
          series={[
            {
              name: "Visibility",
              color: "var(--pillar-search)",
              data: report.visibilitySeries.map((p) => p.value),
            },
          ]}
          xLabels={xLabels}
          height={220}
          yFormat={(v) => v.toFixed(0)}
        />
      </section>

      {/* Pillar breakdown */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Pillar breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {report.pillars.map((p) => {
            const Icon = PILLAR_ICON[p.pillar];
            return (
              <div
                key={p.pillar}
                className="rounded-xl bg-card ring-1 ring-border p-5 flex flex-col gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: PILLAR_COLOR[p.pillar] }}
                    >
                      {PILLAR_LABEL[p.pillar]}
                    </p>
                    <div
                      className="size-7 rounded-md grid place-items-center shrink-0"
                      style={{
                        background: PILLAR_SOFT[p.pillar],
                        color: PILLAR_COLOR[p.pillar],
                      }}
                    >
                      <Icon className="size-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tabular-nums leading-none">
                      {p.score.toFixed(1)}
                    </span>
                    {deltaPill(p.delta)}
                  </div>
                </div>
                {(p.highlights.length > 0 || p.risks.length > 0) && (
                  <div className="space-y-3 border-t border-border/60 pt-4">
                    {p.highlights.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--positive)] mb-1.5">
                          Highlights
                        </p>
                        <ul className="space-y-1">
                          {p.highlights.map((h) => (
                            <li
                              key={h}
                              className="text-xs text-muted-foreground leading-relaxed"
                            >
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {p.risks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--negative)] mb-1.5">
                          Risks
                        </p>
                        <ul className="space-y-1">
                          {p.risks.map((r) => (
                            <li
                              key={r}
                              className="text-xs text-muted-foreground leading-relaxed"
                            >
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Citation share */}
      <section className="rounded-xl bg-card ring-1 ring-border p-5">
        <h2 className="text-sm font-semibold tracking-tight mb-1">Citation share by engine</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Percentage of monitored prompts where the brand was cited, by AI engine.
        </p>
        <div className="space-y-3">
          {report.citationShare.map((c) => {
            const pct = Math.max(0, Math.min(100, c.share));
            return (
              <div key={c.model} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium">{c.model}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-24 text-right text-sm tabular-nums">
                  {c.share.toFixed(1)}%
                </div>
                <div className="w-12 text-right">{deltaPill(c.delta)}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Narrative */}
      <section className="rounded-xl bg-card ring-1 ring-border p-5">
        <h2 className="text-sm font-semibold tracking-tight mb-2">Executive summary</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {report.narrative.summary}
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: "Top wins", items: report.narrative.wins, color: "var(--positive)" },
          { title: "Top risks", items: report.narrative.risks, color: "var(--negative)" },
          { title: "Recommended focus", items: report.narrative.focus, color: "var(--primary)" },
        ].map((block) => (
          <div key={block.title} className="rounded-xl bg-card ring-1 ring-border p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: block.color }}>
              {block.title}
            </p>
            <ul className="space-y-3">
              {block.items.map((it) => (
                <li key={it.title}>
                  <p className="text-sm font-medium leading-tight">{it.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{it.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
