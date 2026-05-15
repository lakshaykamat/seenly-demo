"use client";

import { use } from "react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/visibility/section";
import { cn } from "@/lib/utils";
import {
  AI_MODELS,
  CITATIONS,
  MONITORED_PROMPTS,
  type AiModel,
  type CitationRow,
  type CitationSentiment,
} from "@/lib/mocks/aiCitations";

const SENTIMENT_TONE: Record<CitationSentiment, string> = {
  favorable: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  neutral: "bg-muted text-foreground",
  cautious: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  unfavorable: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function modelById(id: string) {
  return AI_MODELS.find((m) => m.id === id);
}

function CitationCard({
  row,
  selected,
}: {
  row: CitationRow;
  selected: boolean;
}) {
  const model = modelById(row.model);
  return (
    <Link
      href={`?model=${row.model}`}
      scroll={false}
      className={cn(
        "block rounded-xl border p-4 transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "bg-card hover:bg-muted/40"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{model?.label ?? row.model}</p>
          <p className="text-[11px] text-muted-foreground">{model?.vendor}</p>
        </div>
        {row.cited ? (
          <Badge variant="default" className="gap-1">
            <Check className="size-3" />
            Cited
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <X className="size-3" />
            Not cited
          </Badge>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {row.cited && row.position != null && (
          <span className="tabular-nums">Position {row.position}</span>
        )}
        {row.isFirstMention && (
          <span className="text-primary font-medium">First mention</span>
        )}
        {row.sentiment && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] capitalize",
              SENTIMENT_TONE[row.sentiment]
            )}
          >
            {row.sentiment}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function PromptDetailPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = use(params);
  const searchParams = useSearchParams();
  const modelParam = searchParams.get("model") as AiModel | null;

  const prompt = MONITORED_PROMPTS.find((p) => p.id === promptId);
  if (!prompt) notFound();

  const rows = CITATIONS.filter((c) => c.promptId === promptId);
  const selectedModel: AiModel =
    modelParam && AI_MODELS.some((m) => m.id === modelParam)
      ? modelParam
      : rows[0]?.model ?? AI_MODELS[0].id;
  const selected = rows.find((r) => r.model === selectedModel) ?? rows[0];
  const selectedModelMeta = modelById(selectedModel);

  const citedCount = rows.filter((r) => r.cited).length;
  const competitorMentions = new Map<string, number>();
  rows.forEach((r) =>
    r.competitorCited.forEach((c) =>
      competitorMentions.set(c, (competitorMentions.get(c) ?? 0) + 1)
    )
  );
  const competitorList = [...competitorMentions.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="space-y-6">
      <Link
        href="/visibility/ai"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> AI recommendation
      </Link>

      <div className="flex items-start gap-4">
        <div
          className="size-11 rounded-xl grid place-items-center shrink-0"
          style={{
            background: "var(--pillar-ai-soft)",
            color: "var(--pillar-ai)",
          }}
        >
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--pillar-ai)" }}
          >
            Monitored prompt · {prompt.set}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            “{prompt.text}”
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cited by{" "}
            <span className="font-medium text-foreground">
              {citedCount} of {rows.length}
            </span>{" "}
            engines · weight {prompt.weight}
          </p>
        </div>
      </div>

      <Section
        title="Engine coverage"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AI_MODELS.map((m) => {
            const row = rows.find((r) => r.model === m.id);
            if (!row) return null;
            return (
              <CitationCard
                key={m.id}
                row={row}
                selected={m.id === selectedModel}
              />
            );
          })}
        </div>
      </Section>

      {selected && (
        <Section
          title={`${selectedModelMeta?.label ?? selectedModel} response`}
          description={`How ${selectedModelMeta?.label ?? "this engine"} answered the prompt.`}
        >
          {selected.cited ? (
            <div className="space-y-4">
              {selected.snippet && (
                <blockquote className="rounded-lg border-l-4 border-primary bg-muted/40 px-4 py-3 text-sm leading-relaxed">
                  {selected.snippet}
                </blockquote>
              )}
              <div className="flex flex-wrap gap-4 text-xs">
                {selected.position != null && (
                  <span className="text-muted-foreground">
                    Position{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {selected.position}
                    </span>
                  </span>
                )}
                {selected.sentiment && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded capitalize",
                      SENTIMENT_TONE[selected.sentiment]
                    )}
                  >
                    {selected.sentiment}
                  </span>
                )}
                {selected.url && (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Source <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selectedModelMeta?.label ?? "This engine"} did not cite your
              brand for this prompt.
            </p>
          )}

          {selected.competitorCited.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Competitors cited
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.competitorCited.map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {competitorList.length > 0 && (
        <Section
          title="Competitor share for this prompt"
        >
          <ul className="divide-y divide-border/60">
            {competitorList.map(([domain, count]) => (
              <li
                key={domain}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-sm font-medium">{domain}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count} / {rows.length} engines
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
