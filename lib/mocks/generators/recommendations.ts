import { COMPANY, primaryCompetitor } from "./company";
import { daysAgo, daysFromNow } from "./time";
import { MEMBERS } from "./fixtures";

export type RecommendationPillar = "search" | "ai" | "understanding";
export type RecommendationStatus =
  | "open"
  | "in_progress"
  | "done"
  | "dismissed";
export type RecommendationEffort = "S" | "M" | "L";
export type RecommendationImpact = "low" | "medium" | "high";

export interface Recommendation {
  id: string;
  title: string;
  pillar: RecommendationPillar;
  status: RecommendationStatus;
  effort: RecommendationEffort;
  impact: RecommendationImpact;
  effortScore: number;
  impactScore: number;
  description: string;
  evidence: string;
  affected: string[];
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  source: string;
  tags: string[];
}

const ASSIGNEES = MEMBERS.map((m) => m.id);
const primary = primaryCompetitor();
const secondary = COMPANY.competitors[1] ?? primary;
const tertiary = COMPANY.competitors[2] ?? primary;

// Anchor pages for recommendations. We map abstract "proof page", "primary
// commercial page", and "headline case study" concepts onto the real
// sitePages so recommendations target paths that actually exist on the brand
// domain.
const LANDING = COMPANY.sitePages.find((p) => p.path === "/") ?? COMPANY.sitePages[0];
const ABOUT = COMPANY.sitePages.find((p) => p.path === "/about") ?? LANDING;
const CASE_INDEX = COMPANY.sitePages.find((p) => p.path === "/case-studies") ?? LANDING;
const CASE_STUDIES = COMPANY.sitePages.filter((p) => p.type === "customers" && p.path !== "/case-studies");
const HEADLINE_CASE = CASE_STUDIES[1] ?? CASE_STUDIES[0] ?? CASE_INDEX;
const SECONDARY_CASE = CASE_STUDIES[0] ?? HEADLINE_CASE;
const HEADLINE_CASE_NAME =
  HEADLINE_CASE.title.replace(/^Case Study\s*[—-]\s*/i, "").split("·")[0]?.trim() ??
  "Apparatus AI";
const slug = (d: string) => d.split(".")[0];

const SEED: Array<Omit<Recommendation, "id" | "createdAt" | "updatedAt">> = [
  {
    title: `Add FAQ schema to ${CASE_INDEX.path}`,
    pillar: "understanding",
    status: "open",
    effort: "S",
    impact: "high",
    effortScore: 2,
    impactScore: 9,
    description: `${CASE_INDEX.path} is the most frequently visited bottom-funnel surface but ships no FAQPage structured data. Adding 6–8 engagement FAQ entries (timelines, scope, deliverables, pricing range) would unlock rich results and increase eligibility for AI Overview citations.`,
    evidence: `AI Understanding run on May 14 flagged ${CASE_INDEX.path} as missing FAQPage schema; competing pages on ${tertiary.domain} and ${secondary.domain} both render FAQ rich results in Google for '${COMPANY.brand.category} pricing'.`,
    affected: [CASE_INDEX.path, HEADLINE_CASE.path],
    assigneeId: ASSIGNEES[1],
    dueAt: daysFromNow(5),
    source: "AI Understanding · 2026-05-14",
    tags: ["schema", "rich-results", "quick-win"],
  },
  {
    title: "Reclaim featured snippet for 'how to scope an ai project'",
    pillar: "search",
    status: "in_progress",
    effort: "M",
    impact: "high",
    effortScore: 5,
    impactScore: 9,
    description: `Our ${ABOUT.path} page ranks #4 but the featured snippet is held by ${primary.domain} with a 38-word answer. Tightening our intro answer to 42 words and reformatting list items would put us in contention.`,
    evidence: `Search Visibility detected snippet ownership shift from us → ${primary.domain} on May 6. We held the snippet for 41 days prior.`,
    affected: [ABOUT.path],
    assigneeId: ASSIGNEES[2],
    dueAt: daysFromNow(2),
    source: "Search Visibility · 2026-05-09",
    tags: ["featured-snippet", "content"],
  },
  {
    title: "Publish llms.txt with citation guidance",
    pillar: "understanding",
    status: "open",
    effort: "S",
    impact: "medium",
    effortScore: 2,
    impactScore: 6,
    description:
      "We don't currently serve /llms.txt. Adding a structured manifest pointing AI crawlers to our most citation-ready surfaces (case studies, services, about) lifts AI Understanding score and reduces hallucination risk.",
    evidence: `AI-crawler matrix shows GPTBot and ClaudeBot fetching low-value pages instead of ${CASE_INDEX.path} 4× more often than expected.`,
    affected: ["/llms.txt"],
    assigneeId: ASSIGNEES[0],
    dueAt: daysFromNow(7),
    source: "AI Understanding · 2026-05-12",
    tags: ["llms.txt", "crawlability"],
  },
  {
    title: `Win bottom-funnel pricing prompts on Claude`,
    pillar: "ai",
    status: "open",
    effort: "L",
    impact: "high",
    effortScore: 7,
    impactScore: 9,
    description: `Claude cites ${primary.domain} 3× more often than ${COMPANY.brand.displayName} for 'pricing for AI consulting engagements'. Adding a transparent engagement-tier page with structured pricing data (Strategy & Discovery from $${COMPANY.pricing.starter.toLocaleString()}, Implementation from $${COMPANY.pricing.growth.toLocaleString()}, Enterprise from $${COMPANY.pricing.enterprise.toLocaleString()}) would close the gap on Claude specifically.`,
    evidence:
      "Citation matrix shows 8 / 14 bottom-funnel prompts uncited on Claude. Claude tends to favor sources with explicit price tables in source markup.",
    affected: [CASE_INDEX.path, `/compare/${slug(primary.domain)}`, `/compare/${slug(tertiary.domain)}`],
    assigneeId: ASSIGNEES[3],
    dueAt: daysFromNow(14),
    source: "AI Recommendation · 2026-05-11",
    tags: ["claude", "pricing", "comparison"],
  },
  {
    title: `Resolve cannibalization on '${COMPANY.brand.category}'`,
    pillar: "search",
    status: "open",
    effort: "M",
    impact: "medium",
    effortScore: 4,
    impactScore: 7,
    description: `Three URLs target the same query: ${LANDING.path}, ${ABOUT.path}, and ${CASE_INDEX.path}. Pick ${LANDING.path} as canonical and consolidate the others via internal-link weighting + a single hero answer.`,
    evidence:
      "Search Visibility flagged 3 cannibalization signals on May 13. Average position oscillates between #2 and #11 depending on which URL Google selects.",
    affected: [LANDING.path, ABOUT.path, CASE_INDEX.path],
    assigneeId: ASSIGNEES[2],
    dueAt: daysFromNow(10),
    source: "Search Visibility · 2026-05-13",
    tags: ["cannibalization", "consolidation"],
  },
  {
    title: "Add structured HowTo schema to scoping guide",
    pillar: "understanding",
    status: "in_progress",
    effort: "S",
    impact: "medium",
    effortScore: 3,
    impactScore: 6,
    description: `${ABOUT.path} reads as a HowTo for 'how to scope an AI project' but ships no HowTo schema. AI Overviews tend to lift HowTo-marked pages into step-by-step answers.`,
    evidence:
      "Page audit shows 12 step headings + 1 ordered list — ideal HowTo candidate. Currently zero schema types declared for the scoping section.",
    affected: [ABOUT.path],
    assigneeId: ASSIGNEES[4],
    dueAt: daysFromNow(4),
    source: "AI Understanding · 2026-05-14",
    tags: ["schema", "howto"],
  },
  {
    title: "Negotiate brand citation in Perplexity comparison answers",
    pillar: "ai",
    status: "open",
    effort: "L",
    impact: "medium",
    effortScore: 8,
    impactScore: 6,
    description:
      "Perplexity tends to cite recent Clutch and G2 reviews. We have 5-star reviews but they're 9 months old. Refreshing the client-review program in Q2 would lift our Perplexity citation rate for 'best AI consulting firm' prompts.",
    evidence: `Perplexity cites ${COMPANY.brand.domain} on 6 / 14 prompts; cited competitors all have <90-day reviews on Clutch.`,
    affected: [`clutch.co/${COMPANY.brand.displayName.toLowerCase()}-technologies`, `g2.com/${COMPANY.brand.displayName.toLowerCase()}-technologies`],
    assigneeId: null,
    dueAt: daysFromNow(21),
    source: "AI Recommendation · 2026-05-08",
    tags: ["perplexity", "reviews", "growth"],
  },
  {
    title: "Add Organization schema with sameAs links",
    pillar: "understanding",
    status: "done",
    effort: "S",
    impact: "medium",
    effortScore: 2,
    impactScore: 5,
    description:
      "Shipped Organization schema across all marketing pages with sameAs links to LinkedIn, GitHub, YouTube, and Crunchbase. Improves entity resolution by AI crawlers.",
    evidence:
      "Entity recognition score moved from 0.71 to 0.84 in the May 12 understanding run.",
    affected: [LANDING.path, ABOUT.path, CASE_INDEX.path],
    assigneeId: ASSIGNEES[1],
    dueAt: daysAgo(2),
    source: "AI Understanding · 2026-05-04",
    tags: ["schema", "entity", "shipped"],
  },
  {
    title: `Fix mobile rank slip on '${COMPANY.brand.category}'`,
    pillar: "search",
    status: "open",
    effort: "M",
    impact: "high",
    effortScore: 5,
    impactScore: 8,
    description: `Mobile-only rank dropped from #3 to #11 between May 8 and May 12 while desktop held #4. Likely a Core Web Vitals regression on ${CASE_INDEX.path} (LCP at 3.4s mobile).`,
    evidence:
      "Search Visibility ran a device split on May 12 — mobile LCP regression correlates with the deploy on May 7.",
    affected: [CASE_INDEX.path],
    assigneeId: ASSIGNEES[2],
    dueAt: daysFromNow(3),
    source: "Search Visibility · 2026-05-12",
    tags: ["mobile", "core-web-vitals", "regression"],
  },
  {
    title: `Publish refreshed case study: ${HEADLINE_CASE_NAME} (forecasting outcomes)`,
    pillar: "ai",
    status: "in_progress",
    effort: "L",
    impact: "high",
    effortScore: 8,
    impactScore: 8,
    description: `${HEADLINE_CASE_NAME} agreed to be quoted with refreshed numbers. A long-form case study with concrete metrics (47% reduction in manual forecasting time, 12 pts citation share lift on industry prompts) would unlock citations for 'enterprise AI implementation partner' across all four engines.`,
    evidence: `0 / 4 engines cite us today for 'enterprise AI implementation partner with production track record'. Comparable competitor case studies are cited by ChatGPT and Claude.`,
    affected: [HEADLINE_CASE.path],
    assigneeId: ASSIGNEES[3],
    dueAt: daysFromNow(11),
    source: "AI Recommendation · 2026-05-10",
    tags: ["case-study", "enterprise"],
  },
  {
    title: "Compress hero image set across marketing pages",
    pillar: "understanding",
    status: "open",
    effort: "S",
    impact: "low",
    effortScore: 2,
    impactScore: 3,
    description: `Hero images on ${LANDING.path} and ${ABOUT.path} weigh 480KB each. AVIF conversion would cut payload by ~70% and improve crawl efficiency for AI agents that respect bandwidth budgets.`,
    evidence: `Page audit flagged 6 images >300KB. AI-crawler matrix shows partial extraction on ${LANDING.path} (likely related).`,
    affected: [LANDING.path, ABOUT.path],
    assigneeId: ASSIGNEES[4],
    dueAt: daysFromNow(6),
    source: "AI Understanding · 2026-05-13",
    tags: ["performance", "images"],
  },
  {
    title: "Author 'AI Overview ranking factors 2026' pillar piece",
    pillar: "search",
    status: "open",
    effort: "L",
    impact: "high",
    effortScore: 7,
    impactScore: 8,
    description:
      "We rank #14 for 'AI Overview ranking factors 2026' — a fast-growing query with high commercial intent. A 2,400-word pillar article with original data would put us in top-3 contention.",
    evidence: `Volume grew from 480 → 2,900 monthly searches in 90 days. ${primary.name} and ${secondary.name} both publish pillar pieces; ours is missing.`,
    affected: ["/insights/ai-overview-ranking-factors-2026"],
    assigneeId: null,
    dueAt: daysFromNow(18),
    source: "Search Visibility · 2026-05-07",
    tags: ["content", "pillar", "ai-overview"],
  },
  {
    title: "Submit /api endpoint manifest to ai.txt registry",
    pillar: "understanding",
    status: "dismissed",
    effort: "S",
    impact: "low",
    effortScore: 2,
    impactScore: 2,
    description:
      "ai.txt registries remain fragmented; effort-to-impact unfavorable until a major engine adopts a registry as canonical.",
    evidence:
      "Engine adoption of ai.txt < 8% as of May 2026. Revisit when GPTBot or ClaudeBot publishes guidance.",
    affected: ["ai.txt"],
    assigneeId: ASSIGNEES[0],
    dueAt: null,
    source: "AI Understanding · 2026-04-28",
    tags: ["ai.txt", "deferred"],
  },
  {
    title: `Publish competitor comparison: ${COMPANY.brand.displayName} vs ${secondary.name}`,
    pillar: "ai",
    status: "open",
    effort: "M",
    impact: "medium",
    effortScore: 5,
    impactScore: 6,
    description: `We have no published comparison page for /compare/${slug(secondary.domain)}. ${secondary.name} has shipped 3 relevant capabilities since Q4 2025. Publishing a current capability matrix with engagement pricing would surface us on direct-comparison prompts on Claude and Perplexity.`,
    evidence: `Citation matrix: ${secondary.name} is cited as the alternative for 4 / 7 comparison prompts on Claude — we're co-cited on only 1.`,
    affected: [`/compare/${slug(secondary.domain)}`],
    assigneeId: ASSIGNEES[1],
    dueAt: daysFromNow(9),
    source: "AI Recommendation · 2026-05-09",
    tags: ["comparison", slug(secondary.domain)],
  },
  {
    title: "Add canonical tag on /insights/api-runs",
    pillar: "search",
    status: "done",
    effort: "S",
    impact: "low",
    effortScore: 1,
    impactScore: 3,
    description:
      "Duplicate content with /api-docs/runs was demoting both URLs. Canonicalized /insights/api-runs as primary.",
    evidence:
      "Position recovered from #18 → #7 on 'runs api documentation' within 6 days of fix.",
    affected: ["/insights/api-runs", "/api-docs/runs"],
    assigneeId: ASSIGNEES[2],
    dueAt: daysAgo(4),
    source: "Search Visibility · 2026-04-30",
    tags: ["canonical", "shipped"],
  },
  {
    title: `Improve internal linking from ${CASE_INDEX.path} to ${ABOUT.path}`,
    pillar: "search",
    status: "open",
    effort: "M",
    impact: "medium",
    effortScore: 4,
    impactScore: 6,
    description: `Top 5 case study pages average only 0.6 contextual links to ${ABOUT.path}. Adding 2–3 targeted internal links per case study would lift ${ABOUT.path} page authority.`,
    evidence:
      "Page audit measures internal_link_count at 8–12 across case studies. Industry benchmark is 18–22.",
    affected: [`${CASE_INDEX.path}/*`],
    assigneeId: ASSIGNEES[4],
    dueAt: daysFromNow(8),
    source: "Search Visibility · 2026-05-10",
    tags: ["internal-links"],
  },
  {
    title: `Add entity disambiguation on ${ABOUT.path} (${COMPANY.brand.displayName} vs ${COMPANY.brand.displayName} Labs)`,
    pillar: "understanding",
    status: "in_progress",
    effort: "S",
    impact: "medium",
    effortScore: 3,
    impactScore: 5,
    description: `AI crawlers occasionally conflate ${COMPANY.brand.fullName} with ${COMPANY.brand.displayName} Labs (the research arm). Clarify entity relationship via Organization schema + parentOrganization edges.`,
    evidence: `Entity cloud shows two ${COMPANY.brand.displayName} nodes with overlap. Three citations on ChatGPT attributed quotes from labs.${COMPANY.brand.domain} to ${COMPANY.brand.domain}.`,
    affected: [ABOUT.path, `labs.${COMPANY.brand.domain}/about`],
    assigneeId: ASSIGNEES[1],
    dueAt: daysFromNow(5),
    source: "AI Understanding · 2026-05-11",
    tags: ["entity", "disambiguation"],
  },
  {
    title: "Run share-of-voice campaign for May client launch",
    pillar: "ai",
    status: "open",
    effort: "L",
    impact: "high",
    effortScore: 9,
    impactScore: 9,
    description:
      "Synchronize PR, client stories, and a Hacker News launch to drive 30+ inbound mentions in 14 days. Inbound citations are the single largest lever on Perplexity and Gemini.",
    evidence:
      "Historical: similar launches (Dec 2025) lifted citation share +6.2 pts over 21 days.",
    affected: [LANDING.path, "/launch/may-2026"],
    assigneeId: ASSIGNEES[3],
    dueAt: daysFromNow(17),
    source: "AI Recommendation · 2026-05-10",
    tags: ["launch", "pr", "share-of-voice"],
  },
  {
    title: "Refactor mobile nav for Largest Contentful Paint",
    pillar: "understanding",
    status: "open",
    effort: "M",
    impact: "medium",
    effortScore: 5,
    impactScore: 5,
    description: `Mobile nav JS bundle pushes LCP past 2.8s on ${CASE_INDEX.path}. Lazy-load secondary nav segments to recover ~600ms.`,
    evidence: `Page audit measures page_quality_score at 64 for ${CASE_INDEX.path} (mobile); desktop at 88.`,
    affected: [CASE_INDEX.path, ABOUT.path],
    assigneeId: ASSIGNEES[4],
    dueAt: daysFromNow(12),
    source: "AI Understanding · 2026-05-12",
    tags: ["performance", "mobile"],
  },
  {
    title: "Sponsor 'Brand mentions in LLMs' newsletter feature",
    pillar: "ai",
    status: "open",
    effort: "S",
    impact: "low",
    effortScore: 2,
    impactScore: 4,
    description:
      "Inbound mention from a high-authority newsletter (Lenny's Substack) would seed Perplexity and Gemini training-set candidacy with strong contextual signal.",
    evidence:
      "Negotiated sponsorship slot available for $4,800. Comparable sponsorships drove 2.1 pt citation share in past quarters.",
    affected: ["external"],
    assigneeId: null,
    dueAt: daysFromNow(20),
    source: "AI Recommendation · 2026-05-06",
    tags: ["sponsorship", "perplexity"],
  },
  {
    title: "Update meta titles to include current year",
    pillar: "search",
    status: "done",
    effort: "S",
    impact: "low",
    effortScore: 1,
    impactScore: 2,
    description: `Shipped year-aware <title> tags across ${ABOUT.path} and ${CASE_INDEX.path}. Modest CTR lift expected on commercial-intent queries.`,
    evidence:
      "A/B over 14 days showed +3.4% CTR for year-tagged titles on commercial keywords.",
    affected: [`${ABOUT.path}/*`, CASE_INDEX.path],
    assigneeId: ASSIGNEES[2],
    dueAt: daysAgo(6),
    source: "Search Visibility · 2026-04-22",
    tags: ["seo", "meta", "shipped"],
  },
  {
    title: "Plug missing alt text on client story images",
    pillar: "understanding",
    status: "in_progress",
    effort: "S",
    impact: "low",
    effortScore: 2,
    impactScore: 3,
    description: `11 hero images across ${CASE_INDEX.path}/* missing alt text. Reduces AI-crawler context for entity association.`,
    evidence: "Page audit flagged 11 missing alt attributes on May 13.",
    affected: [`${CASE_INDEX.path}/*`],
    assigneeId: ASSIGNEES[1],
    dueAt: daysFromNow(2),
    source: "AI Understanding · 2026-05-13",
    tags: ["accessibility", "alt-text"],
  },
  {
    title: "Win Gemini citations for 'open-source AI consulting partners'",
    pillar: "ai",
    status: "open",
    effort: "M",
    impact: "medium",
    effortScore: 6,
    impactScore: 6,
    description: `Gemini disproportionately favors open-source-aware sources. Publish a comparison piece that respectfully positions ${COMPANY.brand.displayName} alongside open-source-leaning consultancies.`,
    evidence: `Gemini cites ${COMPANY.brand.domain} 0 / 14 times on 'open-source AI consulting partners comparison'.`,
    affected: ["/insights/open-source-ai-consulting-partners"],
    assigneeId: ASSIGNEES[3],
    dueAt: daysFromNow(13),
    source: "AI Recommendation · 2026-05-07",
    tags: ["gemini", "open-source"],
  },
  {
    title: `Add JSON-LD Service schema to ${SECONDARY_CASE.path}`,
    pillar: "understanding",
    status: "open",
    effort: "S",
    impact: "medium",
    effortScore: 2,
    impactScore: 5,
    description: `${SECONDARY_CASE.path} is missing Service / CaseStudy schema breadth. Adding it would clarify ${COMPANY.brand.displayName}'s engagement surface for AI crawlers and Google's rich results.`,
    evidence: `Schema coverage matrix shows partial CaseStudy schema for ${SECONDARY_CASE.path} vs. 88% on ${LANDING.path}.`,
    affected: [SECONDARY_CASE.path],
    assigneeId: ASSIGNEES[0],
    dueAt: daysFromNow(4),
    source: "AI Understanding · 2026-05-13",
    tags: ["schema", "service"],
  },
  {
    title: "Sunset legacy /engagements-v1 redirect chain",
    pillar: "search",
    status: "open",
    effort: "S",
    impact: "low",
    effortScore: 2,
    impactScore: 3,
    description: `/engagements-v1 → /engagements-2025 → ${CASE_INDEX.path} creates a 3-hop redirect chain. Collapse to a single 301 to recover crawl budget and minor authority loss.`,
    evidence:
      "Search Visibility crawl flagged 14 inbound links still hitting the chain origin.",
    affected: ["/engagements-v1", "/engagements-2025"],
    assigneeId: ASSIGNEES[2],
    dueAt: daysFromNow(7),
    source: "Search Visibility · 2026-05-09",
    tags: ["redirects", "tech-seo"],
  },
];

export const RECOMMENDATIONS: Recommendation[] = SEED.map((s, i) => ({
  ...s,
  id: `rec_${(i + 1).toString().padStart(4, "0")}`,
  createdAt: daysAgo(3 + (i % 17), (i * 7) % 23),
  updatedAt: daysAgo((i % 9) + 1, (i * 11) % 19),
}));
