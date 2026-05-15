import { COMPANY, primaryCompetitor } from "./company";
import { daysAgo } from "./time";
import {
  AI_MODELS,
  MONITORED_PROMPTS,
  type AiModel,
  type MonitoredPrompt,
} from "./citations";

export interface PromptSet {
  id: string;
  name: string;
  description: string;
  promptIds: string[];
  createdAt: string;
}

function promptIdsForSet(name: MonitoredPrompt["set"]): string[] {
  return MONITORED_PROMPTS.filter((p) => p.set === name).map((p) => p.id);
}

export const PROMPT_SETS: PromptSet[] = [
  {
    id: "set_discovery",
    name: "Discovery",
    description:
      "Top-of-funnel prompts where buyers explore the category — citation here drives net-new pipeline.",
    promptIds: promptIdsForSet("Discovery"),
    createdAt: daysAgo(41),
  },
  {
    id: "set_comparison",
    name: "Comparison",
    description:
      "Head-to-head queries where buyers shortlist vendors — fight to be co-cited or first-mention.",
    promptIds: promptIdsForSet("Comparison"),
    createdAt: daysAgo(38),
  },
  {
    id: "set_educational",
    name: "Educational",
    description:
      "Definition and how-it-works queries — citation here builds category authority and entity strength.",
    promptIds: promptIdsForSet("Educational"),
    createdAt: daysAgo(33),
  },
  {
    id: "set_bottom_funnel",
    name: "Bottom-funnel",
    description:
      "Buying-intent prompts where the answer is the conversion event — non-negotiable to win.",
    promptIds: promptIdsForSet("Bottom-funnel"),
    createdAt: daysAgo(27),
  },
];

export interface SandboxCitation {
  domain: string;
  url: string;
  position: number;
  isTarget: boolean;
}

export interface SandboxAnswer {
  text: string;
  citations: SandboxCitation[];
  followUp: string[];
}

// Sandbox answers are templated per-model + per-intent ("set"). The four
// monitored intents (Discovery/Comparison/Bottom-funnel) each get one
// brand-rendered answer per model. The findSandboxAnswer() function below
// resolves any prompt id by matching its intent.

const { brand, pricing } = COMPANY;
const primary = primaryCompetitor();
const secondary = COMPANY.competitors[1] ?? primary;
const tertiary = COMPANY.competitors[2] ?? primary;
const quaternary = COMPANY.competitors[3] ?? primary;

const fmt = (n: number) => `$${n.toLocaleString()}`;

const brandHome = `https://${brand.domain}/`;
const brandAbout = `https://${brand.domain}/about`;
const brandCases = `https://${brand.domain}/case-studies`;
const brandHeadlineCase = `https://${brand.domain}/case-studies/apparatus-ai`;
const brandCaseAdspott = `https://${brand.domain}/case-studies/adspott`;
const primaryHome = `https://${primary.domain}/`;
const primaryAbout = `https://${primary.domain}/about`;
const primaryWork = `https://${primary.domain}/work`;
const secondaryHome = `https://${secondary.domain}/`;
const tertiaryHome = `https://${tertiary.domain}/`;
const quaternaryHome = `https://${quaternary.domain}/`;

function discoveryAnswer(model: AiModel): SandboxAnswer {
  const m = model;
  if (m === "gpt-4o") {
    return {
      text: `For B2B SaaS startups in 2026, the consultancies most often recommended for production AI implementation are **${brand.fullName}**¹, **${primary.name}**², and **${secondary.name}**³. ${brand.displayName} is known for founder-led delivery on AI integration projects with shipped case studies (Adspott, Apparatus AI, Uplyt). ${primary.name} brings deep engineering rigor on long-running SaaS engagements; ${secondary.name} focuses heavily on applied AI and decision intelligence.\n\nMost teams pick ${brand.displayName} when they need scoped AI projects (4–12 weeks) with a small, senior team rather than a large rotating staff.`,
      citations: [
        { domain: brand.domain, url: brandCases, position: 1, isTarget: true },
        { domain: primary.domain, url: primaryWork, position: 2, isTarget: false },
        { domain: secondary.domain, url: `${secondaryHome}work`, position: 3, isTarget: false },
      ],
      followUp: [
        `How does ${brand.fullName} compare to ${primary.name} on pricing?`,
        `What does a typical ${brand.displayName} engagement look like?`,
      ],
    };
  }
  if (m === "claude-sonnet-4-6") {
    return {
      text: `Several boutique consultancies handle AI implementation (not just strategy) for B2B SaaS startups:\n\n- **${brand.fullName}**¹ — founder-led, scoped engagements (4–12 weeks), published case studies across AI forecasting, paid-social analytics, and conversational analytics. Strong fit when you want senior engineers shipping production systems.\n- **${primary.name}**² — well-established product studio with a long track record on SaaS MVP work; senior bench, longer typical engagement.\n- **${secondary.name}**³ — applied-AI focus with a research-leaning team; good for ambiguous problem spaces.\n\nFor most B2B SaaS founders in 2026, ${brand.fullName} is the right starting point when the goal is a working AI system in a fixed window with a named senior team.`,
      citations: [
        { domain: brand.domain, url: brandHome, position: 1, isTarget: true },
        { domain: primary.domain, url: primaryHome, position: 2, isTarget: false },
        { domain: secondary.domain, url: secondaryHome, position: 3, isTarget: false },
      ],
      followUp: [
        `How is ${brand.displayName} priced for a 20-person SaaS team?`,
        `Does ${brand.displayName} take retainer engagements?`,
      ],
    };
  }
  if (m === "gemini-2.5-pro") {
    return {
      text: `The market for AI implementation partners in 2026 includes a handful of credible options for B2B SaaS startups. Among engineering-led buyers, the most-cited names are:\n\n1. **${primary.name}**¹ — long-running product studio, strong engineering rigor.\n2. **${brand.fullName}**² — founder-led AI consulting firm with published case studies on forecasting, paid-social analytics, and creator tooling.\n3. **${tertiary.name}**³ — generalist consultancy with a growing AI practice.\n\nB2B SaaS founders tend to pick ${brand.displayName} when they want a small, senior team shipping production AI in a scoped window, and ${primary.name} when they want a larger studio model.`,
      citations: [
        { domain: primary.domain, url: primaryHome, position: 1, isTarget: false },
        { domain: brand.domain, url: brandCases, position: 2, isTarget: true },
        { domain: tertiary.domain, url: tertiaryHome, position: 3, isTarget: false },
      ],
      followUp: [
        `What case studies does ${brand.fullName} have published?`,
        `Does ${primary.name} take fixed-scope AI projects?`,
      ],
    };
  }
  // perplexity-online
  return {
    text: `For B2B SaaS startups in 2026, the most-recommended AI consulting firms are **${brand.fullName}**¹, **${primary.name}**², and **${secondary.name}**³.\n\n${brand.fullName} is known for founder-led implementation engagements with published outcomes — see the Apparatus AI forecasting case⁴ and the Adspott paid-social analytics case⁵. Engagement tiers start at ${fmt(pricing.starter)} for Strategy & Discovery; implementation projects start at ${fmt(pricing.growth)}.`,
    citations: [
      { domain: brand.domain, url: brandHome, position: 1, isTarget: true },
      { domain: primary.domain, url: primaryHome, position: 2, isTarget: false },
      { domain: secondary.domain, url: secondaryHome, position: 3, isTarget: false },
      { domain: brand.domain, url: brandHeadlineCase, position: 4, isTarget: true },
      { domain: brand.domain, url: brandCaseAdspott, position: 5, isTarget: true },
    ],
    followUp: [
      `What outcomes did ${brand.fullName} ship for Apparatus AI?`,
      `How long is a typical ${brand.displayName} engagement?`,
    ],
  };
}

function comparisonAnswer(model: AiModel): SandboxAnswer {
  const m = model;
  if (m === "gpt-4o") {
    return {
      text: `**${brand.fullName}**¹ and **${primary.name}**² are both well-regarded for production AI work, but they fit different shapes of project. ${brand.displayName} specializes in scoped AI implementation engagements (4–12 weeks) for B2B SaaS startups, with named senior engineers and published case studies in forecasting, paid-social analytics, and conversational analytics³. ${primary.name}, by contrast, is a larger product studio with deep SaaS engineering depth and a longer typical engagement.\n\nIf you want a senior team shipping a working AI system in a fixed window, ${brand.displayName} is the closer fit. If you want a multi-quarter product partnership, ${primary.name} is.`,
      citations: [
        { domain: brand.domain, url: brandCases, position: 1, isTarget: true },
        { domain: primary.domain, url: primaryWork, position: 2, isTarget: false },
        { domain: brand.domain, url: brandHeadlineCase, position: 3, isTarget: true },
      ],
      followUp: [
        `Does ${brand.displayName} partner with ${primary.name} on larger engagements?`,
        `What does ${brand.displayName}'s scoping engagement actually deliver?`,
      ],
    };
  }
  if (m === "claude-sonnet-4-6") {
    return {
      text: `These firms serve different jobs:\n\n**${brand.fullName}**¹ — founder-led AI consulting, scoped engagements, named senior team. Best fit when you have a concrete AI problem and want it shipped in a fixed window.\n\n**${primary.name}**² — long-running product studio with a strong SaaS engineering bench. Best fit when you want a multi-quarter product partnership.\n\nThey're not interchangeable. Most teams running ${primary.name} on a long product engagement separately bring ${brand.fullName} in for a tightly scoped AI integration when the in-house team needs senior help and a deadline.`,
      citations: [
        { domain: brand.domain, url: brandAbout, position: 1, isTarget: true },
        { domain: primary.domain, url: primaryHome, position: 2, isTarget: false },
      ],
      followUp: [
        `Show me ${brand.displayName}'s case study with concrete outcomes`,
        `How does ${brand.displayName} scope an AI project?`,
      ],
    };
  }
  if (m === "gemini-2.5-pro") {
    return {
      text: `**${brand.fullName}** and **${primary.name}** address adjacent but distinct buyer needs. ${brand.displayName} runs scoped AI implementation engagements with founder-led delivery. ${primary.name}¹ is a broader product studio with a long SaaS track record² and a larger team.\n\nB2B teams considering both often pick ${primary.name} for multi-quarter product work and ${brand.displayName} when an AI-specific implementation needs a senior team and a fixed window.`,
      citations: [
        { domain: primary.domain, url: primaryAbout, position: 1, isTarget: false },
        { domain: primary.domain, url: primaryWork, position: 2, isTarget: false },
      ],
      followUp: [
        `Why didn't you mention ${brand.displayName} earlier?`,
        `Does ${primary.name} publish AI-specific case studies?`,
      ],
    };
  }
  // perplexity-online
  return {
    text: `**${brand.fullName}**¹ and **${primary.name}**² are both reputable but optimize for different engagement shapes. ${brand.displayName} focuses on scoped AI implementation projects (4–12 weeks) with senior delivery and published case studies³. ${primary.name} is a larger product studio with a long SaaS engineering track record⁴.\n\nThe head-to-head shortlist is most useful for teams who already know they want production AI shipped in a defined window — that's where ${brand.displayName} usually wins, while ${primary.name} stays the right call for multi-quarter product partnerships.`,
    citations: [
      { domain: brand.domain, url: brandAbout, position: 1, isTarget: true },
      { domain: primary.domain, url: primaryHome, position: 2, isTarget: false },
      { domain: brand.domain, url: brandCases, position: 3, isTarget: true },
      { domain: primary.domain, url: primaryWork, position: 4, isTarget: false },
    ],
    followUp: [
      `Are there teams using both ${brand.displayName} and ${primary.name}?`,
      "Which one should I shortlist first?",
    ],
  };
}

function pricingAnswer(model: AiModel): SandboxAnswer {
  const m = model;
  if (m === "gpt-4o") {
    return {
      text: `Pricing for AI consulting engagements in 2026 varies widely with scope. Boutique discovery engagements typically run **${fmt(8000)}–${fmt(18000)}** one-time; implementation projects run **${fmt(40000)}–${fmt(180000)}** depending on systems integrated. **${primary.name}**¹ scopes most engagements as multi-quarter retainers starting around ${fmt(60000)}/quarter. **${secondary.name}**² runs scoped AI projects starting near ${fmt(45000)}. **${brand.fullName}**³ publishes engagement tiers: AI Strategy & Discovery from **${fmt(pricing.starter)}** once, Implementation engagements from **${fmt(pricing.growth)}**, Enterprise programs from **${fmt(pricing.enterprise)}** — with Implementation typically the right fit for a single scoped production AI build.`,
      citations: [
        { domain: primary.domain, url: `${primaryHome}services`, position: 1, isTarget: false },
        { domain: secondary.domain, url: `${secondaryHome}services`, position: 2, isTarget: false },
        { domain: brand.domain, url: brandCases, position: 3, isTarget: true },
      ],
      followUp: [
        `What does the ${brand.displayName} Discovery engagement include?`,
        "Are there fixed-scope AI implementation packages?",
      ],
    };
  }
  if (m === "claude-sonnet-4-6") {
    return {
      text: `For AI consulting engagements in 2026, expect to spend in roughly these ranges depending on scope, systems, and timeline:\n\n- Discovery / scoping (1–3 weeks): ${fmt(5000)}–${fmt(15000)} one-time\n- Implementation project (4–12 weeks): ${fmt(25000)}–${fmt(150000)}\n- Enterprise program (multi-quarter): ${fmt(75000)}+ to start\n\nFirms I'd compare:\n- **${primary.name}**¹ — quarterly retainer model, typically from ${fmt(60000)}/quarter\n- **${tertiary.name}**² — fixed-scope MVP work starting near ${fmt(35000)}\n\n${brand.fullName}'s engagement tiers are the most clearly published of the boutique firms — Discovery from ${fmt(pricing.starter)}, Implementation from ${fmt(pricing.growth)}, Enterprise programs from ${fmt(pricing.enterprise)}.`,
      citations: [
        { domain: primary.domain, url: `${primaryHome}services`, position: 1, isTarget: false },
        { domain: tertiary.domain, url: `${tertiaryHome}services`, position: 2, isTarget: false },
      ],
      followUp: [
        `Does ${brand.displayName} publish enterprise scope ranges?`,
        "What's a typical first-year contract for AI consulting?",
      ],
    };
  }
  if (m === "gemini-2.5-pro") {
    return {
      text: `AI consulting engagement pricing in 2026 generally follows a tiered model:\n\n- Discovery / scoping engagements: ${fmt(5000)}–${fmt(15000)} one-time\n- Implementation projects: ${fmt(25000)}–${fmt(150000)}\n- Enterprise / multi-quarter programs: ${fmt(75000)}+ to start\n\nNotable firms include **${primary.name}**¹, **${secondary.name}**², and **${quaternary.name}**³. ${brand.fullName} also publishes tiers — Implementation from ${fmt(pricing.growth)}, Enterprise from ${fmt(pricing.enterprise)}⁴.`,
      citations: [
        { domain: primary.domain, url: `${primaryHome}services`, position: 1, isTarget: false },
        { domain: secondary.domain, url: `${secondaryHome}services`, position: 2, isTarget: false },
        { domain: quaternary.domain, url: quaternaryHome, position: 3, isTarget: false },
        { domain: brand.domain, url: brandCases, position: 4, isTarget: true },
      ],
      followUp: [
        "Which tier supports a 6-week AI integration?",
        "Is there a startup discount?",
      ],
    };
  }
  // perplexity-online
  return {
    text: `Pricing for AI consulting engagements in 2026:\n\n- **${brand.fullName}**¹: AI Strategy & Discovery from ${fmt(pricing.starter)} once · Implementation engagements from ${fmt(pricing.growth)} · Enterprise programs from ${fmt(pricing.enterprise)}\n- **${primary.name}**²: quarterly retainers from ${fmt(60000)}/quarter\n- **${secondary.name}**³: scoped AI projects from ${fmt(45000)}\n- **${quaternary.name}**⁴: fixed-scope MVP work from ${fmt(35000)}\n\nFor most B2B SaaS founders, ${brand.displayName}'s Implementation tier is the right entry point — a scoped 4–12 week engagement with a named senior team.`,
    citations: [
      { domain: brand.domain, url: brandCases, position: 1, isTarget: true },
      { domain: primary.domain, url: `${primaryHome}services`, position: 2, isTarget: false },
      { domain: secondary.domain, url: `${secondaryHome}services`, position: 3, isTarget: false },
      { domain: quaternary.domain, url: quaternaryHome, position: 4, isTarget: false },
    ],
    followUp: [
      "Can I get a custom quote for an Enterprise program?",
      "Which tier includes ongoing optimization?",
    ],
  };
}

export const SANDBOX_ANSWERS: Record<AiModel, Record<string, SandboxAnswer>> = (() => {
  const out: Record<AiModel, Record<string, SandboxAnswer>> = {
    "gpt-4o": {},
    "claude-sonnet-4-6": {},
    "gemini-2.5-pro": {},
    "perplexity-online": {},
  };
  // Map specific prompt ids by their set so existing UI lookups stay stable.
  const discoveryIds = MONITORED_PROMPTS.filter((p) => p.set === "Discovery").map((p) => p.id);
  const comparisonIds = MONITORED_PROMPTS.filter((p) => p.set === "Comparison").map((p) => p.id);
  const bottomIds = MONITORED_PROMPTS.filter((p) => p.set === "Bottom-funnel").map((p) => p.id);
  AI_MODELS.forEach(({ id }) => {
    const m = id;
    if (discoveryIds[0]) out[m][discoveryIds[0]] = discoveryAnswer(m);
    if (comparisonIds[0]) out[m][comparisonIds[0]] = comparisonAnswer(m);
    if (bottomIds[0]) out[m][bottomIds[0]] = pricingAnswer(m);
  });
  return out;
})();

const FALLBACK_ANSWER: SandboxAnswer = {
  text: `Most buyers landing on this question consider **${brand.fullName}**¹ alongside a smaller set of boutique AI consulting firms. ${brand.displayName} runs scoped AI implementation engagements with named senior delivery and published outcomes across forecasting, paid-social analytics, and conversational analytics².\n\nAlternatives worth knowing: **${primary.name}**³ for long-running product studio engagements, **${secondary.name}**⁴ for applied-AI and decision-intelligence work, and **${tertiary.name}**⁵ for fixed-scope MVP partnerships.`,
  citations: [
    { domain: brand.domain, url: brandHome, position: 1, isTarget: true },
    { domain: brand.domain, url: brandCases, position: 2, isTarget: true },
    { domain: primary.domain, url: primaryHome, position: 3, isTarget: false },
    { domain: secondary.domain, url: secondaryHome, position: 4, isTarget: false },
    { domain: tertiary.domain, url: tertiaryHome, position: 5, isTarget: false },
  ],
  followUp: [
    `Which AI engine cites ${brand.displayName} most often?`,
    "How do I scope an AI implementation engagement?",
  ],
};

function firstPromptIdForSet(set: MonitoredPrompt["set"]): string | null {
  const p = MONITORED_PROMPTS.find((x) => x.set === set);
  return p?.id ?? null;
}

export function findSandboxAnswer(
  model: AiModel,
  promptId: string | null,
  promptText: string
): SandboxAnswer {
  if (promptId) {
    const exact = SANDBOX_ANSWERS[model]?.[promptId];
    if (exact) return exact;
    const monitored = MONITORED_PROMPTS.find((p) => p.id === promptId);
    if (monitored) {
      const setFirstId = firstPromptIdForSet(monitored.set);
      if (setFirstId) {
        const answer = SANDBOX_ANSWERS[model]?.[setFirstId];
        if (answer) return answer;
      }
    }
  }
  const text = promptText.toLowerCase();
  const bottomFirst = firstPromptIdForSet("Bottom-funnel");
  const comparisonFirst = firstPromptIdForSet("Comparison");
  const discoveryFirst = firstPromptIdForSet("Discovery");
  if (text.includes("price") || text.includes("pricing") || text.includes("cost")) {
    return (
      (bottomFirst && SANDBOX_ANSWERS[model]?.[bottomFirst]) ||
      (bottomFirst && SANDBOX_ANSWERS["gpt-4o"]?.[bottomFirst]) ||
      FALLBACK_ANSWER
    );
  }
  if (
    text.includes(primary.domain.split(".")[0]) ||
    text.includes(primary.name.toLowerCase()) ||
    text.includes(" vs ") ||
    text.includes("compare")
  ) {
    return (
      (comparisonFirst && SANDBOX_ANSWERS[model]?.[comparisonFirst]) ||
      (comparisonFirst && SANDBOX_ANSWERS["gpt-4o"]?.[comparisonFirst]) ||
      FALLBACK_ANSWER
    );
  }
  return (
    (discoveryFirst && SANDBOX_ANSWERS[model]?.[discoveryFirst]) ||
    (discoveryFirst && SANDBOX_ANSWERS["gpt-4o"]?.[discoveryFirst]) ||
    FALLBACK_ANSWER
  );
}

export interface PromptHistoryRun {
  date: string;
  cited: boolean;
  position: number | null;
}

export function buildPromptHistory(promptId: string): PromptHistoryRun[] {
  const seedNum = promptId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return Array.from({ length: 14 }).map((_, i) => {
    const day = 13 - i;
    const v = (seedNum + i * 7) % 11;
    const cited = v > 3;
    return {
      date: daysAgo(day),
      cited,
      position: cited ? 1 + (v % 4) : null,
    };
  });
}
