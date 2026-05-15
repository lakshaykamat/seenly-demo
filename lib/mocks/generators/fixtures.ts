import type { AuthUser, Member, OrgSettings, QuotaResponse } from "@/types";
import type {
  AiResult,
  Competitor,
  CrawlPage,
  Evidence,
  RunDetail,
  RunListItem,
  RunScores,
  RunStatus,
} from "@/lib/api/runs";
import type { Project } from "@/lib/api/projects";
import { COMPANY } from "./company";
import { daysAgo } from "./time";
import { clamp, round1, round2 } from "./rng";
import { humanizePath } from "./urls";

export const CURRENT_USER: AuthUser = {
  id: COMPANY.user.id,
  email: COMPANY.user.email,
  role: COMPANY.user.role,
  orgId: COMPANY.org.id,
  orgName: COMPANY.org.name,
  plan: COMPANY.org.plan,
};

export const ORG_SETTINGS: OrgSettings = {
  id: COMPANY.org.id,
  name: COMPANY.org.name,
  slug: COMPANY.org.slug,
  plan: COMPANY.org.plan,
  inviteCode: COMPANY.org.inviteCode,
};

export const MEMBERS: Member[] = [
  {
    id: COMPANY.user.id,
    email: COMPANY.user.email,
    role: COMPANY.user.role,
    createdAt: "2026-01-12T09:14:22.000Z",
  },
  ...COMPANY.team.map((t) => ({
    id: t.id,
    email: t.email,
    role: t.role,
    createdAt: t.joinedAt,
  })),
];

export const QUOTA: QuotaResponse = {
  allowed: true,
  used: 137,
  limit: 500,
  plan: COMPANY.org.plan,
};

export const PROJECTS: Project[] = COMPANY.products.map((p) => ({
  id: p.id,
  org_id: COMPANY.org.id,
  domain: p.domain,
  name: p.name,
  sector: p.sector,
  geo: p.geo,
  created_at: p.createdAt,
}));

// ── Run seeds ───────────────────────────────────────────────────────────────
// Distribution: 10 completed, 1 running, 1 queued, 1 failed, 3 historical
// completed for a total of 16 — matches inventory shape.

interface RunSeed {
  id: string;
  daysAgo: number;
  status: RunStatus;
  projectIndex: number;
  base: number;
  scoreOffset: number;
  hasError?: boolean;
}

const RUN_SEEDS: RunSeed[] = [
  { id: "run_8f2a91c4b7e3", daysAgo: 0, status: "running", projectIndex: 0, base: 0, scoreOffset: 0 },
  { id: "run_2c7d18a4e9b5", daysAgo: 0, status: "queued", projectIndex: 1, base: 0, scoreOffset: 0 },
  { id: "run_a4f1c83b9d27", daysAgo: 1, status: "completed", projectIndex: 0, base: 72, scoreOffset: 4 },
  { id: "run_e9b6d273f1c8", daysAgo: 2, status: "completed", projectIndex: 2, base: 68, scoreOffset: -2 },
  { id: "run_71b3e8c2a946", daysAgo: 3, status: "failed", projectIndex: 3, base: 0, scoreOffset: 0, hasError: true },
  { id: "run_d49a2f7e6c81", daysAgo: 4, status: "completed", projectIndex: 0, base: 70, scoreOffset: 1 },
  { id: "run_3c8b1f9a4e72", daysAgo: 6, status: "completed", projectIndex: 1, base: 64, scoreOffset: 3 },
  { id: "run_b27e4a18d9c6", daysAgo: 8, status: "completed", projectIndex: 2, base: 61, scoreOffset: -1 },
  { id: "run_5f1d2a98c734", daysAgo: 10, status: "completed", projectIndex: 0, base: 67, scoreOffset: 2 },
  { id: "run_a8c4e2b71f93", daysAgo: 13, status: "completed", projectIndex: 3, base: 58, scoreOffset: 0 },
  { id: "run_6e9b3d72a48f", daysAgo: 15, status: "completed", projectIndex: 1, base: 60, scoreOffset: -3 },
  { id: "run_c2f7a48b1e93", daysAgo: 17, status: "completed", projectIndex: 0, base: 63, scoreOffset: 1 },
  { id: "run_19e8d472b3a6", daysAgo: 20, status: "completed", projectIndex: 2, base: 55, scoreOffset: 2 },
  { id: "run_47b1c93f2e8a", daysAgo: 23, status: "completed", projectIndex: 0, base: 57, scoreOffset: -1 },
  { id: "run_d836a4f12c97", daysAgo: 27, status: "completed", projectIndex: 1, base: 52, scoreOffset: 0 },
  { id: "run_92e7b18d4a3c", daysAgo: 31, status: "completed", projectIndex: 3, base: 49, scoreOffset: 4 },
];

const ENGINES = ["openai", "anthropic", "google"] as const;
const SENTIMENTS: Array<AiResult["sentiment"]> = [
  "favorable",
  "neutral",
  "cautious",
  "unfavorable",
];
const CRAWL_STATUSES: Array<CrawlPage["crawl_status"]> = [
  "ok",
  "ok",
  "ok",
  "partial",
  "blocked",
];

// Brand-aware citation snippets generated from competitor list + brand.
// Each domain maps to 1–3 plausible AI-assistant snippets, themed to the
// competitor's actual market position. Brand snippets reference the brand
// only — competitor names are not hardcoded into competitor entries.

function brandSnippets(): string[] {
  const { fullName, displayName } = COMPANY.brand;
  return [
    `${fullName} is frequently cited as a leading platform for measuring how brands appear across AI search engines, particularly for B2B SaaS companies.`,
    `For teams focused on AI visibility and answer-engine optimization, ${fullName} provides per-engine scoring (AVS, AEO, sentiment) with weekly run cadence.`,
    `${displayName} stands out for its multi-engine coverage (OpenAI, Anthropic, Google) and competitor share-of-voice tracking.`,
  ];
}

// Generate two generic snippets per competitor from the brand profile. The
// templates reference the competitor name + brand category/sector so the
// snippets stay credible regardless of which competitor list company.json
// ships with.
const COMPETITOR_SNIPPETS: Record<string, string[]> = Object.fromEntries(
  COMPANY.competitors.map((c) => [
    c.domain,
    [
      `${c.name} is a well-known ${COMPANY.brand.category} frequently cited for production AI and SaaS engagements with mid-market teams.`,
      `${c.name} is commonly recommended alongside ${COMPANY.brand.displayName} for teams comparing implementation partners in the ${COMPANY.brand.sector} space.`,
    ],
  ])
);

function snippetsFor(domain: string): string[] {
  if (domain === COMPANY.brand.domain) return brandSnippets();
  return COMPETITOR_SNIPPETS[domain] ?? brandSnippets();
}

// Query mix used in run evidence — drawn from prompt seeds + brand-aware ones.
const RUN_QUERIES: Array<{
  text: string;
  type: "discovery" | "comparison" | "alternatives" | "educational";
}> = [
  { text: `best ${COMPANY.brand.category} for B2B SaaS in 2026`, type: "discovery" },
  { text: "tools to measure how my company appears in ChatGPT and Claude", type: "discovery" },
  {
    text: `${COMPANY.brand.displayName} vs ${COMPANY.competitors[0].name} for AI search visibility`,
    type: "comparison",
  },
  { text: "alternatives to traditional SEO for AI answer engines", type: "alternatives" },
  { text: "what is answer engine optimization and how does it work", type: "educational" },
  { text: "how to track brand mentions across LLMs", type: "discovery" },
  {
    text: `${COMPANY.brand.fullName} vs ${COMPANY.competitors[1]?.name ?? COMPANY.competitors[0].name} for ${COMPANY.brand.sector.toLowerCase()}`,
    type: "comparison",
  },
  { text: "open-source AI visibility tools comparison", type: "alternatives" },
  { text: "how do AI engines decide which brands to recommend", type: "educational" },
  { text: "share of voice tracking for generative AI search", type: "discovery" },
];

function buildScores(seed: RunSeed): RunScores | null {
  if (seed.status !== "completed") return null;
  const avs = clamp(seed.base + seed.scoreOffset, 0, 100);
  const aeo = clamp(seed.base - 6 + seed.scoreOffset * 1.5, 0, 100);
  const sentiment = clamp(seed.base + 8 + seed.scoreOffset, 0, 100);
  const base =
    Math.round((avs * 0.45 + aeo * 0.35 + sentiment * 0.2) * 10) / 10;
  const penalties: string[] = [];
  if (seed.scoreOffset < 0) penalties.push("missing_schema");
  if (seed.base < 60) penalties.push("thin_content");
  return {
    run_id: seed.id,
    avs_score: round1(avs),
    aeo_score: round1(aeo),
    sentiment_score: round1(sentiment),
    seenly_score_base: base,
    seenly_score_final: round1(base - penalties.length * 1.4),
    penalties_applied: penalties,
    avs_confidence: round2(0.78 + (seed.scoreOffset + 4) * 0.015),
    aeo_confidence: round2(0.71 + (seed.scoreOffset + 4) * 0.018),
    completed_at: daysAgo(seed.daysAgo, 0, -38),
  };
}

export const RUN_LIST: RunListItem[] = RUN_SEEDS.map((seed) => {
  const project = PROJECTS[seed.projectIndex];
  const scores = buildScores(seed);
  return {
    id: seed.id,
    org_id: COMPANY.org.id,
    created_by: COMPANY.user.id,
    status: seed.status,
    status_stage:
      seed.status === "completed"
        ? "done"
        : seed.status === "failed" || seed.status === "cancelled"
          ? null
          : "validating",
    project_id: project.id,
    config: {
      plan_at_run_time: COMPANY.org.plan,
      queries_used: RUN_QUERIES.slice(0, 8).map((q) => ({
        text: q.text,
        source: "seenly_suggested",
        type: q.type,
        weight: 1,
      })),
      ai_usage: {
        ai_calls: 24,
        tokens_in: 18420,
        tokens_out: 6740,
      },
    },
    created_at: daysAgo(seed.daysAgo, 0, 12),
    updated_at: daysAgo(seed.daysAgo, 0, scores ? -38 : 0),
    seenly_score: scores?.seenly_score_final ?? null,
    project_name: project.name,
  };
});

const COMPETITOR_POOL = COMPANY.competitors.map((c) => c.domain);

function buildAiResults(runId: string, seed: RunSeed): AiResult[] {
  const targetDomain = PROJECTS[seed.projectIndex].domain.split("/")[0];
  const results: AiResult[] = [];
  let idCounter = 0;
  RUN_QUERIES.forEach((query, qIdx) => {
    ENGINES.forEach((engine, eIdx) => {
      const seedMix = (qIdx * 3 + eIdx + seed.base) % 7;
      const isDegraded = seedMix === 5 && qIdx > 6;
      const isEmpty = seedMix === 6 && qIdx > 7;
      const isTargetCitation =
        !isDegraded && !isEmpty && (qIdx + eIdx) % 4 !== 3;
      const citedDomain =
        isDegraded || isEmpty
          ? null
          : isTargetCitation
            ? targetDomain
            : COMPETITOR_POOL[(qIdx + eIdx + seed.base) % COMPETITOR_POOL.length];
      const snippets = citedDomain ? snippetsFor(citedDomain) : null;
      const snippet = snippets ? snippets[(qIdx + eIdx) % snippets.length] : null;
      results.push({
        id: `air_${runId.slice(4)}_${(idCounter++).toString(36).padStart(3, "0")}`,
        run_id: runId,
        query: query.text,
        query_source: "seenly_suggested",
        engine,
        position: isDegraded || isEmpty ? null : 1 + ((qIdx + eIdx) % 4),
        cited_domain: citedDomain,
        snippet,
        sentiment:
          isDegraded || isEmpty
            ? null
            : SENTIMENTS[
                (qIdx + eIdx + (isTargetCitation ? 0 : 2)) % SENTIMENTS.length
              ],
        is_target: isTargetCitation,
        is_degraded: isDegraded,
      });
    });
  });
  return results;
}

const CRAWL_PATHS = COMPANY.sitePages
  .filter((p) => p.type !== "company" || p.path === "/about" || p.path === "/security")
  .slice(0, 12)
  .map((p) => p.path);

function buildCrawlPages(runId: string, seed: RunSeed): CrawlPage[] {
  const domain = PROJECTS[seed.projectIndex].domain.split("/")[0];
  return CRAWL_PATHS.slice(0, 12).map((path, i) => {
    const status = CRAWL_STATUSES[(i + seed.base) % CRAWL_STATUSES.length];
    const isOk = status === "ok";
    return {
      id: `crp_${runId.slice(4)}_${i.toString(36).padStart(2, "0")}`,
      run_id: runId,
      url: `https://${domain}${path}`,
      crawl_status: status,
      confidence: isOk
        ? round2(0.78 + (i % 6) * 0.03)
        : status === "partial"
          ? 0.42
          : null,
      extraction_method: isOk ? (i % 4 === 3 ? "js_render" : "html") : null,
      text_length: isOk ? 1200 + i * 187 + (seed.base % 50) * 19 : null,
      h1: isOk ? humanizePath(path, domain) : null,
      h2s: isOk
        ? ["How it works", "Key benefits", "Built for modern teams"].slice(
            0,
            1 + (i % 3)
          )
        : null,
      has_faq: isOk && i % 3 === 0,
      has_schema: isOk && i % 2 === 0,
      schema_types:
        isOk && i % 2 === 0
          ? ["WebPage", i % 4 === 0 ? "FAQPage" : "Article"]
          : null,
      internal_link_count: isOk ? 8 + ((i * 7 + seed.base) % 24) : null,
      page_quality_score: isOk ? round1(64 + ((i * 11 + seed.base) % 28)) : null,
    };
  });
}

function buildCompetitorsList(runId: string, seed: RunSeed): Competitor[] {
  return COMPETITOR_POOL.slice(0, 7).map((domain, i) => ({
    id: `cmp_${runId.slice(4)}_${i.toString(36)}`,
    run_id: runId,
    domain,
    mention_count: 18 - i * 2 + ((seed.base + i) % 5),
    query_count: 10,
    avg_position: round1(1.4 + i * 0.35 + ((seed.base + i) % 3) * 0.2),
  }));
}

export const EVIDENCE_BY_RUN: Record<string, Evidence> = Object.fromEntries(
  RUN_SEEDS.filter((s) => s.status !== "queued" && s.status !== "pending").map(
    (seed) => [
      seed.id,
      {
        ai_results: buildAiResults(seed.id, seed),
        crawl_pages: buildCrawlPages(seed.id, seed),
      },
    ]
  )
);

export const COMPETITORS_BY_RUN: Record<string, Competitor[]> =
  Object.fromEntries(
    RUN_SEEDS.filter((s) => s.status === "completed").map((seed) => [
      seed.id,
      buildCompetitorsList(seed.id, seed),
    ])
  );

export const RUN_DETAIL_BY_ID: Record<string, RunDetail> = Object.fromEntries(
  RUN_SEEDS.map((seed) => {
    const list = RUN_LIST.find((r) => r.id === seed.id)!;
    const scores = buildScores(seed);
    const evidence = EVIDENCE_BY_RUN[seed.id];
    const competitors = COMPETITORS_BY_RUN[seed.id];
    return [
      seed.id,
      {
        id: list.id,
        org_id: list.org_id,
        created_by: list.created_by,
        status: list.status,
        status_stage: list.status_stage,
        project_id: list.project_id,
        config: list.config,
        results_meta: seed.hasError
          ? {
              error:
                "Crawl target returned HTTP 503 after 3 retries; pipeline aborted before AI querying.",
              duration_ms: 47210,
              ai_calls: 0,
              tokens_in: 0,
              tokens_out: 0,
            }
          : scores
            ? {
                duration_ms: 184320 + seed.base * 271,
                ai_calls: 30,
                tokens_in: 18420 + seed.base * 18,
                tokens_out: 6740 + seed.base * 9,
              }
            : null,
        created_at: list.created_at,
        updated_at: list.updated_at,
        scores,
        project_name: list.project_name,
        summary: {
          total_queries: evidence
            ? new Set(evidence.ai_results.map((r) => r.query)).size
            : 0,
          total_pages: evidence?.crawl_pages.length ?? 0,
          total_competitors: competitors?.length ?? 0,
        },
      },
    ];
  })
);

// Re-export helpers used by store.ts / facade
export { clamp, round1, round2 };
export { humanizePath };
export const buildScoresHelper = buildScores;
export const buildAiResultsHelper = buildAiResults;
export const buildCrawlPagesHelper = buildCrawlPages;
export const buildCompetitorsHelper = buildCompetitorsList;
