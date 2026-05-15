import { COMPANY } from "./company";
import { daysAgo } from "./time";

export interface CompetitorScores {
  domain: string;
  name: string;
  searchVisibility: number;
  aiRecommendation: number;
  aiUnderstanding: number;
  overall: number;
  delta: number;
  citationShare: number;
  trackedKeywords: number;
  topThree: number;
  ourGap: number;
}

// Our brand row + the top four competitors. Per-competitor index drives a
// stable score distribution so swapping the competitor list (or reordering)
// doesn't change the visible shape. Numbers track real visibility ranges for
// a mid-market category (visibility 58–82, AI rec 49–62, AI und 66–79,
// citation share 11–28, top-3 11–22, gap −2 to +10).
const OUR_ROW: CompetitorScores = {
  name: COMPANY.brand.fullName,
  domain: COMPANY.brand.domain,
  searchVisibility: 64.8,
  aiRecommendation: 58.4,
  aiUnderstanding: 71.2,
  overall: 64.1,
  delta: 4.2,
  citationShare: 28.6,
  trackedKeywords: 32,
  topThree: 14,
  ourGap: 0,
};

// Per-index offsets relative to our brand row — keep the original numeric
// distribution but make competitor identity swappable.
const COMPETITOR_SCORE_OFFSETS: Array<{
  searchVisibility: number;
  aiRecommendation: number;
  aiUnderstanding: number;
  overall: number;
  delta: number;
  citationShare: number;
  trackedKeywords: number;
  topThree: number;
  ourGap: number;
}> = [
  // index 0 — strongest competitor
  { searchVisibility: 81.2, aiRecommendation: 62.1, aiUnderstanding: 78.4, overall: 73.9, delta: -1.4, citationShare: 19.4, trackedKeywords: 32, topThree: 22, ourGap: 9.8 },
  // index 1
  { searchVisibility: 72.4, aiRecommendation: 54.8, aiUnderstanding: 68.1, overall: 65.1, delta: 1.6, citationShare: 14.2, trackedKeywords: 32, topThree: 17, ourGap: 1.0 },
  // index 2
  { searchVisibility: 58.6, aiRecommendation: 51.2, aiUnderstanding: 74.8, overall: 61.5, delta: 2.8, citationShare: 11.8, trackedKeywords: 28, topThree: 11, ourGap: -2.6 },
  // index 3
  { searchVisibility: 76.4, aiRecommendation: 49.6, aiUnderstanding: 66.4, overall: 64.1, delta: 0.4, citationShare: 13.6, trackedKeywords: 32, topThree: 18, ourGap: 0 },
];

const TOP_COMPETITORS = COMPANY.competitors.slice(0, COMPETITOR_SCORE_OFFSETS.length);

export const COMPETITOR_SCORES: CompetitorScores[] = [
  OUR_ROW,
  ...TOP_COMPETITORS.map((c, i) => ({
    name: c.name,
    domain: c.domain,
    ...COMPETITOR_SCORE_OFFSETS[i],
  })),
];

export interface MentionTrendPoint {
  date: string;
  values: Record<string, number>;
}

const TIMELINE_DOMAINS = COMPETITOR_SCORES.map((r) => r.domain);

// Per-index trend configs. Index 0 is our brand row; remaining indices map to
// the top competitors in order. Same numeric shapes as the original.
const TIMELINE_CONFIGS: Array<{ base: number; growth: number; k: number; amp: number }> = [
  { base: 19, growth: 11, k: 0.45, amp: 1.6 },   // our brand
  { base: 24, growth: 4, k: 0.55, amp: 1.92 },   // competitor index 0
  { base: 14, growth: 3, k: 0.62, amp: 1.44 },   // competitor index 1
  { base: 11, growth: 5, k: 0.5, amp: 1.28 },    // competitor index 2
  { base: 12, growth: 2.5, k: 0.4, amp: 1.6 },   // competitor index 3
];
const TIMELINE_BASES: Record<string, { base: number; growth: number; k: number; amp: number }> =
  Object.fromEntries(TIMELINE_DOMAINS.map((d, i) => [d, TIMELINE_CONFIGS[i] ?? TIMELINE_CONFIGS[0]]));

export const MENTION_TIMELINE: MentionTrendPoint[] = Array.from({
  length: 30,
}).map((_, i) => {
  const day = 29 - i;
  const t = i / 29;
  const values: Record<string, number> = {};
  TIMELINE_DOMAINS.forEach((d) => {
    const cfg = TIMELINE_BASES[d];
    if (!cfg) {
      values[d] = 0;
      return;
    }
    const wobble = Math.sin(i * cfg.k) * cfg.amp + Math.cos(i * cfg.k * 0.7) * (cfg.amp * 0.7);
    values[d] = Math.round((cfg.base + t * cfg.growth + wobble) * 10) / 10;
  });
  return { date: daysAgo(day), values };
});

export interface WatchlistEntry {
  id: string;
  domain: string;
  name: string;
  addedAt: string;
  alertOnDrop: boolean;
  notes: string | null;
}

export const WATCHLIST_SEED: WatchlistEntry[] = COMPANY.competitors
  .filter((c) => c.addedDaysAgo > 0)
  .map((c, i) => ({
    id: `wl_${(i + 1).toString().padStart(2, "0")}`,
    domain: c.domain,
    name: c.name,
    addedAt: daysAgo(c.addedDaysAgo),
    alertOnDrop: c.alertOnDrop,
    notes: c.note,
  }));

export interface GapInsight {
  competitor: string;
  metric: string;
  ours: number;
  theirs: number;
  gap: number;
  recommendation: string;
}

const GAP_COMP_0 = COMPANY.competitors[0];
const GAP_COMP_1 = COMPANY.competitors[2] ?? COMPANY.competitors[0];
const GAP_COMP_2 = COMPANY.competitors[1] ?? COMPANY.competitors[0];

export const TOP_GAPS: GapInsight[] = [
  {
    competitor: GAP_COMP_0.domain,
    metric: "Top-3 keyword count",
    ours: 14,
    theirs: 22,
    gap: -8,
    recommendation: `${GAP_COMP_0.name} ranks top-3 on adjacent ${COMPANY.brand.category} terms ${COMPANY.brand.displayName} doesn't compete on.`,
  },
  {
    competitor: GAP_COMP_1.domain,
    metric: "AI Understanding score",
    ours: 71.2,
    theirs: 74.8,
    gap: -3.6,
    recommendation: `${GAP_COMP_1.name} has richer FAQ + HowTo schema across their services and case study surfaces.`,
  },
  {
    competitor: GAP_COMP_2.domain,
    metric: "AI Recommendation",
    ours: 58.4,
    theirs: 54.8,
    gap: 3.6,
    recommendation: `${COMPANY.brand.displayName} leads — but lost ground on pricing prompts in the last 7 days.`,
  },
];
