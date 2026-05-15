"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Code2,
  ExternalLink,
  FileSearch,
  Filter,
  Info,
  Network,
  ShieldAlert,
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
import { useAiUnderstanding, type PageAuditRow } from "@/lib/api/visibility";
import { KpiTile } from "@/components/visibility/kpi-tile";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/visibility/section";
import { EmptyState } from "@/components/visibility/empty-state";
import { PillarSkeleton } from "@/components/visibility/pillar-skeleton";
import { cn } from "@/lib/utils";

const SEVERITY = {
  ok: {
    color: "var(--positive)",
    bg: "bg-[color:var(--positive)]/10",
    label: "OK",
  },
  info: {
    color: "var(--pillar-search)",
    bg: "bg-[color:var(--pillar-search-soft)]",
    label: "Info",
  },
  warning: {
    color: "var(--warning)",
    bg: "bg-[color:var(--warning)]/10",
    label: "Warning",
  },
  critical: {
    color: "var(--negative)",
    bg: "bg-[color:var(--negative)]/10",
    label: "Critical",
  },
} as const;

const ACCESS_COLOR = {
  allowed: "var(--positive)",
  partial: "var(--warning)",
  blocked: "var(--negative)",
};

export default function AiUnderstandingPage() {
  const { data, isLoading, error, refetch } = useAiUnderstanding();
  const [selected, setSelected] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    let pages = data.pages;
    if (typeFilter !== "all")
      pages = pages.filter((p) => p.pageType === typeFilter);
    if (severityFilter !== "all") {
      pages = pages.filter((p) =>
        p.findings.some((f) => f.severity === severityFilter)
      );
    }
    return pages;
  }, [data, typeFilter, severityFilter]);

  const selectedPage = useMemo(
    () => data?.pages.find((p) => p.id === selected) ?? null,
    [data, selected]
  );

  if (isLoading) return <PillarSkeleton />;
  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI Understanding"
        />
        <EmptyState
          icon={<Network className="size-5" />}
          title="Couldn't load audit"
          description="The structure audit did not return. Try refreshing."
          action={
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const { summary, crawlerMatrix, distribution, entities } = data;
  const maxDist = Math.max(...distribution.map((d) => d.count), 1);
  const totalPages = summary.pagesAuditing;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="AI Understanding"
        actions={
          <Button size="sm">
            <FileSearch className="size-3.5" />
            Run new audit
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Schema coverage"
          value={summary.averageSchemaCoverage}
          suffix="%"
          footnote={`Average across ${summary.pagesAuditing} audited pages`}
        />
        <KpiTile
          label="Semantic clarity"
          value={summary.averageSemanticClarity}
          suffix="%"
          footnote="Heading hierarchy and topical focus"
        />
        <KpiTile
          label="Entity recognition"
          value={summary.averageEntityScore}
          suffix="%"
          footnote={`${entities.length} entities consistently extracted`}
        />
        <KpiTile
          label="Critical findings"
          value={summary.pagesWithCriticalFindings}
          invertDelta
          footnote={
            summary.pagesWithCriticalFindings === 0
              ? "All clear"
              : `${summary.pagesWithCriticalFindings} of ${summary.pagesAuditing} pages need attention`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Schema coverage distribution"
          className="lg:col-span-2"
        >
          <div className="flex h-full min-h-[200px] items-stretch gap-4">
            {distribution.map((d) => {
              const h = (d.count / maxDist) * 100;
              const isHigh = parseInt(d.range.split("-")[0]) >= 75;
              const isLow = parseInt(d.range.split("-")[0]) < 60;
              return (
                <div
                  key={d.range}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="text-xs font-semibold tabular-nums">
                    {d.count}
                  </div>
                  <div className="w-full flex-1 flex flex-col-reverse">
                    <div
                      className="w-full rounded-t-md transition-[height] duration-700"
                      style={{
                        height: `${h}%`,
                        background: isHigh
                          ? "var(--pillar-understanding)"
                          : isLow
                            ? "var(--negative)"
                            : "var(--warning)",
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {d.range}%
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          title="Posture"
        >
          <ul className="space-y-3">
            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[color:var(--positive)]" />
                <span className="text-sm font-medium">llms.txt</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {summary.llmsTxtPresent ? "Detected" : "Missing"}
              </Badge>
            </li>
            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-[color:var(--warning)]" />
                <span className="text-sm font-medium">robots.txt</span>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">
                {summary.robotsTxtHealth}
              </Badge>
            </li>
            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-[color:var(--negative)]" />
                <span className="text-sm font-medium">Overblocked paths</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                2 paths
              </span>
            </li>
            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[color:var(--pillar-understanding)]" />
                <span className="text-sm font-medium">Entity consistency</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {summary.averageEntityScore}%
              </span>
            </li>
          </ul>
        </Section>
      </div>

      <Section
        title="AI crawler access"
      >
        <ul className="space-y-2.5">
          {crawlerMatrix.map((c) => {
            const total = c.allowed + c.partial + c.blocked;
            return (
              <li key={c.crawler} className="flex items-center gap-4">
                <div className="w-36 shrink-0">
                  <p className="text-sm font-medium">{c.crawler}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {total} pages
                  </p>
                </div>
                <div className="flex-1 flex h-3 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full transition-[width] duration-700"
                    style={{
                      width: `${(c.allowed / total) * 100}%`,
                      background: ACCESS_COLOR.allowed,
                    }}
                  />
                  <div
                    className="h-full transition-[width] duration-700"
                    style={{
                      width: `${(c.partial / total) * 100}%`,
                      background: ACCESS_COLOR.partial,
                    }}
                  />
                  <div
                    className="h-full transition-[width] duration-700"
                    style={{
                      width: `${(c.blocked / total) * 100}%`,
                      background: ACCESS_COLOR.blocked,
                    }}
                  />
                </div>
                <div className="w-44 shrink-0 flex items-center justify-end gap-3 text-[11px] tabular-nums">
                  <span className="text-[color:var(--positive)]">
                    {c.allowed} ok
                  </span>
                  {c.partial > 0 && (
                    <span className="text-[color:var(--warning)]">
                      {c.partial} partial
                    </span>
                  )}
                  {c.blocked > 0 && (
                    <span className="text-[color:var(--negative)]">
                      {c.blocked} blocked
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section
        title="Page-level audit"
        description={`${filtered.length} of ${totalPages} audited pages`}
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <Filter className="size-3 mr-1 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All page types</SelectItem>
                <SelectItem value="landing">Landing</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="pricing">Pricing</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="docs">Docs</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={severityFilter}
              onValueChange={(v) => setSeverityFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        contentClassName="p-0"
      >
        {filtered.length === 0 ? (
          <div className="px-5 py-12">
            <EmptyState
              icon={<Network className="size-5" />}
              title="No matching pages"
              description="Loosen the filters to see more pages."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((page) => (
              <PageRow key={page.id} page={page} />
            ))}
          </ul>
        )}
      </Section>

      {selectedPage && (
        <Section
          title={selectedPage.title}
          description={selectedPage.url}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(null)}
            >
              Close
            </Button>
          }
        >
          <PageDetail page={selectedPage} />
        </Section>
      )}

      <Section title="Entities consistently extracted">
        {(() => {
          const max = Math.max(1, ...entities.map((e) => e.count));
          return (
            <ul className="columns-1 lg:columns-2 gap-x-10 -my-1.5">
              {entities.map((e) => (
                <li
                  key={e.entity}
                  className="break-inside-avoid py-1.5"
                >
                  <div className="flex items-center gap-4 group">
                    <span className="text-sm font-medium w-[140px] shrink-0 truncate">
                      {e.entity}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-700 group-hover:opacity-90"
                        style={{
                          width: `${(e.count / max) * 100}%`,
                          background: "var(--pillar-understanding)",
                        }}
                      />
                    </div>
                    <span className="text-sm tabular-nums w-10 text-right shrink-0 text-muted-foreground">
                      {e.count}
                    </span>
                    <span
                      className={cn(
                        "text-xs tabular-nums w-12 text-right shrink-0",
                        e.growth > 0
                          ? "text-[color:var(--positive)]"
                          : e.growth < 0
                            ? "text-[color:var(--negative)]"
                            : "text-muted-foreground"
                      )}
                    >
                      {e.growth > 0 ? "+" : ""}
                      {e.growth}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          );
        })()}
      </Section>
    </div>
  );
}

function PageRow({ page }: { page: PageAuditRow }) {
  const worst = page.findings.reduce<keyof typeof SEVERITY>((acc, f) => {
    const order = { critical: 4, warning: 3, info: 2, ok: 1 } as const;
    return order[f.severity] > order[acc] ? f.severity : acc;
  }, "ok");
  const sev = SEVERITY[worst];
  return (
    <li>
      <Link
        href={`/visibility/understanding/pages/${page.id}`}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <span
          className={cn(
            "size-7 rounded-md grid place-items-center shrink-0",
            sev.bg
          )}
          style={{ color: sev.color }}
        >
          <SeverityIcon severity={worst} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{page.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {page.url.replace("https://", "")}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px] capitalize">
            {page.pageType}
          </Badge>
          {page.schemaTypes.slice(0, 2).map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--pillar-understanding-soft)] text-[color:var(--pillar-understanding)]"
            >
              {t}
            </span>
          ))}
          {page.schemaTypes.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{page.schemaTypes.length - 2}
            </span>
          )}
        </div>
        <div className="w-32 shrink-0">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Schema</span>
            <span className="tabular-nums">{page.schemaCoverage}%</span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${page.schemaCoverage}%`,
                background:
                  page.schemaCoverage >= 75
                    ? "var(--pillar-understanding)"
                    : page.schemaCoverage >= 60
                      ? "var(--warning)"
                      : "var(--negative)",
              }}
            />
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
      </Link>
    </li>
  );
}

function SeverityIcon({ severity }: { severity: keyof typeof SEVERITY }) {
  if (severity === "ok") return <CheckCircle2 className="size-4" />;
  if (severity === "info") return <Info className="size-4" />;
  if (severity === "warning") return <AlertTriangle className="size-4" />;
  return <XCircle className="size-4" />;
}

function PageDetail({ page }: { page: PageAuditRow }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricBlock
          label="Schema coverage"
          value={`${page.schemaCoverage}%`}
        />
        <MetricBlock
          label="Semantic clarity"
          value={`${page.semanticClarity}%`}
        />
        <MetricBlock
          label="Entity recognition"
          value={`${page.entityScore}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Detected schema
          </p>
          <div className="flex flex-wrap gap-1.5">
            {page.schemaTypes.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-[color:var(--pillar-understanding-soft)] text-[color:var(--pillar-understanding)]"
              >
                <Code2 className="size-3" />
                {t}
              </span>
            ))}
          </div>
          {page.missingSchemaTypes.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-2">
                Missing schema
              </p>
              <div className="flex flex-wrap gap-1.5">
                {page.missingSchemaTypes.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-dashed text-muted-foreground"
                  >
                    <Code2 className="size-3" />
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Crawler access
          </p>
          <ul className="space-y-1.5">
            {Object.entries(page.crawlerAccess).map(([crawler, access]) => (
              <li
                key={crawler}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium">{crawler}</span>
                <span
                  className="inline-flex items-center gap-1.5 text-xs capitalize"
                  style={{ color: ACCESS_COLOR[access] }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: ACCESS_COLOR[access] }}
                  />
                  {access}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Findings
        </p>
        <ul className="space-y-2">
          {page.findings.map((f, i) => {
            const sev = SEVERITY[f.severity];
            return (
              <li key={i} className={cn("flex gap-3 p-3 rounded-lg", sev.bg)}>
                <span style={{ color: sev.color }} className="shrink-0">
                  <SeverityIcon severity={f.severity} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {f.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <a
          href={page.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {page.url}
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[color:var(--pillar-understanding-soft)]/40 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">
        {value}
      </p>
    </div>
  );
}
