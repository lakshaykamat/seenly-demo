import { COMPANY } from "./company";

export interface OnboardingStage {
  key: string;
  startMs: number;
  label: (domain: string) => string;
  sublines: string[];
}

export interface EngineProbe {
  id: "gpt-4o" | "claude" | "gemini" | "perplexity";
  label: string;
  startMs: number;
  endMs: number;
  total: number;
  citedTotal: number;
}

export type ActivityKind = "engine" | "crawl" | "serp" | "cite" | "sys";
export type ActivityStatus =
  | "cited"
  | "no-mention"
  | "ok"
  | "warn"
  | "up"
  | "down";

export interface ActivityEvent {
  atMs: number;
  kind: ActivityKind;
  source: string;
  message: string;
  status?: ActivityStatus;
  meta?: string;
}

export const FIRST_RUN_STAGES: OnboardingStage[] = [
  {
    key: "validating",
    startMs: 0,
    label: () => `Validating domain`,
    sublines: [
      "Resolving DNS and SSL",
      "Checking robots.txt",
      "Reading sitemap.xml",
    ],
  },
  {
    key: "discovering_pages",
    startMs: 1500,
    label: () => `Discovering pages`,
    sublines: [
      "Mapping primary navigation",
      "Indexing product surfaces",
      "Detecting documentation hub",
      "Locating pricing and FAQ",
    ],
  },
  {
    key: "fetching_serp",
    startMs: 4500,
    label: () => "Fetching SERP results",
    sublines: [
      "Pulling Google US results",
      "Detecting featured snippets",
      "Reading People Also Ask",
      "Identifying AI Overviews",
    ],
  },
  {
    key: "crawling_pages",
    startMs: 9500,
    label: () => "Crawling pages",
    sublines: [
      "Parsing JSON-LD blocks",
      "Auditing heading hierarchy",
      "Checking internal link density",
      "Measuring page quality signals",
      "Verifying canonical tags",
    ],
  },
  {
    key: "probing_engines",
    startMs: 16500,
    label: () => "Probing AI engines",
    sublines: [
      "ChatGPT, best in category prompts",
      "Claude, comparison prompts",
      "Gemini, buyer intent prompts",
      "Perplexity, citation extraction",
      "Tallying citation share",
    ],
  },
  {
    key: "analyzing_citations",
    startMs: 24500,
    label: () => "Extracting citations",
    sublines: [
      "Parsing answer attributions",
      "Resolving competitor mentions",
      "Cross-checking source URLs",
    ],
  },
  {
    key: "scoring",
    startMs: 27000,
    label: () => "Computing scores",
    sublines: [
      "Weighting answer visibility",
      "Calibrating engine optimization",
      "Scoring sentiment",
      "Applying penalty rules",
    ],
  },
  {
    key: "building_workspace",
    startMs: 28500,
    label: () => "Building workspace",
    sublines: [
      "Seeding 23 recommendations",
      "Wiring 7 alert rules",
      "Cross-linking evidence",
    ],
  },
  {
    key: "done",
    startMs: 30000,
    label: () => "Ready. Opening workspace",
    sublines: ["Opening your workspace"],
  },
];

export const ENGINE_PROBES: EngineProbe[] = [
  { id: "gpt-4o", label: "gpt-4o", startMs: 16500, endMs: 22800, total: 18, citedTotal: 12 },
  { id: "claude", label: "claude-sonnet-4.6", startMs: 17400, endMs: 23600, total: 18, citedTotal: 9 },
  { id: "gemini", label: "gemini-2.5-pro", startMs: 18300, endMs: 24100, total: 18, citedTotal: 7 },
  { id: "perplexity", label: "perplexity", startMs: 19400, endMs: 24500, total: 18, citedTotal: 5 },
];

export interface EngineState {
  state: "queued" | "active" | "done";
  asked: number;
  cited: number;
}

export function getEngineState(
  probe: EngineProbe,
  elapsedMs: number
): EngineState {
  if (elapsedMs < probe.startMs) {
    return { state: "queued", asked: 0, cited: 0 };
  }
  const span = probe.endMs - probe.startMs;
  const t = Math.min(1, (elapsedMs - probe.startMs) / span);
  const asked = Math.min(probe.total, Math.floor(t * probe.total));
  const cited = Math.min(
    probe.citedTotal,
    Math.round((asked / probe.total) * probe.citedTotal)
  );
  return { state: t < 1 ? "active" : "done", asked, cited };
}

export const FIRST_RUN_ACTIVITY: ActivityEvent[] = [
  { atMs: 200, kind: "sys", source: "dns", message: "A record resolved · 76.76.21.21" },
  { atMs: 500, kind: "sys", source: "ssl", message: "TLS 1.3 · valid · Let's Encrypt" },
  { atMs: 900, kind: "sys", source: "robots", message: "robots.txt fetched · 412 bytes" },
  { atMs: 1300, kind: "sys", source: "sitemap", message: "sitemap.xml parsed · 12 urls" },

  { atMs: 1900, kind: "crawl", source: "/", message: "homepage indexed" },
  { atMs: 2300, kind: "crawl", source: "/pricing", message: "pricing surface mapped" },
  { atMs: 2800, kind: "crawl", source: "/docs", message: "documentation hub detected" },
  { atMs: 3400, kind: "crawl", source: "/blog", message: "12 posts found in feed" },
  { atMs: 4000, kind: "crawl", source: "/customers", message: "case studies parsed" },

  { atMs: 4900, kind: "serp", source: '"deploy nextjs"', message: "rank 4", status: "up", meta: "+2" },
  { atMs: 5400, kind: "serp", source: '"ai era seo"', message: "rank 11", status: "up", meta: "+2" },
  { atMs: 5900, kind: "serp", source: '"vercel alternatives"', message: "rank 18", status: "down", meta: "−1" },
  { atMs: 6400, kind: "serp", source: '"modern web hosting"', message: "rank 22" },
  { atMs: 6900, kind: "serp", source: '"jamstack platforms"', message: "rank 7", status: "up", meta: "+3" },
  { atMs: 7500, kind: "serp", source: '"edge functions"', message: "rank 14" },
  { atMs: 8100, kind: "serp", source: '"static site hosting"', message: "rank 9", status: "up", meta: "+1" },
  { atMs: 8700, kind: "serp", source: '"react server components"', message: "rank 6" },

  { atMs: 9700, kind: "crawl", source: "/pricing", message: "JSON-LD: FAQ + Product", status: "ok" },
  { atMs: 10400, kind: "crawl", source: "/docs/quickstart", message: "1.2s · 312kb", status: "ok" },
  { atMs: 11200, kind: "crawl", source: "/blog/launch", message: "h1 ✓ meta ✓ json-ld missing", status: "warn" },
  { atMs: 12000, kind: "crawl", source: "/about", message: "Organization schema ✓", status: "ok" },
  { atMs: 12800, kind: "crawl", source: "/changelog", message: "Article schema ✓", status: "ok" },
  { atMs: 13600, kind: "crawl", source: "/customers", message: "no Review schema", status: "warn" },
  { atMs: 14400, kind: "crawl", source: "/integrations", message: "canonical ✓ og:image ✓", status: "ok" },
  { atMs: 15200, kind: "crawl", source: "/security", message: "noindex detected", status: "warn" },
  { atMs: 16000, kind: "crawl", source: "/contact", message: "all checks passed", status: "ok" },

  { atMs: 16800, kind: "engine", source: "gpt-4o", message: '"best dev tooling for early teams"', status: "cited" },
  { atMs: 17400, kind: "engine", source: "gpt-4o", message: '"fastest way to ship a saas"', status: "cited" },
  { atMs: 17900, kind: "engine", source: "claude", message: `"alternatives to ${COMPANY.competitors[0].domain.split(".")[0]}"`, status: "no-mention" },
  { atMs: 18500, kind: "engine", source: "gpt-4o", message: '"hosting for indie hackers"', status: "no-mention" },
  { atMs: 19000, kind: "engine", source: "claude", message: '"compare deployment platforms"', status: "cited" },
  { atMs: 19500, kind: "engine", source: "gemini", message: '"ai friendly hosting platforms"', status: "cited" },
  { atMs: 20100, kind: "engine", source: "gpt-4o", message: '"edge compute providers"', status: "cited" },
  { atMs: 20600, kind: "engine", source: "perplexity", message: '"who hosts notion clones"', status: "cited" },
  { atMs: 21200, kind: "engine", source: "gemini", message: '"best place to host a next.js app"', status: "cited" },
  { atMs: 21700, kind: "engine", source: "claude", message: '"serverless vs edge"', status: "no-mention" },
  { atMs: 22300, kind: "engine", source: "gpt-4o", message: '"deploying a remix app"', status: "cited" },
  { atMs: 22800, kind: "engine", source: "perplexity", message: '"top jamstack hosts 2026"', status: "no-mention" },
  { atMs: 23300, kind: "engine", source: "claude", message: '"production-grade ssr platforms"', status: "cited" },
  { atMs: 23800, kind: "engine", source: "gemini", message: '"low-latency hosting"', status: "cited" },
  { atMs: 24200, kind: "engine", source: "perplexity", message: '"serverless data platforms"', status: "cited" },

  { atMs: 24800, kind: "cite", source: "answers", message: "72 responses parsed" },
  { atMs: 25400, kind: "cite", source: "links", message: "33 source urls resolved" },
  { atMs: 26100, kind: "cite", source: "competitors", message: "8 competitors detected" },
  { atMs: 26700, kind: "cite", source: "share", message: "citation share 44%" },

  { atMs: 27200, kind: "sys", source: "score", message: "AVS 71.4 · AEO 76.1" },
  { atMs: 27800, kind: "sys", source: "score", message: "Rankly score 74.6" },

  { atMs: 28700, kind: "sys", source: "workspace", message: "seeded 23 recommendations" },
  { atMs: 29200, kind: "sys", source: "workspace", message: "wired 7 alert rules" },
  { atMs: 29700, kind: "sys", source: "ready", message: "opening dashboard…" },
];

const NEW_RUN_TOTAL_MS = 9000;

export const NEW_RUN_STAGES: OnboardingStage[] = (() => {
  const filtered = FIRST_RUN_STAGES.filter(
    (s) =>
      s.key !== "building_workspace" &&
      s.key !== "analyzing_citations" &&
      s.key !== "done" &&
      s.key !== "validating"
  ).map((s) => ({ ...s }));
  filtered.unshift({
    key: "validating",
    startMs: 0,
    label: (d) => `Re-validating ${d}`,
    sublines: ["Resolving DNS", "Checking robots.txt"],
  });
  filtered.push({
    key: "done",
    startMs: 0,
    label: () => "Run complete · refreshing scores",
    sublines: ["Opening run"],
  });
  const n = filtered.length;
  filtered.forEach((s, i) => {
    s.startMs = Math.round((i / (n - 1)) * NEW_RUN_TOTAL_MS);
  });
  return filtered;
})();

export const FIRST_RUN_TOTAL_MS =
  FIRST_RUN_STAGES[FIRST_RUN_STAGES.length - 1].startMs;
export const NEW_RUN_TOTAL_MS_VALUE = NEW_RUN_TOTAL_MS;
