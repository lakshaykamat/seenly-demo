import { daysAgo } from "./time";
import { COMPANY } from "./company";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertCategory =
  | "rank_drop"
  | "citation_drop"
  | "competitor_mention"
  | "schema_regression"
  | "crawl_failure"
  | "share_of_voice";
export type AlertChannel = "email" | "in_app" | "slack" | "webhook";

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  threshold: {
    metric: string;
    operator: ">" | "<" | ">=" | "<=";
    value: number;
    unit: string;
  };
  scope: string;
  channels: AlertChannel[];
  enabled: boolean;
  muted: boolean;
  mutedUntil: string | null;
  createdAt: string;
  lastFiredAt: string | null;
  fireCount30d: number;
}

const watchlistCount = COMPANY.competitors.filter((c) => c.addedDaysAgo > 0).length;

export const ALERT_RULES: AlertRule[] = [
  {
    id: "alr_001",
    name: "Rank drop on tracked keywords",
    description: "Triggers when any tracked keyword falls 5+ positions in 24h.",
    category: "rank_drop",
    severity: "critical",
    threshold: { metric: "rank_change", operator: ">=", value: 5, unit: "positions" },
    scope: "All projects · 28 keywords",
    channels: ["in_app", "email", "slack"],
    enabled: true,
    muted: false,
    mutedUntil: null,
    createdAt: daysAgo(74),
    lastFiredAt: daysAgo(1, 17),
    fireCount30d: 11,
  },
  {
    id: "alr_002",
    name: "Citation share drop on Claude",
    description:
      "Triggers when our citation share on Claude falls more than 3 points week-over-week.",
    category: "citation_drop",
    severity: "warning",
    threshold: { metric: "citation_share_wow", operator: "<=", value: -3, unit: "pts" },
    scope: "Claude · all monitored prompts",
    channels: ["in_app", "email"],
    enabled: true,
    muted: false,
    mutedUntil: null,
    createdAt: daysAgo(58),
    lastFiredAt: daysAgo(42, 9),
    fireCount30d: 0,
  },
  {
    id: "alr_003",
    name: "New competitor mention",
    description:
      "Triggers when a watchlist competitor is cited on a prompt where we are not.",
    category: "competitor_mention",
    severity: "info",
    threshold: { metric: "competitor_first_cite", operator: ">=", value: 1, unit: "events" },
    scope: `Watchlist · ${watchlistCount} competitors`,
    channels: ["in_app", "slack"],
    enabled: true,
    muted: true,
    // Muted for 3 more days — team is shipping a comparison page and
    // doesn't want noise until it lands.
    mutedUntil: daysAgo(-3),
    createdAt: daysAgo(41),
    lastFiredAt: daysAgo(0, 4),
    fireCount30d: 17,
  },
  {
    id: "alr_004",
    name: "Schema coverage regression",
    description: "Triggers when schema coverage on tracked pages drops below 80%.",
    category: "schema_regression",
    severity: "warning",
    threshold: { metric: "schema_coverage", operator: "<", value: 80, unit: "%" },
    scope: "Marketing surfaces · 24 pages",
    channels: ["in_app", "email"],
    enabled: true,
    muted: false,
    mutedUntil: null,
    createdAt: daysAgo(29),
    lastFiredAt: daysAgo(4, 22),
    fireCount30d: 3,
  },
  {
    id: "alr_005",
    name: "AI crawler 5xx surge",
    description:
      "Triggers when GPTBot / ClaudeBot / PerplexityBot encounter 5xx responses.",
    category: "crawl_failure",
    severity: "critical",
    threshold: { metric: "ai_crawler_5xx", operator: ">=", value: 10, unit: "errors/hr" },
    scope: "All AI user-agents",
    channels: ["in_app", "email", "slack", "webhook"],
    enabled: false,
    muted: false,
    mutedUntil: null,
    createdAt: daysAgo(22),
    lastFiredAt: daysAgo(19, 2),
    fireCount30d: 1,
  },
  {
    id: "alr_006",
    name: "Share of voice swing",
    description:
      "Triggers when share of voice changes more than 4 points week-over-week.",
    category: "share_of_voice",
    severity: "info",
    threshold: { metric: "sov_change_wow", operator: ">=", value: 4, unit: "pts" },
    scope: "All keyword groups",
    channels: ["in_app"],
    enabled: false,
    muted: false,
    mutedUntil: null,
    createdAt: daysAgo(16),
    lastFiredAt: null,
    fireCount30d: 0,
  },
  {
    id: "alr_007",
    name: "Featured snippet loss",
    description: "Triggers when a featured snippet we own is taken by another domain.",
    category: "rank_drop",
    severity: "warning",
    threshold: { metric: "snippet_owner_change", operator: ">=", value: 1, unit: "events" },
    scope: "All snippets we own",
    channels: ["in_app", "slack"],
    enabled: true,
    muted: false,
    mutedUntil: null,
    createdAt: daysAgo(63),
    lastFiredAt: daysAgo(6, 11),
    fireCount30d: 5,
  },
];
