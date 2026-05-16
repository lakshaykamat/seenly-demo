import { COMPANY } from "./company";
import { daysAgo } from "./time";
import { randWalk, stepWalk, hash, makeRng } from "./rng";
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
  // Real SERP rank history is choppy: long flat stretches punctuated by step
  // changes when a competitor ships content / Google rolls an update. The
  // series still drifts toward the current `seed.start` value but no longer
  // looks like a hand-drawn smooth curve.
  const rawHistory = stepWalk(seed.start + seed.drift, 30, walkSeed, {
    jumpChance: 0.14,
    jumpScale: Math.max(2.2, Math.abs(seed.drift) * 1.6),
    tickNoise: 0.45,
    bounds: [1, 100],
    drift: -seed.drift / 60,
  });
  const history = rawHistory.map((v, idx) => {
    const target = seed.start;
    const t = idx / 29;
    return Math.round((v * (1 - t * 0.35) + target * t * 0.35) * 10) / 10;
  });
  const position = seed.start <= 100 ? Math.round(seed.start * 10) / 10 : null;
  const previousPosition =
    position == null ? null : Math.round((position + seed.drift) * 10) / 10;
  const competitorRanks: Record<string, number | null> = {};
  COMPETITOR_KEYS.forEach((d) => {
    competitorRanks[d] = seed.competitorBases[d] ?? null;
  });
  const url = seed.urlPath ? brandUrl(seed.urlPath, seed.urlHostKey) : null;
  // Spread `updatedAt` realistically across the last two weeks — high-volume
  // keywords get refreshed daily, niche ones every 7–14 days. Seeded by hash
  // so it's stable.
  const refreshRng = makeRng(hash(`refresh:${seed.keyword}`));
  const refreshDays =
    seed.volume > 3000
      ? Math.floor(refreshRng() * 3)
      : seed.volume > 800
        ? Math.floor(refreshRng() * 7)
        : 3 + Math.floor(refreshRng() * 11);
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
    updatedAt: daysAgo(refreshDays, (i * 7) % 23),
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

// Visibility trend uses bounded random walks per metric so the chart shows
// realistic local noise (1–2 pt day-over-day) on top of a slow upward drift,
// rather than a clean periodic wave that's a dead giveaway of synthetic data.
const TREND_VIS = stepWalk(42, 30, hash("trend:visibility"), {
  jumpChance: 0.12,
  jumpScale: 3.2,
  tickNoise: 0.7,
  bounds: [30, 90],
  drift: 0.78,
});
const TREND_SOV = stepWalk(18, 30, hash("trend:sov"), {
  jumpChance: 0.1,
  jumpScale: 2.1,
  tickNoise: 0.5,
  bounds: [10, 45],
  drift: 0.36,
});
const TREND_TOP3 = stepWalk(4, 30, hash("trend:top3"), {
  jumpChance: 0.08,
  jumpScale: 1.4,
  tickNoise: 0.3,
  bounds: [2, 18],
  drift: 0.28,
});
const TREND_TOP10 = stepWalk(12, 30, hash("trend:top10"), {
  jumpChance: 0.1,
  jumpScale: 2.2,
  tickNoise: 0.4,
  bounds: [8, 36],
  drift: 0.42,
});
const TREND_FEATURES = stepWalk(11, 30, hash("trend:features"), {
  jumpChance: 0.07,
  jumpScale: 1.6,
  tickNoise: 0.35,
  bounds: [4, 30],
  drift: 0.38,
});

export const VISIBILITY_TREND: VisibilitySnapshot[] = Array.from({
  length: 30,
}).map((_, i) => {
  const day = 29 - i;
  return {
    date: daysAgo(day),
    visibility: TREND_VIS[i],
    shareOfVoice: TREND_SOV[i],
    topThree: Math.round(TREND_TOP3[i]),
    topTen: Math.round(TREND_TOP10[i]),
    serpFeatureOwnership: TREND_FEATURES[i],
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

export { randWalk, stepWalk };
