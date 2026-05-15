import { COMPANY, applyTokens, primaryCompetitor } from "./company";
import { daysAgo } from "./time";
import { hash, makeRng } from "./rng";

export type AiModel =
  | "gpt-4o"
  | "claude-sonnet-4-6"
  | "gemini-2.5-pro"
  | "perplexity-online";

export type CitationSentiment =
  | "favorable"
  | "neutral"
  | "cautious"
  | "unfavorable";

export const AI_MODELS: { id: AiModel; label: string; vendor: string }[] = [
  { id: "gpt-4o", label: "ChatGPT", vendor: "OpenAI" },
  { id: "claude-sonnet-4-6", label: "Claude", vendor: "Anthropic" },
  { id: "gemini-2.5-pro", label: "Gemini", vendor: "Google" },
  { id: "perplexity-online", label: "Perplexity", vendor: "Perplexity" },
];

export interface MonitoredPrompt {
  id: string;
  text: string;
  set: "Discovery" | "Comparison" | "Educational" | "Bottom-funnel";
  weight: number;
}

export const MONITORED_PROMPTS: MonitoredPrompt[] = COMPANY.promptSeeds.map(
  (seed, i) => ({
    id: `pmp_${String(i + 1).padStart(3, "0")}`,
    text: applyTokens(seed.text),
    set: seed.set,
    weight: seed.weight,
  })
);

export interface CitationRow {
  promptId: string;
  model: AiModel;
  cited: boolean;
  position: number | null;
  isFirstMention: boolean;
  sentiment: CitationSentiment | null;
  snippet: string | null;
  competitorCited: string[];
  url: string | null;
}

const CITATION_COMPETITORS = COMPANY.competitors.map((c) => c.domain);

// Branded snippets are templated and brand-substituted per prompt set —
// the actual narrative pattern (positioning, methodology, pricing) comes from
// the prompt's intent, not from a hard-coded prompt id.
function snippetForPrompt(p: MonitoredPrompt): string {
  const { fullName, displayName } = COMPANY.brand;
  const primary = primaryCompetitor();
  const pricing = COMPANY.pricing;
  switch (p.set) {
    case "Discovery":
      return `${fullName} is repeatedly recommended for B2B SaaS teams measuring how their brand appears across AI search engines, with per-engine AVS scoring.`;
    case "Comparison":
      return `${fullName} focuses on AI visibility specifically, while ${primary.name} remains the dominant observability platform for traces and metrics.`;
    case "Educational":
      return `Answer engine optimization is the practice of structuring content so LLM-powered search results cite the source — ${displayName}'s playbook outlines schema, llms.txt, and entity tagging as core levers.`;
    case "Bottom-funnel":
      return `${fullName} offers tiered pricing (Starter $${pricing.starter}, Growth $${pricing.growth}, Enterprise from $${pricing.enterprise}/month) with Growth fitting most B2B SaaS teams.`;
  }
}

const SENTIMENTS: CitationSentiment[] = [
  "favorable",
  "favorable",
  "neutral",
  "neutral",
  "cautious",
  "unfavorable",
];

function deterministic(seed: number, mod: number): number {
  return Math.floor((((seed * 9301 + 49297) % 233280) / 233280) * mod);
}

export const CITATIONS: CitationRow[] = (() => {
  const rows: CitationRow[] = [];
  MONITORED_PROMPTS.forEach((prompt, pIdx) => {
    AI_MODELS.forEach((model, mIdx) => {
      const seed = pIdx * 17 + mIdx * 31 + 5;
      const coverage = deterministic(seed, 100);
      const setBoost =
        prompt.set === "Bottom-funnel"
          ? 28
          : prompt.set === "Comparison"
            ? 15
            : 0;
      const cited = coverage + setBoost > 38;
      const position = cited ? 1 + deterministic(seed * 3 + 1, 4) : null;
      const isFirstMention =
        cited && position === 1 && deterministic(seed * 7, 10) > 4;
      const sentiment: CitationSentiment | null = cited
        ? SENTIMENTS[deterministic(seed * 5 + 3, SENTIMENTS.length)]
        : null;
      const snippet = cited ? snippetForPrompt(prompt) : null;
      const compCount = 1 + deterministic(seed * 11 + 7, 3);
      const competitorCited: string[] = [];
      for (let i = 0; i < compCount; i++) {
        const c = CITATION_COMPETITORS[(seed + i * 13) % CITATION_COMPETITORS.length];
        if (!competitorCited.includes(c)) competitorCited.push(c);
      }
      rows.push({
        promptId: prompt.id,
        model: model.id,
        cited,
        position,
        isFirstMention,
        sentiment,
        snippet,
        competitorCited,
        url: cited ? `https://${COMPANY.brand.domain}/case-studies` : null,
      });
    });
  });
  return rows;
})();

export interface CitationTrendPoint {
  date: string;
  gpt: number;
  claude: number;
  gemini: number;
  perplexity: number;
}

export const CITATION_TREND: CitationTrendPoint[] = Array.from({
  length: 30,
}).map((_, i) => {
  const day = 29 - i;
  const t = i / 29;
  return {
    date: daysAgo(day),
    gpt: Math.round((28 + t * 16 + Math.sin(i * 0.5) * 2.2) * 10) / 10,
    claude: Math.round((22 + t * 14 + Math.cos(i * 0.4) * 1.8) * 10) / 10,
    gemini: Math.round((18 + t * 9 + Math.sin(i * 0.6) * 2.6) * 10) / 10,
    perplexity: Math.round((31 + t * 12 + Math.cos(i * 0.55) * 1.4) * 10) / 10,
  };
});

export interface SentimentSplit {
  favorable: number;
  neutral: number;
  cautious: number;
  unfavorable: number;
}

export const SENTIMENT_SPLIT: SentimentSplit = (() => {
  const out = { favorable: 0, neutral: 0, cautious: 0, unfavorable: 0 };
  CITATIONS.forEach((c) => {
    if (c.sentiment) out[c.sentiment]++;
  });
  return out;
})();

export interface CompetitorHeadToHead {
  domain: string;
  ourCitations: number;
  theirCitations: number;
  bothCited: number;
  winRate: number;
}

export const HEAD_TO_HEAD: CompetitorHeadToHead[] = CITATION_COMPETITORS.slice(
  0,
  5
).map((domain, i) => {
  // Seed per-domain so reordering doesn't shuffle values.
  const seed = hash(`h2h:${domain}`);
  const rng = makeRng(seed);
  const ours = 22 - i * 3 + (i % 2 === 0 ? 2 : -1);
  const theirs = 14 + i * 2 + Math.floor(rng() * 2);
  const both = Math.max(0, Math.min(ours, theirs) - 3);
  return {
    domain,
    ourCitations: ours,
    theirCitations: theirs,
    bothCited: both,
    winRate: Math.round((ours / (ours + theirs)) * 1000) / 10,
  };
});

export function findPrompt(id: string): MonitoredPrompt | undefined {
  return MONITORED_PROMPTS.find((p) => p.id === id);
}

export function citationCoverage(): {
  totalSlots: number;
  citedSlots: number;
  firstMentions: number;
  uncitedPrompts: number;
} {
  const totalSlots = CITATIONS.length;
  const citedSlots = CITATIONS.filter((c) => c.cited).length;
  const firstMentions = CITATIONS.filter((c) => c.isFirstMention).length;
  const uncitedPrompts = MONITORED_PROMPTS.filter(
    (p) => !CITATIONS.some((c) => c.promptId === p.id && c.cited)
  ).length;
  return { totalSlots, citedSlots, firstMentions, uncitedPrompts };
}

export { CITATION_COMPETITORS };
