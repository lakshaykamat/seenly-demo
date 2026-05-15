import type { Plan, PlanLimit } from "@/types";

export const PLANS = ["starter", "growth", "enterprise"] as const;

export const PLAN_LIMITS: Record<Plan, PlanLimit> = {
  starter: {
    runsPerMonth: 50,
    crawlPages: 3,
    suggestedQueries: 5,
    userQueries: 2,
    engines: 2,
    competitors: 3,
  },
  growth: {
    runsPerMonth: 500,
    crawlPages: 10,
    suggestedQueries: 10,
    userQueries: 5,
    engines: 3,
    competitors: 5,
  },
  enterprise: {
    runsPerMonth: -1,
    crawlPages: 30,
    suggestedQueries: 20,
    userQueries: 15,
    engines: 3,
    competitors: 10,
  },
};
