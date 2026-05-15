import { COMPANY } from "./company";
import { daysAgo } from "./time";

export type AuditSeverity = "critical" | "warning" | "info" | "ok";

export type AiCrawler =
  | "GPTBot"
  | "ClaudeBot"
  | "Google-Extended"
  | "PerplexityBot"
  | "CCBot";

export type CrawlerAccess = "allowed" | "blocked" | "partial";

export interface PageAuditRow {
  id: string;
  url: string;
  title: string;
  pageType:
    | "landing"
    | "product"
    | "blog"
    | "docs"
    | "pricing"
    | "customers"
    | "company";
  schemaCoverage: number;
  schemaTypes: string[];
  missingSchemaTypes: string[];
  semanticClarity: number;
  entityScore: number;
  llmsTxt: AuditSeverity;
  robotsTxt: AuditSeverity;
  crawlerAccess: Record<AiCrawler, CrawlerAccess>;
  findings: Array<{
    severity: AuditSeverity;
    title: string;
    detail: string;
  }>;
  lastChecked: string;
}

const ALL_CRAWLERS: AiCrawler[] = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
  "CCBot",
];

function buildCrawlerMatrix(
  blocked: AiCrawler[] = [],
  partial: AiCrawler[] = []
): Record<AiCrawler, CrawlerAccess> {
  return Object.fromEntries(
    ALL_CRAWLERS.map((c) => [
      c,
      blocked.includes(c)
        ? "blocked"
        : partial.includes(c)
          ? "partial"
          : "allowed",
    ])
  ) as Record<AiCrawler, CrawlerAccess>;
}

// Findings are generated per page based on its schema/access profile. Truth
// content (what's missing, what's strong) comes from the company.json site
// page entry; titles/descriptions are stable narrative patterns.

// Findings are derived from the page's type and missing-schema profile so
// the rules carry across any company.json swap. Path-specific cases were
// retired in favor of `pageType` and `page.missing` checks.
function findingsFor(page: typeof COMPANY.sitePages[number]): PageAuditRow["findings"] {
  const out: PageAuditRow["findings"] = [];

  // ── Strengths ────────────────────────────────────────────────────────────
  if (page.type === "landing" && page.schemaCoverage >= 80) {
    out.push({
      severity: "ok",
      title: "Organization schema present",
      detail: "Includes sameAs links to LinkedIn, X, GitHub, Crunchbase.",
    });
    if (page.missing.includes("BreadcrumbList")) {
      out.push({
        severity: "info",
        title: "Consider adding BreadcrumbList",
        detail:
          "Most enterprise SaaS landing pages add BreadcrumbList for AI overview eligibility.",
      });
    }
  }

  if (page.type === "company") {
    out.push({
      severity: "ok",
      title: "Organization schema linked across sub-brands",
      detail: `${COMPANY.brand.displayName} Labs and ${COMPANY.brand.displayName} Studio correctly referenced as subOrganization.`,
    });
  }

  // Headline case study earns a strong-findings block.
  const customerPages = COMPANY.sitePages.filter(
    (p) => p.type === "customers" && p.path !== "/case-studies"
  );
  const headlineCustomer = customerPages[1] ?? customerPages[0];
  if (page.type === "customers" && page.path === headlineCustomer?.path) {
    out.push({
      severity: "ok",
      title: "Review schema includes Reviewer Organization",
      detail: "Earns 'Recommended by' snippet in AI Overview.",
    });
    out.push({
      severity: "info",
      title: "Strong entity coverage",
      detail: `Recognized: ${COMPANY.brand.displayName}, case study client, AI integration, decision intelligence.`,
    });
  }

  // ── Weaknesses driven by `missing` ───────────────────────────────────────
  if (page.type === "customers" && page.missing.includes("Review")) {
    out.push({
      severity: "warning",
      title: "No customer review schema",
      detail:
        "Case study testimonials visible but no Review or AggregateRating entities found.",
    });
  }
  if (page.type === "customers" && page.missing.includes("Organization")) {
    out.push({
      severity: "warning",
      title: "Client Organization markup missing",
      detail:
        "AI assistants cite case studies more often when the client is declared as an Organization with sameAs links.",
    });
  }
  if (page.type === "customers" && page.missing.includes("VideoObject")) {
    out.push({
      severity: "info",
      title: "Embedded video lacks VideoObject markup",
      detail:
        "Adding VideoObject improves chances of video thumbnail surfacing in AI Overview.",
    });
  }
  if (page.type === "customers" && page.missing.includes("BreadcrumbList")) {
    out.push({
      severity: "info",
      title: "Add BreadcrumbList for case study sections",
      detail:
        "Helps AI assistants understand parent → child structure for follow-up answers.",
    });
  }
  if (page.type === "company" && page.missing.includes("BreadcrumbList")) {
    out.push({
      severity: "info",
      title: "BreadcrumbList missing on company page",
      detail:
        "AI Overviews benefit from explicit parent navigation context on team and company pages.",
    });
  }
  if (page.path === "/case-studies" && page.missing.includes("Organization")) {
    out.push({
      severity: "warning",
      title: "Case study index missing Organization markup",
      detail:
        "Adding Organization to the index page helps AI assistants attribute every listed case to the firm.",
    });
  }

  // llms.txt exclusions on bottom-funnel pages.
  if (
    (page.type === "customers" || page.type === "landing") &&
    page.llmsTxt === "warning"
  ) {
    out.push({
      severity: "warning",
      title: `llms.txt omits ${page.path}`,
      detail:
        "Path is explicitly excluded; AI assistants may answer from cached or competitor pages.",
    });
  }

  // Crawler-block escalation: blanket crawler blocks on any page.
  if ((page.blockedCrawlers?.length ?? 0) >= 3) {
    out.push({
      severity: "critical",
      title: "All major AI crawlers blocked",
      detail: `robots.txt blanket-disallows ${page.path} — three AI assistants will refuse to answer questions about ${COMPANY.brand.displayName}.`,
    });
  } else if (page.blockedCrawlers?.includes("CCBot")) {
    out.push({
      severity: "warning",
      title: "Aggressive crawler block",
      detail: `robots.txt disallows CCBot for ${page.path} — likely overly broad. Sentiment-aware buyers may miss this surface.`,
    });
  }

  return out;
}

export const PAGE_AUDITS: PageAuditRow[] = COMPANY.sitePages.map((page, i) => ({
  id: `pag_${(i + 1).toString(36).padStart(4, "0")}`,
  url: `https://${COMPANY.brand.domain}${page.path}`,
  title: page.title,
  pageType: page.type,
  schemaCoverage: page.schemaCoverage,
  schemaTypes: page.schemaTypes,
  missingSchemaTypes: page.missing,
  semanticClarity: page.semantic,
  entityScore: page.entity,
  llmsTxt: (page.llmsTxt ?? "ok") as AuditSeverity,
  robotsTxt: (page.robotsTxt ?? "ok") as AuditSeverity,
  crawlerAccess: buildCrawlerMatrix(
    (page.blockedCrawlers as AiCrawler[] | undefined) ?? [],
    (page.partialCrawlers as AiCrawler[] | undefined) ?? []
  ),
  findings: findingsFor(page),
  lastChecked: daysAgo(i % 4, (i * 3) % 24),
}));

export interface CrawlerMatrixSummary {
  crawler: AiCrawler;
  allowed: number;
  partial: number;
  blocked: number;
}

export const CRAWLER_MATRIX: CrawlerMatrixSummary[] = ALL_CRAWLERS.map((c) => {
  let allowed = 0;
  let partial = 0;
  let blocked = 0;
  PAGE_AUDITS.forEach((p) => {
    const v = p.crawlerAccess[c];
    if (v === "allowed") allowed++;
    else if (v === "partial") partial++;
    else blocked++;
  });
  return { crawler: c, allowed, partial, blocked };
});

export const SCHEMA_DISTRIBUTION = [
  { range: "0-40", count: PAGE_AUDITS.filter((p) => p.schemaCoverage < 40).length },
  {
    range: "40-60",
    count: PAGE_AUDITS.filter(
      (p) => p.schemaCoverage >= 40 && p.schemaCoverage < 60
    ).length,
  },
  {
    range: "60-75",
    count: PAGE_AUDITS.filter(
      (p) => p.schemaCoverage >= 60 && p.schemaCoverage < 75
    ).length,
  },
  {
    range: "75-90",
    count: PAGE_AUDITS.filter(
      (p) => p.schemaCoverage >= 75 && p.schemaCoverage < 90
    ).length,
  },
  {
    range: "90-100",
    count: PAGE_AUDITS.filter((p) => p.schemaCoverage >= 90).length,
  },
];

export interface UnderstandingSummary {
  averageSchemaCoverage: number;
  averageSemanticClarity: number;
  averageEntityScore: number;
  pagesWithCriticalFindings: number;
  pagesAuditing: number;
  llmsTxtPresent: boolean;
  robotsTxtHealth: AuditSeverity;
}

export const UNDERSTANDING_SUMMARY: UnderstandingSummary = {
  averageSchemaCoverage: Math.round(
    PAGE_AUDITS.reduce((s, p) => s + p.schemaCoverage, 0) / PAGE_AUDITS.length
  ),
  averageSemanticClarity: Math.round(
    PAGE_AUDITS.reduce((s, p) => s + p.semanticClarity, 0) / PAGE_AUDITS.length
  ),
  averageEntityScore: Math.round(
    PAGE_AUDITS.reduce((s, p) => s + p.entityScore, 0) / PAGE_AUDITS.length
  ),
  pagesWithCriticalFindings: PAGE_AUDITS.filter((p) =>
    p.findings.some((f) => f.severity === "critical")
  ).length,
  pagesAuditing: PAGE_AUDITS.length,
  llmsTxtPresent: true,
  robotsTxtHealth: "warning",
};

export const ENTITY_CLOUD: Array<{
  entity: string;
  count: number;
  growth: number;
}> = COMPANY.entityCloud;
