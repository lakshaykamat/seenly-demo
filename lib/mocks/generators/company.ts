import companyJson from "../data/company.json";

export interface CompanyOrg {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "growth" | "enterprise";
  inviteCode: string;
  invitePrefix: string;
}

export interface CompanyUser {
  id: string;
  email: string;
  role: "admin" | "analyst" | "executive";
}

export interface CompanyTeamMember {
  id: string;
  email: string;
  role: "admin" | "analyst" | "executive";
  joinedAt: string;
}

export interface CompanyBrand {
  domain: string;
  displayName: string;
  fullName: string;
  tagline: string;
  sector: string;
  geo: string;
  category: string;
  slackWorkspace: string;
  slackChannel: string;
}

export interface CompanyProduct {
  id: string;
  name: string;
  domain: string;
  sector: string;
  geo: string;
  createdAt: string;
}

export interface CompanyCompetitor {
  domain: string;
  name: string;
  isPrimary: boolean;
  addedDaysAgo: number;
  alertOnDrop: boolean;
  note: string | null;
}

export interface CompanyPricing {
  starter: number;
  growth: number;
  enterprise: number;
  currency: string;
}

export interface CompanySitePage {
  path: string;
  title: string;
  type: "landing" | "product" | "blog" | "docs" | "pricing" | "customers" | "company";
  schemaCoverage: number;
  schemaTypes: string[];
  missing: string[];
  semantic: number;
  entity: number;
  llmsTxt?: "ok" | "warning" | "critical";
  robotsTxt?: "ok" | "warning" | "critical";
  blockedCrawlers?: string[];
  partialCrawlers?: string[];
}

export interface CompanyKeywordSeed {
  keyword: string;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  volume: number;
  difficulty: number;
  cpc: number;
  start: number;
  drift: number;
  urlPath: string | null;
  urlHostKey?: string;
  branded?: boolean;
  features: string[];
  owned: string[];
  cannibalized?: boolean;
  competitorBases: Record<string, number | null>;
}

export interface CompanyPromptSeed {
  set: "Discovery" | "Comparison" | "Educational" | "Bottom-funnel";
  text: string;
  weight: number;
}

export interface CompanyEntityCloud {
  entity: string;
  count: number;
  growth: number;
}

export interface CompanyData {
  org: CompanyOrg;
  user: CompanyUser;
  team: CompanyTeamMember[];
  brand: CompanyBrand;
  products: CompanyProduct[];
  competitors: CompanyCompetitor[];
  pricing: CompanyPricing;
  sitePages: CompanySitePage[];
  keywordSeeds: CompanyKeywordSeed[];
  promptSeeds: CompanyPromptSeed[];
  entityCloud: CompanyEntityCloud[];
  secondaryHost: string;
  todayIso: string;
  rngSeed: number;
}

export const COMPANY: CompanyData = companyJson as CompanyData;

export function primaryCompetitor(): CompanyCompetitor {
  return COMPANY.competitors.find((c) => c.isPrimary) ?? COMPANY.competitors[0];
}

export function competitorByIndex(i: number): CompanyCompetitor {
  return COMPANY.competitors[i % COMPANY.competitors.length];
}

export function pageByPath(path: string): CompanySitePage | undefined {
  return COMPANY.sitePages.find((p) => p.path === path);
}

export function pricingUrl(): string {
  return `https://${COMPANY.brand.domain}/pricing`;
}

/** Replace brand/competitor/path tokens in a template string. */
export function applyTokens(template: string): string {
  const primary = primaryCompetitor();
  const secondary = COMPANY.competitors[1] ?? primary;
  const tertiary = COMPANY.competitors[2] ?? primary;
  return template
    .replace(/\{category\}/g, COMPANY.brand.category)
    .replace(/\{brand\.full\}/g, COMPANY.brand.fullName)
    .replace(/\{brand\.display\}/g, COMPANY.brand.displayName)
    .replace(/\{brand\.domain\}/g, COMPANY.brand.domain)
    .replace(/\{competitor:primary\.name\}/g, primary.name)
    .replace(/\{competitor:primary\.domain\}/g, primary.domain)
    .replace(/\{competitor:1\.name\}/g, secondary.name)
    .replace(/\{competitor:1\.domain\}/g, secondary.domain)
    .replace(/\{competitor:2\.name\}/g, tertiary.name)
    .replace(/\{competitor:2\.domain\}/g, tertiary.domain);
}
