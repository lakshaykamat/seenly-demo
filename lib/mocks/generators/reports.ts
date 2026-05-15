import { COMPANY, primaryCompetitor } from "./company";
import { MEMBERS } from "./fixtures";

export type ReportStatus = "ready" | "generating" | "scheduled";
export type ReportPeriod = string;

export interface ReportKpi {
  label: string;
  value: number;
  unit: "%" | "pts" | "score" | "count";
  delta: number;
  trend: number[];
}

export interface ReportPillarBlock {
  pillar: "search" | "ai" | "understanding";
  score: number;
  delta: number;
  highlights: string[];
  risks: string[];
}

export interface ReportNarrative {
  summary: string;
  wins: { title: string; detail: string }[];
  risks: { title: string; detail: string }[];
  focus: { title: string; detail: string }[];
}

export interface Report {
  id: string;
  period: ReportPeriod;
  title: string;
  subtitle: string;
  status: ReportStatus;
  generatedAt: string;
  generatedById: string;
  pages: number;
  shareToken: string;
  shareEnabled: boolean;
  shareViews: number;
  shareLastViewedAt: string | null;
  kpis: ReportKpi[];
  pillars: ReportPillarBlock[];
  citationShare: { model: string; share: number; delta: number }[];
  rankSeries: { date: string; value: number }[];
  visibilitySeries: { date: string; value: number }[];
  narrative: ReportNarrative;
  recipients: string[];
}

const ORG = COMPANY.org.name;
const primary = primaryCompetitor();
const secondary = COMPANY.competitors[1] ?? primary;
const tertiary = COMPANY.competitors[2] ?? primary;

// Anchor pages used by report narratives. Mapped to real sitePages so risk /
// win bullets reference paths that actually exist on the brand domain.
const REPORT_LANDING = COMPANY.sitePages.find((p) => p.path === "/") ?? COMPANY.sitePages[0];
const REPORT_CASE_INDEX = COMPANY.sitePages.find((p) => p.path === "/case-studies") ?? REPORT_LANDING;
const REPORT_CASE_STUDIES = COMPANY.sitePages.filter((p) => p.type === "customers" && p.path !== "/case-studies");
const REPORT_HEADLINE_CASE = REPORT_CASE_STUDIES[1] ?? REPORT_CASE_STUDIES[0] ?? REPORT_CASE_INDEX;
const REPORT_HEADLINE_CASE_NAME =
  REPORT_HEADLINE_CASE.title.replace(/^Case Study\s*[—-]\s*/i, "").split("·")[0]?.trim() ??
  "Apparatus AI";
const reportSlug = (d: string) => d.split(".")[0];

function periodLabel(p: ReportPeriod): string {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function periodEnd(p: ReportPeriod): string {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m, 0, 17, 0, 0).toISOString();
}

function series(seed: number, count: number, base: number, vol: number): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < count; i++) {
    const noise =
      ((Math.sin(seed + i * 1.31) + Math.cos(seed * 0.7 + i * 0.71)) / 2) * vol;
    v = Math.max(0, base + noise + (i / count) * vol * 0.4);
    out.push(Math.round(v * 10) / 10);
  }
  return out;
}

function dateSeries(
  p: ReportPeriod,
  values: number[]
): { date: string; value: number }[] {
  const [y, m] = p.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const step = Math.max(1, Math.floor(days / values.length));
  return values.map((value, i) => ({
    date: new Date(y, m - 1, Math.min(days, 1 + i * step)).toISOString(),
    value,
  }));
}

const SHARE_TOKENS = [
  "rep-mar-7f2a9c1e",
  "rep-apr-3b8d4e7a",
  "rep-may-1c6f2b9d",
  "rep-feb-9a4e1d7c",
  "rep-jan-5e7c2a8b",
  "rep-dec-2d8b4f1c",
];

// Derive periods relative to TODAY (the six months ending at the current month).
function recentPeriods(count: number): ReportPeriod[] {
  const today = new Date(COMPANY.todayIso);
  const out: ReportPeriod[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const PERIODS = recentPeriods(6);

interface Seed {
  period: ReportPeriod;
  status: ReportStatus;
  visibility: number;
  visibilityDelta: number;
  citation: number;
  citationDelta: number;
  understanding: number;
  understandingDelta: number;
  rank: number;
  rankDelta: number;
  narrative: ReportNarrative;
}

const PERIOD_DATA: Omit<Seed, "period">[] = [
  // index 0 — current month
  {
    status: "ready",
    visibility: 78.4,
    visibilityDelta: 4.2,
    citation: 31.6,
    citationDelta: 2.8,
    understanding: 84.1,
    understandingDelta: 1.4,
    rank: 7.2,
    rankDelta: -1.1,
    narrative: {
      summary: `This month was the strongest on record across all three pillars. Citation share against ${primary.name} and ${secondary.name} closed by 4.1 points, driven by the AEO playbook republication and the new engagement-tier FAQ schema. Mobile rank regression on ${REPORT_CASE_INDEX.path} is the dominant outstanding risk going into next month.`,
      wins: [
        {
          title: "Citation share +2.8 pts on Claude",
          detail: `Bottom-funnel pricing prompts now cite ${COMPANY.brand.domain} in 9 / 14 answers (up from 5 / 14 a month ago).`,
        },
        {
          title: "Recovered AEO featured snippet",
          detail: `Reclaimed snippet ownership for 'answer engine optimization' on the 12th after 41-day hold by ${primary.name}.`,
        },
        {
          title: "Schema coverage at 88%",
          detail:
            "Organization, FAQPage, and HowTo schemas shipped across 24 marketing surfaces.",
        },
      ],
      risks: [
        {
          title: `Mobile rank slip on ${REPORT_CASE_INDEX.path}`,
          detail:
            "Mobile rank dropped from #3 to #11 between the 8th–12th while desktop held #4. Likely Core Web Vitals regression.",
        },
        {
          title: "Gemini citations flat",
          detail: `Gemini cites ${COMPANY.brand.domain} 0 / 14 times for 'open-source AI consulting partners'. Open-source-aware content is the gap.`,
        },
      ],
      focus: [
        {
          title: `Ship refreshed ${REPORT_HEADLINE_CASE_NAME} case study`,
          detail:
            "Case study unlocks 4 enterprise prompts uncited today across all engines.",
        },
        {
          title: "Resolve mobile LCP regression",
          detail: `Lazy-load mobile nav segments to recover ~600ms LCP on ${REPORT_CASE_INDEX.path}.`,
        },
        {
          title: "Publish open-source comparison piece",
          detail:
            "Targets Gemini's open-source citation bias; expected to lift citation share 2–3 pts.",
        },
      ],
    },
  },
  // index 1 — last month
  {
    status: "ready",
    visibility: 74.2,
    visibilityDelta: 2.7,
    citation: 28.8,
    citationDelta: 1.5,
    understanding: 82.7,
    understandingDelta: 2.1,
    rank: 8.3,
    rankDelta: -0.6,
    narrative: {
      summary:
        "Last month delivered steady gains. Schema coverage moved to 84% after Organization sameAs links shipped. The case study hub entered top 5 for three commercial queries. ChatGPT citation rate stable at 34%; Claude began climbing.",
      wins: [
        {
          title: "Organization schema with sameAs links shipped",
          detail:
            "Entity recognition score moved from 0.71 to 0.84 across marketing surfaces.",
        },
        {
          title: "Top-5 entry for 'AI consulting firm pricing'",
          detail:
            "Position moved from #9 to #4 over two weeks following the engagement-tier FAQ rollout.",
        },
      ],
      risks: [
        {
          title: `${primary.name} stole AEO snippet`,
          detail: `${primary.name} reclaimed the snippet. Reclamation in progress.`,
        },
        {
          title: `Cannibalization on '${COMPANY.brand.category}'`,
          detail:
            "Three URLs target the same query. Consolidation plan drafted.",
        },
      ],
      focus: [
        {
          title: "Reclaim AEO featured snippet",
          detail: "Tighten intro answer to 42 words and reformat list items.",
        },
        {
          title: `Add FAQ schema to ${REPORT_CASE_INDEX.path}`,
          detail:
            "Quick win identified as missing from highest-traffic bottom-funnel page.",
        },
      ],
    },
  },
  // index 2 — two months ago
  {
    status: "ready",
    visibility: 71.5,
    visibilityDelta: 1.8,
    citation: 27.3,
    citationDelta: 0.9,
    understanding: 80.6,
    understandingDelta: 3.4,
    rank: 8.9,
    rankDelta: -0.3,
    narrative: {
      summary:
        "Focus this month was AI Understanding. Schema coverage rose 3.4 points after the docs HowTo rollout. Citation share growth slowed (+0.9 pts) — Perplexity flat as G2 reviews aged out of the freshness window.",
      wins: [
        {
          title: "HowTo schema across guidance pages",
          detail:
            "12 pages marked up; AI Overview eligibility lifted for 'how to scope an AI project' queries.",
        },
        {
          title: "Crawl budget recovered",
          detail:
            "Sunsetted 3-hop redirect chain on /engagements-v1; crawl efficiency up 18% week-over-week.",
        },
      ],
      risks: [
        {
          title: "Perplexity citation rate stagnant",
          detail:
            "G2 reviews aged past the 90-day freshness window; refresh program required.",
        },
      ],
      focus: [
        {
          title: "Refresh G2 / Capterra reviews",
          detail:
            "Comparable cited competitors all have <90-day reviews. Plan customer-review push for Q2.",
        },
      ],
    },
  },
  {
    status: "ready",
    visibility: 69.7,
    visibilityDelta: 3.1,
    citation: 26.4,
    citationDelta: 2.2,
    understanding: 77.2,
    understandingDelta: 1.7,
    rank: 9.2,
    rankDelta: -0.9,
    narrative: {
      summary:
        "Momentum this month came from the new comparison hub. Three competitor comparison pages drove a 2.2 point lift in AI citation share, primarily on ChatGPT and Claude.",
      wins: [
        {
          title: "Comparison hub launched",
          detail: `/compare/${reportSlug(primary.domain)}, /compare/${reportSlug(secondary.domain)}, and /compare/${reportSlug(tertiary.domain)} shipped with structured engagement-tier tables.`,
        },
        {
          title: "ChatGPT first-mention rate up 6 pts",
          detail: `${COMPANY.brand.displayName} cited first in 24 / 60 monitored prompts (up from 18 / 60).`,
        },
      ],
      risks: [
        {
          title: "Internal linking from case studies → services weak",
          detail:
            "Case study pages average 0.6 contextual links to service surfaces. Industry benchmark is 2–3.",
        },
      ],
      focus: [
        {
          title: "Strengthen internal linking",
          detail: `Add 2–3 targeted internal links per top-5 case study to lift ${REPORT_LANDING.path} page authority.`,
        },
      ],
    },
  },
  {
    status: "ready",
    visibility: 66.6,
    visibilityDelta: 2.4,
    citation: 24.2,
    citationDelta: 1.1,
    understanding: 75.5,
    understandingDelta: 0.8,
    rank: 10.1,
    rankDelta: -0.4,
    narrative: {
      summary:
        "This was a planning month. Initial baseline established for AI Understanding (75.5) after the first full schema audit. AI Recommendation share lifted modestly as new monitored prompts entered the rotation.",
      wins: [
        {
          title: "Baseline established across 60 prompts",
          detail:
            "Monitored prompt set expanded from 20 to 60. Stable measurement for the quarter onwards.",
        },
      ],
      risks: [
        {
          title: "Schema coverage at 71%",
          detail:
            "Significant gaps in Service schema and FAQPage schema across the marketing site.",
        },
      ],
      focus: [
        {
          title: "Quarterly schema rollout plan",
          detail:
            "Sequence: Organization → Service → FAQPage → HowTo → BreadcrumbList.",
        },
      ],
    },
  },
  {
    status: "ready",
    visibility: 64.2,
    visibilityDelta: 1.9,
    citation: 23.1,
    citationDelta: 1.4,
    understanding: 74.7,
    understandingDelta: 1.2,
    rank: 10.5,
    rankDelta: -0.2,
    narrative: {
      summary:
        "Launch month for AI Recommendation tracking. Hacker News launch drove 22 inbound mentions in 14 days, lifting Perplexity citation share 4.1 points.",
      wins: [
        {
          title: "Hacker News launch landed",
          detail:
            "Top-10 placement on HN for 6 hours drove 22 inbound mentions and 4.1 pt Perplexity citation share lift.",
        },
      ],
      risks: [
        {
          title: "Holiday traffic distortion",
          detail:
            "Search visibility numbers should be read with seasonality caveat.",
        },
      ],
      focus: [
        {
          title: "Next-quarter monitored prompt expansion",
          detail:
            "Triple monitored prompt count to lock in measurement for the year.",
        },
      ],
    },
  },
];

const SEEDS: Seed[] = PERIODS.map((period, i) => ({
  period,
  ...PERIOD_DATA[i],
}));

function buildKpis(s: Seed): ReportKpi[] {
  return [
    {
      label: "Visibility score",
      value: s.visibility,
      unit: "score",
      delta: s.visibilityDelta,
      trend: series(s.visibility, 12, s.visibility - 4, 6),
    },
    {
      label: "Citation share",
      value: s.citation,
      unit: "%",
      delta: s.citationDelta,
      trend: series(s.citation + 13, 12, s.citation - 3, 5),
    },
    {
      label: "AI Understanding",
      value: s.understanding,
      unit: "score",
      delta: s.understandingDelta,
      trend: series(s.understanding * 0.9, 12, s.understanding - 3, 4),
    },
    {
      label: "Avg. SERP rank",
      value: s.rank,
      unit: "count",
      delta: s.rankDelta,
      trend: series(s.rank * 1.7, 12, s.rank + 1.4, 2.2),
    },
  ];
}

function buildPillars(s: Seed): ReportPillarBlock[] {
  return [
    {
      pillar: "search",
      score: Math.round((s.visibility - 2.4) * 10) / 10,
      delta: Math.round((s.visibilityDelta - 0.8) * 10) / 10,
      highlights: s.narrative.wins
        .filter((w) => /snippet|rank|SERP|cannibal|search|crawl/i.test(w.title + w.detail))
        .map((w) => w.title)
        .slice(0, 2),
      risks: s.narrative.risks
        .filter((r) => /rank|snippet|cannibal|crawl|mobile|LCP|search/i.test(r.title + r.detail))
        .map((r) => r.title)
        .slice(0, 2),
    },
    {
      pillar: "ai",
      score: Math.round((50 + s.citation * 1.4) * 10) / 10,
      delta: Math.round(s.citationDelta * 10) / 10,
      highlights: s.narrative.wins
        .filter((w) => /citation|chatgpt|claude|gemini|perplexity|case study|launch|inbound|mention/i.test(w.title + w.detail))
        .map((w) => w.title)
        .slice(0, 2),
      risks: s.narrative.risks
        .filter((r) => /citation|chatgpt|claude|gemini|perplexity|review/i.test(r.title + r.detail))
        .map((r) => r.title)
        .slice(0, 2),
    },
    {
      pillar: "understanding",
      score: s.understanding,
      delta: s.understandingDelta,
      highlights: s.narrative.wins
        .filter((w) => /schema|llms|crawler|entity|HowTo|coverage/i.test(w.title + w.detail))
        .map((w) => w.title)
        .slice(0, 2),
      risks: s.narrative.risks
        .filter((r) => /schema|llms|crawler|entity|coverage/i.test(r.title + r.detail))
        .map((r) => r.title)
        .slice(0, 2),
    },
  ];
}

function buildCitations(s: Seed): { model: string; share: number; delta: number }[] {
  return [
    {
      model: "ChatGPT",
      share: Math.round((s.citation + 2.8) * 10) / 10,
      delta: Math.round((s.citationDelta + 0.6) * 10) / 10,
    },
    {
      model: "Claude",
      share: Math.round((s.citation + 0.4) * 10) / 10,
      delta: Math.round((s.citationDelta + 1.1) * 10) / 10,
    },
    {
      model: "Gemini",
      share: Math.round((s.citation - 4.7) * 10) / 10,
      delta: Math.round((s.citationDelta - 0.4) * 10) / 10,
    },
    {
      model: "Perplexity",
      share: Math.round((s.citation - 1.6) * 10) / 10,
      delta: Math.round((s.citationDelta - 0.7) * 10) / 10,
    },
  ];
}

const RECIPIENT_BASE = [
  COMPANY.user.email,
  ...COMPANY.team.filter((t) => t.role === "executive").map((t) => t.email),
];

export const REPORTS: Report[] = SEEDS.map((s, i) => {
  const generatedAt = periodEnd(s.period);
  const pages = 12 + (i % 3);
  return {
    id: `rep_${s.period.replace("-", "")}_${(i + 1).toString().padStart(2, "0")}`,
    period: s.period,
    title: `${periodLabel(s.period)} executive report`,
    subtitle: `${ORG} · AI visibility & search performance`,
    status: s.status,
    generatedAt,
    generatedById: MEMBERS[i % MEMBERS.length].id,
    pages,
    shareToken: SHARE_TOKENS[i % SHARE_TOKENS.length],
    shareEnabled: i < 3,
    shareViews: [42, 17, 8, 0, 0, 0][i] ?? 0,
    shareLastViewedAt:
      i < 3
        ? new Date(
            new Date(generatedAt).getTime() + (i + 2) * 86_400_000
          ).toISOString()
        : null,
    kpis: buildKpis(s),
    pillars: buildPillars(s),
    citationShare: buildCitations(s),
    rankSeries: dateSeries(s.period, series(s.rank * 0.9, 14, s.rank + 1.5, 2.4)),
    visibilitySeries: dateSeries(s.period, series(s.visibility * 0.7, 14, s.visibility - 4, 5.5)),
    narrative: s.narrative,
    recipients: i < 4 ? RECIPIENT_BASE : [COMPANY.user.email],
  };
});

export const REPORT_BY_TOKEN: Record<string, Report> = REPORTS.filter(
  (r) => r.shareEnabled
).reduce(
  (acc, r) => {
    acc[r.shareToken] = r;
    return acc;
  },
  {} as Record<string, Report>
);

export const PILLAR_LABEL: Record<ReportPillarBlock["pillar"], string> = {
  search: "Search Visibility",
  ai: "AI Recommendation",
  understanding: "AI Understanding",
};
