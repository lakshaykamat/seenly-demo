import { COMPANY } from "./company";
import { daysAgo } from "./time";
import { randWalk, hash } from "./rng";
import { brandUrl } from "./urls";

export type SerpFeature =
  | "featured_snippet"
  | "people_also_ask"
  | "image_pack"
  | "ai_overview"
  | "video"
  | "knowledge_panel";

export type SearchIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational";

export interface KeywordRow {
  id: string;
  keyword: string;
  intent: SearchIntent;
  volume: number;
  difficulty: number;
  cpc: number;
  position: number | null;
  previousPosition: number | null;
  url: string | null;
  serpFeatures: SerpFeature[];
  ownedFeatures: SerpFeature[];
  history: number[];
  competitorRanks: Record<string, number | null>;
  cannibalized: boolean;
  updatedAt: string;
}

// Top four competitors drive the per-keyword competitor-rank columns. The
// keyword seeds in company.json declare `competitorBases` keyed by these
// domains; mismatches resolve to null and the keyword still renders.
const COMPETITOR_KEYS = COMPANY.competitors.slice(0, 4).map((c) => c.domain);

export const KEYWORDS: KeywordRow[] = COMPANY.keywordSeeds.map((seed, i) => {
  const id = `kw_${(i + 1).toString(36).padStart(4, "0")}`;
  // Seed the per-keyword walk by the keyword text — reordering the seed list
  // therefore does not shuffle history values.
  const walkSeed = hash(`kw:${seed.keyword}`);
  const history = randWalk(
    seed.start + Math.abs(seed.drift),
    30,
    walkSeed,
    1.4
  ).map((v, idx) => {
    const target = seed.start;
    const t = idx / 29;
    return Math.round((v * (1 - t * 0.4) + target * t * 0.4) * 10) / 10;
  });
  const position = seed.start <= 100 ? Math.round(seed.start * 10) / 10 : null;
  const previousPosition =
    position == null ? null : Math.round((position + seed.drift) * 10) / 10;
  const competitorRanks: Record<string, number | null> = {};
  COMPETITOR_KEYS.forEach((d) => {
    competitorRanks[d] = seed.competitorBases[d] ?? null;
  });
  const url = seed.urlPath ? brandUrl(seed.urlPath, seed.urlHostKey) : null;
  return {
    id,
    keyword: seed.keyword,
    intent: seed.intent,
    volume: seed.volume,
    difficulty: seed.difficulty,
    cpc: seed.cpc,
    position,
    previousPosition,
    url,
    serpFeatures: seed.features as SerpFeature[],
    ownedFeatures: seed.owned as SerpFeature[],
    history,
    competitorRanks,
    cannibalized: seed.cannibalized ?? false,
    updatedAt: daysAgo(i % 3),
  };
});

export interface VisibilitySnapshot {
  date: string;
  visibility: number;
  shareOfVoice: number;
  topThree: number;
  topTen: number;
  serpFeatureOwnership: number;
}

export const VISIBILITY_TREND: VisibilitySnapshot[] = Array.from({
  length: 30,
}).map((_, i) => {
  const day = 29 - i;
  const t = i / 29;
  const visibility =
    Math.round((42 + t * 24 + Math.sin(i * 0.5) * 2.4) * 10) / 10;
  const shareOfVoice =
    Math.round((18 + t * 11 + Math.cos(i * 0.6) * 1.6) * 10) / 10;
  const topThree = Math.round(4 + t * 9 + Math.sin(i * 0.7) * 1.2);
  const topTen = Math.round(12 + t * 14 + Math.cos(i * 0.45) * 1.8);
  const serpFeatureOwnership =
    Math.round((11 + t * 12 + Math.sin(i * 0.3) * 1.4) * 10) / 10;
  return {
    date: daysAgo(day),
    visibility,
    shareOfVoice,
    topThree,
    topTen,
    serpFeatureOwnership,
  };
});

export const SERP_FEATURE_SUMMARY: Array<{
  feature: SerpFeature;
  label: string;
  total: number;
  owned: number;
  delta: number;
}> = [
  { feature: "ai_overview", label: "AI Overview", total: 18, owned: 7, delta: 3 },
  { feature: "featured_snippet", label: "Featured Snippet", total: 14, owned: 5, delta: 1 },
  { feature: "people_also_ask", label: "People Also Ask", total: 22, owned: 12, delta: 4 },
  { feature: "image_pack", label: "Image Pack", total: 4, owned: 1, delta: 0 },
  { feature: "video", label: "Video", total: 3, owned: 0, delta: 0 },
  { feature: "knowledge_panel", label: "Knowledge Panel", total: 2, owned: 1, delta: 1 },
];

export const TOP_MOVERS = {
  gainers: [...KEYWORDS]
    .filter((k) => k.position != null && k.previousPosition != null)
    .sort(
      (a, b) =>
        b.previousPosition! - b.position! - (a.previousPosition! - a.position!)
    )
    .slice(0, 5),
  losers: [...KEYWORDS]
    .filter((k) => k.position != null && k.previousPosition != null)
    .sort(
      (a, b) =>
        a.previousPosition! - a.position! - (b.previousPosition! - b.position!)
    )
    .slice(0, 5),
};

export { randWalk };
