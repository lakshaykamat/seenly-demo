import type { AlertCategory, AlertSeverity } from "./alerts";
import { COMPANY, primaryCompetitor } from "./company";
import { hoursAgo } from "./time";

// Anchor page used by rank-drop and regression notifications. We pick the
// first non-root page from sitePages so the path is real, indexable, and
// has commercial intent.
const FEATURED_PAGE = COMPANY.sitePages.find((p) => p.path !== "/") ?? COMPANY.sitePages[0];
const FEATURED_KEYWORD = "best ai consulting firm for b2b saas";

export interface Notification {
  id: string;
  ruleId: string | null;
  category: AlertCategory | "system" | "report";
  severity: AlertSeverity;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  snoozedUntil: string | null;
  createdAt: string;
  evidence: { label: string; value: string }[];
}

const primary = primaryCompetitor();
const secondary = COMPANY.competitors[1] ?? primary;

export const NOTIFICATIONS_SEED: Notification[] = [
  {
    id: "ntf_001",
    ruleId: "alr_003",
    category: "competitor_mention",
    severity: "info",
    title: `${primary.name} cited first on a prompt where we're uncited`,
    body: `${primary.name} was the first cited source on 'best AI visibility platform for B2B SaaS in 2026' on Claude. ${COMPANY.brand.displayName} was not cited.`,
    href: "/visibility/ai",
    read: false,
    snoozedUntil: null,
    createdAt: hoursAgo(4),
    evidence: [
      { label: "Engine", value: "Claude" },
      { label: "Prompt", value: "best AI visibility platform for B2B SaaS in 2026" },
      { label: "Position", value: `${primary.name} cited #1` },
    ],
  },
  {
    id: "ntf_002",
    ruleId: "alr_001",
    category: "rank_drop",
    severity: "critical",
    title: `Mobile rank dropped 8 positions on ${FEATURED_PAGE.path}`,
    body: `Mobile rank for '${FEATURED_KEYWORD}' fell from #3 to #11 over the last 4 days. Desktop unchanged.`,
    href: "/visibility/search",
    read: false,
    snoozedUntil: null,
    createdAt: hoursAgo(20),
    evidence: [
      { label: "Keyword", value: FEATURED_KEYWORD },
      { label: "Page", value: FEATURED_PAGE.path },
      { label: "Device", value: "Mobile only" },
      { label: "Change", value: "#3 → #11" },
    ],
  },
  {
    id: "ntf_003",
    ruleId: null,
    category: "report",
    severity: "info",
    title: "May executive report ready",
    body: "The May 2026 executive report has been generated and is ready to share with your team.",
    href: "/reports",
    read: false,
    snoozedUntil: null,
    createdAt: hoursAgo(36),
    evidence: [
      { label: "Period", value: "May 2026" },
      { label: "Pages", value: "12" },
    ],
  },
  {
    id: "ntf_004",
    ruleId: "alr_002",
    category: "citation_drop",
    severity: "warning",
    title: "Citation share on Claude down 3.4 pts week-over-week",
    body: `${COMPANY.brand.displayName} citation share fell from 32.1% to 28.7% on Claude over the past 7 days. Bottom-funnel pricing prompts account for most of the drop.`,
    href: "/visibility/ai",
    read: true,
    snoozedUntil: null,
    createdAt: hoursAgo(54),
    evidence: [
      { label: "Engine", value: "Claude" },
      { label: "Window", value: "7d" },
      { label: "Change", value: "−3.4 pts" },
    ],
  },
  {
    id: "ntf_005",
    ruleId: "alr_007",
    category: "rank_drop",
    severity: "warning",
    title: "Featured snippet lost on 'answer engine optimization'",
    body: `${primary.name} took the featured snippet for 'answer engine optimization'. We held it for 41 days.`,
    href: "/recommendations",
    read: false,
    snoozedUntil: null,
    createdAt: hoursAgo(82),
    evidence: [
      { label: "Keyword", value: "answer engine optimization" },
      { label: "New owner", value: primary.domain },
      { label: "Held for", value: "41 days" },
    ],
  },
  {
    id: "ntf_006",
    ruleId: "alr_004",
    category: "schema_regression",
    severity: "warning",
    title: `Schema coverage dropped to 78% on ${FEATURED_PAGE.path}`,
    body: `FAQPage schema validation failed on ${FEATURED_PAGE.path} after the May 8 deploy. 6 of 8 questions no longer parse cleanly.`,
    href: "/visibility/understanding",
    read: true,
    snoozedUntil: null,
    createdAt: hoursAgo(110),
    evidence: [
      { label: "Page", value: FEATURED_PAGE.path },
      { label: "Schema type", value: "FAQPage" },
      { label: "Coverage", value: "78%" },
    ],
  },
  {
    id: "ntf_007",
    ruleId: "alr_003",
    category: "competitor_mention",
    severity: "info",
    title: `${secondary.name} cited on 4 / 7 comparison prompts`,
    body: `${secondary.name} is now cited as the alternative for 4 of 7 comparison prompts on Claude. We're co-cited on only 1.`,
    href: "/competitors",
    read: true,
    snoozedUntil: null,
    createdAt: hoursAgo(146),
    evidence: [
      { label: "Engine", value: "Claude" },
      { label: "Prompts", value: "4 / 7" },
      { label: "Competitor", value: secondary.name },
    ],
  },
  {
    id: "ntf_008",
    ruleId: null,
    category: "system",
    severity: "info",
    title: "Slack workspace connected",
    body: `Alerts will now be delivered to ${COMPANY.brand.slackChannel} in the ${COMPANY.brand.slackWorkspace} Slack workspace.`,
    href: "/settings",
    read: true,
    snoozedUntil: null,
    createdAt: hoursAgo(192),
    evidence: [
      { label: "Workspace", value: COMPANY.brand.slackWorkspace },
      { label: "Channel", value: COMPANY.brand.slackChannel },
    ],
  },
  {
    id: "ntf_009",
    ruleId: "alr_001",
    category: "rank_drop",
    severity: "warning",
    title: "Keyword 'AI Overview ranking factors 2026' slipped 4 positions",
    body: "Position dropped from #14 to #18 over 5 days. Search volume for the query continues to climb.",
    href: "/visibility/search",
    read: true,
    snoozedUntil: null,
    createdAt: hoursAgo(218),
    evidence: [
      { label: "Keyword", value: "AI Overview ranking factors 2026" },
      { label: "Change", value: "#14 → #18" },
      { label: "Volume trend", value: "+38% MoM" },
    ],
  },
  {
    id: "ntf_010",
    ruleId: null,
    category: "report",
    severity: "info",
    title: `April executive report shared with ${COMPANY.team[2]?.email.split("@")[0] ?? "team"}@`,
    body: "The April 2026 report's read-only link was viewed 12 times this week.",
    href: "/reports",
    read: true,
    snoozedUntil: null,
    createdAt: hoursAgo(264),
    evidence: [
      { label: "Period", value: "April 2026" },
      { label: "Views (7d)", value: "12" },
    ],
  },
];

export const SIMULATED_ALERT_TEMPLATES: Array<
  Omit<Notification, "id" | "createdAt" | "read" | "snoozedUntil">
> = [
  {
    ruleId: "alr_003",
    category: "competitor_mention",
    severity: "info",
    title: `${secondary.name} cited on a fresh comparison prompt`,
    body: `${secondary.name} just appeared as the first cited source for 'best AI visibility platform with SOC 2'. ${COMPANY.brand.displayName} was not cited.`,
    href: "/visibility/ai",
    evidence: [
      { label: "Engine", value: "ChatGPT" },
      { label: "Prompt", value: "best AI visibility platform with SOC 2" },
      { label: "Position", value: `${secondary.name} cited #1` },
    ],
  },
  {
    ruleId: "alr_002",
    category: "citation_drop",
    severity: "warning",
    title: "Citation share on Gemini down 2.6 pts in last 6h",
    body: "A run that completed 6 hours ago shows Gemini citation share has fallen 2.6 points across discovery prompts.",
    href: "/visibility/ai",
    evidence: [
      { label: "Engine", value: "Gemini" },
      { label: "Window", value: "6h" },
      { label: "Change", value: "−2.6 pts" },
    ],
  },
  {
    ruleId: "alr_001",
    category: "rank_drop",
    severity: "critical",
    title: "Rank drop on 'AI brand tracking software'",
    body: "Position fell from #5 to #12 in the last hour after Google rolled an AI Overview into the SERP.",
    href: "/visibility/search",
    evidence: [
      { label: "Keyword", value: "AI brand tracking software" },
      { label: "Change", value: "#5 → #12" },
      { label: "SERP feature", value: "AI Overview added" },
    ],
  },
];
