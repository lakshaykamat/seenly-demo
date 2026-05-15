"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Network,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/visibility/section";
import { cn } from "@/lib/utils";
import {
  PAGE_AUDITS,
  type AuditSeverity,
  type CrawlerAccess,
} from "@/lib/mocks/schemaAudit";

const SEVERITY_ICON = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
  ok: CheckCircle2,
} as const;

const SEVERITY_TONE: Record<AuditSeverity, string> = {
  critical: "text-rose-600 dark:text-rose-300 bg-rose-500/10 border-rose-500/30",
  warning: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
  info: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/30",
  ok: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
};

const ACCESS_TONE: Record<CrawlerAccess, string> = {
  allowed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  partial: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  blocked: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function ScoreCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export default function PageAuditDetail({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = use(params);
  const page = PAGE_AUDITS.find((p) => p.id === pageId);
  if (!page) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/visibility/understanding"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> AI understanding
      </Link>

      <div className="flex items-start gap-4">
        <div
          className="size-11 rounded-xl grid place-items-center shrink-0"
          style={{
            background: "var(--pillar-understanding-soft)",
            color: "var(--pillar-understanding)",
          }}
        >
          <Network className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--pillar-understanding)" }}
          >
            Page · {page.pageType}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight truncate">
            {page.title}
          </h1>
          <a
            href={page.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">
              {page.url.replace(/^https?:\/\//, "")}
            </span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ScoreCard
          title="Schema coverage"
          value={page.schemaCoverage}
          subtitle={`${page.schemaTypes.length} types present`}
        />
        <ScoreCard
          title="Semantic clarity"
          value={page.semanticClarity}
          subtitle="Heading hierarchy + structure"
        />
        <ScoreCard
          title="Entity score"
          value={page.entityScore}
          subtitle="Brand & topic recognition"
        />
      </div>

      <Section
        title="Crawler access"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(page.crawlerAccess).map(([crawler, access]) => (
            <div
              key={crawler}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span className="text-sm font-medium">{crawler}</span>
              <span
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                  ACCESS_TONE[access]
                )}
              >
                {access}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Schema types"
      >
        <div className="flex flex-wrap gap-2">
          {page.schemaTypes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No structured data detected.
            </p>
          )}
          {page.schemaTypes.map((t) => (
            <Badge key={t} variant="default" className="text-xs">
              {t}
            </Badge>
          ))}
          {page.missingSchemaTypes.map((t) => (
            <Badge key={t} variant="outline" className="text-xs text-muted-foreground">
              Missing: {t}
            </Badge>
          ))}
        </div>
      </Section>

      <Section
        title="Findings"
      >
        {page.findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings.</p>
        ) : (
          <ul className="space-y-2">
            {page.findings.map((f, i) => {
              const Icon = SEVERITY_ICON[f.severity];
              return (
                <li
                  key={i}
                  className={cn(
                    "rounded-lg border p-3 flex gap-3",
                    SEVERITY_TONE[f.severity]
                  )}
                >
                  <Icon className="size-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="mt-0.5 text-xs opacity-80">{f.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <p className="text-xs text-muted-foreground">
        Last checked {new Date(page.lastChecked).toLocaleString()}
      </p>
    </div>
  );
}
