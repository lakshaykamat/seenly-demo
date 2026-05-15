"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/visibility/section";
import { Sparkline } from "@/components/charts/sparkline";
import { KEYWORDS } from "@/lib/mocks/keywords";

function intentColor(intent: string): string {
  switch (intent) {
    case "transactional":
      return "var(--pillar-search)";
    case "commercial":
      return "var(--pillar-ai)";
    case "informational":
      return "var(--pillar-understanding)";
    default:
      return "var(--muted-foreground)";
  }
}

function formatFeature(f: string): string {
  return f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function KeywordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const keyword = KEYWORDS.find((k) => k.id === id);
  if (!keyword) notFound();

  const delta =
    keyword.position != null && keyword.previousPosition != null
      ? keyword.previousPosition - keyword.position
      : 0;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  const competitorRows = Object.entries(keyword.competitorRanks).sort(
    ([, a], [, b]) => {
      const aVal = a ?? 999;
      const bVal = b ?? 999;
      return aVal - bVal;
    }
  );

  return (
    <div className="space-y-6">
      <Link
        href="/visibility/search"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Search visibility
      </Link>

      <div className="flex items-start gap-4">
        <div
          className="size-11 rounded-xl grid place-items-center shrink-0"
          style={{
            background: "var(--pillar-search-soft)",
            color: "var(--pillar-search)",
          }}
        >
          <Search className="size-5" />
        </div>
        <div className="min-w-0">
          <p
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--pillar-search)" }}
          >
            Keyword
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight truncate">
            {keyword.keyword}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {keyword.intent}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Vol {keyword.volume.toLocaleString()} · KD {keyword.difficulty} ·
              CPC ${keyword.cpc.toFixed(2)}
            </span>
            {keyword.cannibalized && (
              <Badge variant="destructive" className="text-[10px]">
                Cannibalized
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground">Current rank</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {keyword.position ?? "—"}
          </p>
          <p
            className="mt-1 text-xs flex items-center gap-1 tabular-nums"
            style={{
              color:
                trend === "up"
                  ? "var(--pillar-search)"
                  : trend === "down"
                    ? "var(--destructive)"
                    : "var(--muted-foreground)",
            }}
          >
            {trend === "up" && <ArrowUp className="size-3" />}
            {trend === "down" && <ArrowDown className="size-3" />}
            {delta === 0 ? "No change" : `${Math.abs(delta).toFixed(1)} positions`}
            <span className="text-muted-foreground">
              vs prev {keyword.previousPosition ?? "—"}
            </span>
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground">SERP features present</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keyword.serpFeatures.length === 0 && (
              <span className="text-xs text-muted-foreground">None</span>
            )}
            {keyword.serpFeatures.map((f) => {
              const owned = keyword.ownedFeatures.includes(f);
              return (
                <Badge
                  key={f}
                  variant={owned ? "default" : "outline"}
                  className="text-[10px] capitalize"
                >
                  {formatFeature(f)}
                  {owned && " · owned"}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground">Landing URL</p>
          {keyword.url ? (
            <a
              href={keyword.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline truncate max-w-full"
            >
              <span className="truncate">{keyword.url.replace(/^https?:\/\//, "")}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No URL ranking</p>
          )}
        </div>
      </div>

      <Section
        title="Rank history (30 days)"
      >
        <div className="flex items-end justify-between gap-6">
          <Sparkline
            data={keyword.history}
            width={560}
            height={140}
            color={intentColor(keyword.intent)}
            strokeWidth={2}
            invert
          />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">30-day best</p>
            <p className="text-lg font-semibold tabular-nums">
              {Math.min(...keyword.history).toFixed(1)}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">30-day worst</p>
            <p className="text-lg font-semibold tabular-nums">
              {Math.max(...keyword.history).toFixed(1)}
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Competitor positions"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="py-2 font-medium">Domain</th>
              <th className="py-2 font-medium text-right tabular-nums">
                Position
              </th>
              <th className="py-2 font-medium text-right">Gap</th>
            </tr>
          </thead>
          <tbody>
            {competitorRows.map(([domain, rank]) => {
              const gap =
                rank != null && keyword.position != null
                  ? rank - keyword.position
                  : null;
              return (
                <tr key={domain} className="border-b last:border-0">
                  <td className="py-2.5 font-medium">{domain}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {rank ?? "—"}
                  </td>
                  <td className="py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                    {gap === null
                      ? "—"
                      : gap > 0
                        ? `+${gap.toFixed(1)} behind`
                        : gap < 0
                          ? `${Math.abs(gap).toFixed(1)} ahead`
                          : "tied"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
