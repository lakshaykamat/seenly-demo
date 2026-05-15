export type Plan = "starter" | "growth" | "enterprise";

export interface PlanLimit {
  runsPerMonth: number; // -1 = unlimited
  crawlPages: number;
  suggestedQueries: number;
  userQueries: number;
  engines: number; // how many of the 3 AI engines to use
  competitors: number;
}
