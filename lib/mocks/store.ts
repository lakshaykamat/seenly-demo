import type { Member, OrgSettings, QuotaResponse } from "@/types";
import type {
  Competitor,
  Evidence,
  RunDetail,
  RunListItem,
  RunStatus,
} from "@/lib/api/runs";
import type { Project } from "@/lib/api/projects";
import {
  COMPETITORS_BY_RUN,
  CURRENT_USER,
  EVIDENCE_BY_RUN,
  MEMBERS,
  ORG_SETTINGS,
  PROJECTS,
  QUOTA,
  RUN_DETAIL_BY_ID,
  RUN_LIST,
} from "./fixtures";
import { RECOMMENDATIONS, type Recommendation } from "./recommendations";
import { PROMPT_SETS, type PromptSet } from "./prompts";
import { WATCHLIST_SEED, type WatchlistEntry } from "./competitorsExt";
import { MONITORED_PROMPTS, type MonitoredPrompt } from "./aiCitations";
import { REPORTS, REPORT_BY_TOKEN, type Report } from "./reports";
import {
  ALERT_RULES,
  type AlertRule,
  type AlertChannel,
} from "./alerts";
import {
  NOTIFICATIONS_SEED,
  SIMULATED_ALERT_TEMPLATES,
  type Notification,
} from "./notifications";
import { NEW_RUN_STAGES, NEW_RUN_TOTAL_MS_VALUE } from "./onboarding-stages";
import { COMPANY } from "./generators/company";

interface Store {
  projects: Project[];
  runs: RunListItem[];
  runDetails: Record<string, RunDetail>;
  evidence: Record<string, Evidence>;
  competitors: Record<string, Competitor[]>;
  members: Member[];
  settings: OrgSettings;
  quota: QuotaResponse;
  recommendations: Recommendation[];
  promptSets: PromptSet[];
  monitoredPrompts: MonitoredPrompt[];
  watchlist: WatchlistEntry[];
  reports: Report[];
  alertRules: AlertRule[];
  notifications: Notification[];
  hasOnboarded: boolean;
  firstProject: Project | null;
}

const store: Store = {
  projects: [...PROJECTS],
  runs: [...RUN_LIST],
  runDetails: { ...RUN_DETAIL_BY_ID },
  evidence: { ...EVIDENCE_BY_RUN },
  competitors: { ...COMPETITORS_BY_RUN },
  members: [...MEMBERS],
  settings: { ...ORG_SETTINGS },
  quota: { ...QUOTA },
  recommendations: [...RECOMMENDATIONS],
  promptSets: [...PROMPT_SETS],
  monitoredPrompts: [...MONITORED_PROMPTS],
  watchlist: [...WATCHLIST_SEED],
  reports: [...REPORTS],
  alertRules: [...ALERT_RULES],
  notifications: [...NOTIFICATIONS_SEED],
  hasOnboarded: false,
  firstProject: null,
};

const notificationListeners = new Set<() => void>();
function emitNotificationsChange() {
  notificationListeners.forEach((cb) => cb());
}

export function subscribeNotifications(cb: () => void): () => void {
  notificationListeners.add(cb);
  return () => notificationListeners.delete(cb);
}

const onboardingListeners = new Set<() => void>();
function emitOnboardingChange() {
  onboardingListeners.forEach((cb) => cb());
}

const runListeners = new Set<(runId: string) => void>();
function emitRunsChange(runId: string) {
  runListeners.forEach((cb) => cb(runId));
}

export function subscribeRuns(cb: (runId: string) => void): () => void {
  runListeners.add(cb);
  return () => runListeners.delete(cb);
}

// Run IDs that started in this browser session. Used by the UI to distinguish
// live progression from static fixture data without depending on wall clocks.
const sessionRunIds = new Set<string>();
export function isSessionRun(id: string): boolean {
  return sessionRunIds.has(id);
}

export function subscribeOnboarding(cb: () => void): () => void {
  onboardingListeners.add(cb);
  return () => onboardingListeners.delete(cb);
}

export interface OnboardingSnapshot {
  hasOnboarded: boolean;
  firstProject: Project | null;
}

let onboardingSnapshot: OnboardingSnapshot = {
  hasOnboarded: store.hasOnboarded,
  firstProject: store.firstProject,
};

export function getOnboardingSnapshot(): OnboardingSnapshot {
  return onboardingSnapshot;
}

function refreshOnboardingSnapshot() {
  onboardingSnapshot = {
    hasOnboarded: store.hasOnboarded,
    firstProject: store.firstProject,
  };
}

function deriveProjectName(domain: string): string {
  const host = domain.replace(/^https?:\/\//i, "").split("/")[0];
  const root = host.replace(/^www\./i, "").split(".")[0];
  if (!root) return host;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .replace(/^www\./i, "")
    .toLowerCase();
}

export async function completeOnboarding(rawDomain: string): Promise<Project> {
  const domain = normalizeDomain(rawDomain);
  const existing = store.projects.find(
    (p) => p.domain.toLowerCase() === domain
  );
  const project: Project = existing ?? {
    id: `prj_${randomHex(12)}`,
    org_id: CURRENT_USER.orgId,
    domain,
    name: deriveProjectName(domain),
    sector: null,
    geo: null,
    created_at: new Date().toISOString(),
  };
  if (!existing) {
    store.projects = [project, ...store.projects];
  } else {
    store.projects = [
      project,
      ...store.projects.filter((p) => p.id !== project.id),
    ];
  }
  store.firstProject = project;
  store.hasOnboarded = true;
  refreshOnboardingSnapshot();
  emitOnboardingChange();
  return project;
}

export function resetOnboarding(): void {
  store.hasOnboarded = false;
  store.firstProject = null;
  refreshOnboardingSnapshot();
  emitOnboardingChange();
}

export function delay(min = 220, max = 540): Promise<void> {
  const ms = Math.floor(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCurrentUser() {
  return CURRENT_USER;
}

export async function listProjects(): Promise<Project[]> {
  await delay();
  return [...store.projects].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}

export async function createProject(input: {
  domain: string;
  name: string;
  sector?: string | null;
  geo?: string | null;
}): Promise<Project> {
  await delay();
  const project: Project = {
    id: `prj_${randomHex(12)}`,
    org_id: CURRENT_USER.orgId,
    domain: input.domain,
    name: input.name,
    sector: input.sector ?? null,
    geo: input.geo ?? null,
    created_at: new Date().toISOString(),
  };
  store.projects = [project, ...store.projects];
  return project;
}

export async function listRuns(): Promise<RunListItem[]> {
  await delay(120, 320);
  return [...store.runs].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}

export async function getRun(id: string): Promise<RunDetail> {
  await delay();
  const run = store.runDetails[id];
  if (!run) throw new Error("Run not found");
  return run;
}

export async function getEvidence(id: string): Promise<Evidence> {
  await delay();
  return store.evidence[id] ?? { ai_results: [], crawl_pages: [] };
}

export async function getCompetitors(id: string): Promise<Competitor[]> {
  await delay();
  return store.competitors[id] ?? [];
}

export async function createRun(input: {
  projectId: string | null;
  userQueries?: string[];
}): Promise<{ id: string }> {
  await delay();
  const id = `run_${randomHex(12)}`;
  const project = input.projectId
    ? store.projects.find((p) => p.id === input.projectId)
    : null;
  const now = new Date().toISOString();
  const newRun: RunListItem = {
    id,
    org_id: CURRENT_USER.orgId,
    created_by: CURRENT_USER.id,
    status: "queued",
    status_stage: NEW_RUN_STAGES[0].key,
    project_id: project?.id ?? null,
    config: {
      plan_at_run_time: CURRENT_USER.plan,
      queries_used: (input.userQueries ?? []).map((text) => ({
        text,
        source: "user_added",
        type: "user_added",
        weight: 1,
      })),
    },
    created_at: now,
    updated_at: now,
    seenly_score: null,
    project_name: project?.name ?? null,
  };
  store.runs = [newRun, ...store.runs];
  store.runDetails[id] = {
    ...newRun,
    results_meta: null,
    scores: null,
    summary: { total_queries: 0, total_pages: 0, total_competitors: 0 },
  };
  store.quota = { ...store.quota, used: store.quota.used + 1 };
  sessionRunIds.add(id);
  emitRunsChange(id);
  scheduleRunProgression(id);
  return { id };
}

export async function retryRun(id: string): Promise<void> {
  await delay();
  patchRun(id, { status: "queued", status_stage: NEW_RUN_STAGES[0].key });
  sessionRunIds.add(id);
  scheduleRunProgression(id);
}

export async function cancelRun(id: string): Promise<void> {
  await delay();
  patchRun(id, { status: "cancelled", status_stage: null });
  emitRunsChange(id);
}

export async function listMembers(): Promise<Member[]> {
  await delay();
  return [...store.members].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}

export async function updateMemberRole(
  memberId: string,
  role: Member["role"]
): Promise<Member> {
  await delay();
  const idx = store.members.findIndex((m) => m.id === memberId);
  if (idx < 0) throw new Error("Member not found");
  const next = { ...store.members[idx], role };
  store.members = [
    ...store.members.slice(0, idx),
    next,
    ...store.members.slice(idx + 1),
  ];
  return next;
}

export async function getSettings(): Promise<OrgSettings> {
  await delay();
  return store.settings;
}

export async function regenerateInviteCode(): Promise<OrgSettings> {
  await delay();
  store.settings = {
    ...store.settings,
    inviteCode: `${COMPANY.org.invitePrefix}-${randomHex(6).toUpperCase()}`,
  };
  return store.settings;
}

export async function deleteAccount(): Promise<void> {
  await delay();
}

export async function getQuota(): Promise<QuotaResponse> {
  await delay(100, 220);
  return store.quota;
}

function patchRun(id: string, patch: Partial<RunListItem>): void {
  const idx = store.runs.findIndex((r) => r.id === id);
  if (idx >= 0) {
    store.runs[idx] = {
      ...store.runs[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
  }
  if (store.runDetails[id]) {
    store.runDetails[id] = {
      ...store.runDetails[id],
      ...patch,
      updated_at: new Date().toISOString(),
    } as RunDetail;
  }
}

function scheduleRunProgression(id: string): void {
  if (typeof window === "undefined") return;
  // Walk the staged timeline; transition status_stage at each stage boundary.
  // Status flips to "running" at the second stage and "completed" at the end.
  NEW_RUN_STAGES.forEach((stage, idx) => {
    window.setTimeout(() => {
      if (store.runDetails[id]?.status === "cancelled") return;
      if (idx === NEW_RUN_STAGES.length - 1) {
        completeRun(id);
        emitRunsChange(id);
        return;
      }
      const status: RunStatus = idx === 0 ? "queued" : "running";
      patchRun(id, { status, status_stage: stage.key });
      emitRunsChange(id);
    }, stage.startMs);
  });
  // Failsafe completion if final stage timer didn't fire.
  window.setTimeout(() => {
    const detail = store.runDetails[id];
    if (detail && detail.status !== "completed" && detail.status !== "cancelled") {
      completeRun(id);
      emitRunsChange(id);
    }
  }, NEW_RUN_TOTAL_MS_VALUE + 200);
}

function completeRun(id: string): void {
  const detail = store.runDetails[id];
  if (!detail) return;
  const avs = 68 + Math.floor(Math.random() * 12);
  const aeo = 60 + Math.floor(Math.random() * 14);
  const sentiment = 72 + Math.floor(Math.random() * 14);
  const base =
    Math.round((avs * 0.45 + aeo * 0.35 + sentiment * 0.2) * 10) / 10;
  const final = Math.round((base - 0.6) * 10) / 10;
  const completedAt = new Date().toISOString();
  const updatedDetail: RunDetail = {
    ...detail,
    status: "completed",
    status_stage: "done",
    updated_at: completedAt,
    results_meta: {
      duration_ms: 187420,
      ai_calls: 30,
      tokens_in: 19120,
      tokens_out: 6980,
    },
    scores: {
      run_id: id,
      avs_score: avs,
      aeo_score: aeo,
      sentiment_score: sentiment,
      seenly_score_base: base,
      seenly_score_final: final,
      penalties_applied: ["missing_schema"],
      avs_confidence: 0.82,
      aeo_confidence: 0.76,
      completed_at: completedAt,
    },
    summary: {
      total_queries: 10,
      total_pages: 12,
      total_competitors: 7,
    },
  };
  store.runDetails[id] = updatedDetail;
  patchRun(id, { status: "completed", status_stage: "done", seenly_score: final });
  store.evidence[id] = EVIDENCE_BY_RUN[Object.keys(EVIDENCE_BY_RUN)[0]];
  store.competitors[id] =
    COMPETITORS_BY_RUN[Object.keys(COMPETITORS_BY_RUN)[0]];
}

function randomHex(length: number): string {
  let out = "";
  while (out.length < length) {
    out += Math.random().toString(16).slice(2);
  }
  return out.slice(0, length);
}

export async function listRecommendations(): Promise<Recommendation[]> {
  await delay(160, 360);
  return [...store.recommendations].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export async function updateRecommendation(
  id: string,
  patch: Partial<Pick<Recommendation, "status" | "assigneeId" | "dueAt">>
): Promise<Recommendation> {
  await delay(180, 380);
  const idx = store.recommendations.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Recommendation not found");
  // Simulate occasional failure on dismissed transitions for realism
  if (patch.status === "dismissed" && Math.random() < 0.08) {
    throw new Error("Couldn't sync change. Please try again.");
  }
  const next: Recommendation = {
    ...store.recommendations[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store.recommendations[idx] = next;
  return next;
}

export async function bulkUpdateRecommendations(
  ids: string[],
  patch: Partial<Pick<Recommendation, "status" | "assigneeId">>
): Promise<Recommendation[]> {
  await delay(220, 460);
  const updated: Recommendation[] = [];
  store.recommendations = store.recommendations.map((r) => {
    if (!ids.includes(r.id)) return r;
    const next: Recommendation = {
      ...r,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    updated.push(next);
    return next;
  });
  return updated;
}

export async function listPromptSets(): Promise<{
  sets: PromptSet[];
  prompts: MonitoredPrompt[];
}> {
  await delay(140, 320);
  return { sets: [...store.promptSets], prompts: [...store.monitoredPrompts] };
}

export async function addPromptToSet(input: {
  text: string;
  setId: string;
}): Promise<{ set: PromptSet; prompt: MonitoredPrompt }> {
  await delay(220, 480);
  const set = store.promptSets.find((s) => s.id === input.setId);
  if (!set) throw new Error("Set not found");
  const prompt: MonitoredPrompt = {
    id: `pmp_${randomHex(6)}`,
    text: input.text,
    set: set.name as MonitoredPrompt["set"],
    weight: 2,
  };
  store.monitoredPrompts = [...store.monitoredPrompts, prompt];
  const next: PromptSet = {
    ...set,
    promptIds: [...set.promptIds, prompt.id],
  };
  store.promptSets = store.promptSets.map((s) => (s.id === set.id ? next : s));
  return { set: next, prompt };
}

export async function listWatchlist(): Promise<WatchlistEntry[]> {
  await delay(140, 300);
  return [...store.watchlist].sort((a, b) =>
    b.addedAt.localeCompare(a.addedAt)
  );
}

export async function addToWatchlist(input: {
  domain: string;
  name: string;
}): Promise<WatchlistEntry> {
  await delay(220, 420);
  if (
    store.watchlist.some(
      (w) => w.domain.toLowerCase() === input.domain.toLowerCase()
    )
  ) {
    throw new Error(`${input.domain} is already on the watchlist`);
  }
  const entry: WatchlistEntry = {
    id: `wl_${randomHex(4)}`,
    domain: input.domain,
    name: input.name,
    addedAt: new Date().toISOString(),
    alertOnDrop: true,
    notes: null,
  };
  store.watchlist = [entry, ...store.watchlist];
  return entry;
}

export async function removeFromWatchlist(id: string): Promise<void> {
  await delay(160, 320);
  store.watchlist = store.watchlist.filter((w) => w.id !== id);
}

export async function toggleWatchlistAlert(
  id: string
): Promise<WatchlistEntry> {
  await delay(120, 260);
  const idx = store.watchlist.findIndex((w) => w.id === id);
  if (idx < 0) throw new Error("Not found");
  const next = {
    ...store.watchlist[idx],
    alertOnDrop: !store.watchlist[idx].alertOnDrop,
  };
  store.watchlist[idx] = next;
  return next;
}

// Reports
export async function listReports(): Promise<Report[]> {
  await delay(160, 360);
  return [...store.reports].sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt)
  );
}

export async function getReport(id: string): Promise<Report> {
  await delay(140, 320);
  const r = store.reports.find((x) => x.id === id);
  if (!r) throw new Error("Report not found");
  return r;
}

export function getReportByToken(token: string): Report | null {
  const live = store.reports.find(
    (r) => r.shareToken === token && r.shareEnabled
  );
  if (live) return live;
  return REPORT_BY_TOKEN[token] ?? null;
}

export async function generateReport(input: {
  period: string;
  onProgress?: (pct: number, stage: string) => void;
}): Promise<Report> {
  const stages = [
    { pct: 12, stage: "Collecting run data", at: 350 },
    { pct: 28, stage: "Aggregating citation share", at: 800 },
    { pct: 46, stage: "Computing pillar deltas", at: 1500 },
    { pct: 64, stage: "Drafting executive narrative", at: 2400 },
    { pct: 82, stage: "Rendering charts", at: 3200 },
    { pct: 96, stage: "Finalizing PDF", at: 3800 },
  ];
  for (const s of stages) {
    await new Promise((r) => setTimeout(r, s.at / stages.length));
    input.onProgress?.(s.pct, s.stage);
  }
  const template = store.reports[0];
  const id = `rep_${input.period.replace("-", "")}_${randomHex(4)}`;
  const next: Report = {
    ...template,
    id,
    period: template.period,
    title: `${new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })} executive report`,
    generatedAt: new Date().toISOString(),
    pages: template.pages,
    shareToken: `rep-live-${randomHex(8)}`,
    shareEnabled: false,
    shareViews: 0,
    shareLastViewedAt: null,
  };
  store.reports = [next, ...store.reports];
  input.onProgress?.(100, "Done");
  return next;
}

export async function toggleReportShare(id: string): Promise<Report> {
  await delay(140, 280);
  const idx = store.reports.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Report not found");
  const next: Report = {
    ...store.reports[idx],
    shareEnabled: !store.reports[idx].shareEnabled,
  };
  store.reports[idx] = next;
  return next;
}

export async function regenerateReportShareToken(id: string): Promise<Report> {
  await delay(180, 360);
  const idx = store.reports.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Report not found");
  const next: Report = {
    ...store.reports[idx],
    shareToken: `rep-live-${randomHex(8)}`,
    shareViews: 0,
    shareLastViewedAt: null,
  };
  store.reports[idx] = next;
  return next;
}

// Alert rules
export async function listAlertRules(): Promise<AlertRule[]> {
  await delay(140, 280);
  return [...store.alertRules];
}

export async function createAlertRule(input: {
  name: string;
  description: string;
  category: AlertRule["category"];
  severity: AlertRule["severity"];
  threshold: AlertRule["threshold"];
  scope: string;
  channels: AlertChannel[];
}): Promise<AlertRule> {
  await delay(220, 440);
  const rule: AlertRule = {
    id: `alr_${randomHex(4)}`,
    enabled: true,
    muted: false,
    mutedUntil: null,
    createdAt: new Date().toISOString(),
    lastFiredAt: null,
    fireCount30d: 0,
    ...input,
  };
  store.alertRules = [rule, ...store.alertRules];
  return rule;
}

export async function updateAlertRule(
  id: string,
  patch: Partial<Pick<AlertRule, "enabled" | "muted" | "mutedUntil" | "channels" | "severity" | "name" | "description">>
): Promise<AlertRule> {
  await delay(160, 320);
  const idx = store.alertRules.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Alert rule not found");
  const next: AlertRule = { ...store.alertRules[idx], ...patch };
  store.alertRules[idx] = next;
  return next;
}

export async function deleteAlertRule(id: string): Promise<void> {
  await delay(140, 260);
  store.alertRules = store.alertRules.filter((r) => r.id !== id);
}

export async function testFireAlertRule(id: string): Promise<Notification> {
  await delay(280, 520);
  const rule = store.alertRules.find((r) => r.id === id);
  if (!rule) throw new Error("Alert rule not found");
  const ntf: Notification = {
    id: `ntf_${randomHex(6)}`,
    ruleId: rule.id,
    category: rule.category,
    severity: rule.severity,
    title: `Test fire: ${rule.name}`,
    body: `Simulated trigger of "${rule.name}". No real event occurred.`,
    href: null,
    read: false,
    snoozedUntil: null,
    createdAt: new Date().toISOString(),
    evidence: [
      { label: "Threshold", value: `${rule.threshold.metric} ${rule.threshold.operator} ${rule.threshold.value}${rule.threshold.unit}` },
      { label: "Scope", value: rule.scope },
    ],
  };
  store.notifications = [ntf, ...store.notifications];
  store.alertRules = store.alertRules.map((r) =>
    r.id === id
      ? { ...r, lastFiredAt: ntf.createdAt, fireCount30d: r.fireCount30d + 1 }
      : r
  );
  emitNotificationsChange();
  return ntf;
}

// Notifications
export async function listNotifications(): Promise<Notification[]> {
  await delay(120, 260);
  return [...store.notifications].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function getNotificationsSnapshot(): Notification[] {
  return [...store.notifications].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function markNotificationRead(
  id: string,
  read: boolean
): Promise<Notification> {
  await delay(80, 200);
  const idx = store.notifications.findIndex((n) => n.id === id);
  if (idx < 0) throw new Error("Notification not found");
  const next: Notification = { ...store.notifications[idx], read };
  store.notifications[idx] = next;
  emitNotificationsChange();
  return next;
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay(160, 320);
  store.notifications = store.notifications.map((n) => ({ ...n, read: true }));
  emitNotificationsChange();
}

export async function snoozeNotification(
  id: string,
  hours: number
): Promise<Notification> {
  await delay(120, 240);
  const idx = store.notifications.findIndex((n) => n.id === id);
  if (idx < 0) throw new Error("Notification not found");
  const snoozedUntil = new Date(Date.now() + hours * 3_600_000).toISOString();
  const next: Notification = {
    ...store.notifications[idx],
    snoozedUntil,
    read: true,
  };
  store.notifications[idx] = next;
  emitNotificationsChange();
  return next;
}

export async function clearNotification(id: string): Promise<void> {
  await delay(100, 220);
  store.notifications = store.notifications.filter((n) => n.id !== id);
  emitNotificationsChange();
}

export function pushSimulatedNotification(): Notification {
  const template =
    SIMULATED_ALERT_TEMPLATES[
      Math.floor(Math.random() * SIMULATED_ALERT_TEMPLATES.length)
    ];
  const ntf: Notification = {
    ...template,
    id: `ntf_${randomHex(6)}`,
    read: false,
    snoozedUntil: null,
    createdAt: new Date().toISOString(),
  };
  store.notifications = [ntf, ...store.notifications];
  if (ntf.ruleId) {
    store.alertRules = store.alertRules.map((r) =>
      r.id === ntf.ruleId
        ? { ...r, lastFiredAt: ntf.createdAt, fireCount30d: r.fireCount30d + 1 }
        : r
    );
  }
  emitNotificationsChange();
  return ntf;
}
