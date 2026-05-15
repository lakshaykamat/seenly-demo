"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, Sparkles, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { completeOnboarding, normalizeDomain } from "@/lib/mocks/store";
import {
  FIRST_RUN_STAGES,
  FIRST_RUN_TOTAL_MS,
} from "@/lib/mocks/onboarding-stages";
import { OnboardingActivity } from "./onboarding-activity";
import {
  OpenAIMark,
  ClaudeMark,
  GeminiMark,
  PerplexityMark,
} from "@/components/icons/model-logos";
import COMPANY from "@/lib/mocks/data/company.json";

type Phase = "input" | "processing";

const DOMAIN_PATTERN = /^([a-z0-9-]+\.)+[a-z]{2}[a-z]*$/i;

export function OnboardingLanding() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submittedDomain, setSubmittedDomain] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeDomain(value);
    if (!cleaned) {
      setError("Enter a domain to continue.");
      return;
    }
    if (!DOMAIN_PATTERN.test(cleaned)) {
      setError("That doesn't look like a valid domain. Try acme.com.");
      return;
    }
    setError(null);
    setSubmittedDomain(cleaned);
    setSubmitting(true);
    setPhase("processing");
  };

  const handleSampleRun = () => {
    setSubmittedDomain(COMPANY.brand.domain);
    setSubmitting(true);
    setPhase("processing");
  };

  const handleDone = async () => {
    await completeOnboarding(submittedDomain);
    router.replace("/dashboard");
  };

  if (phase === "processing") {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <OnboardingActivity
          domain={submittedDomain}
          stages={FIRST_RUN_STAGES}
          totalMs={FIRST_RUN_TOTAL_MS}
          onDone={handleDone}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-400,#34d399)] animate-pulse" />
          Live · measuring 4 engines
        </span>
      </div>

      <h1 className="mt-6 text-foreground font-semibold leading-[1.05] tracking-tight text-center text-[clamp(2.25rem,5vw,4rem)]">
        How does AI{" "}
        <span className="text-primary">recommend</span>
        <br className="hidden sm:block" />
        <span className="sm:hidden"> </span>
        your brand?
      </h1>

      <p className="mt-5 mx-auto max-w-xl text-center text-base text-muted-foreground leading-relaxed">
        Score your site across search, AI answers, and structure — with
        evidence for every number.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 mx-auto max-w-xl" noValidate>
        <div
          className={cn(
            "group relative flex items-center rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur-md transition-colors",
            "focus-within:border-ring/60 focus-within:bg-card focus-within:shadow-md",
            error && "border-destructive/60 focus-within:border-destructive"
          )}
        >
          <span className="pl-5 pr-1 text-sm text-muted-foreground/70 select-none">
            https://
          </span>
          <input
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="acme.com"
            disabled={submitting}
            aria-invalid={Boolean(error)}
            className="flex-1 bg-transparent py-4 pr-3 text-base text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "m-1.5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                Analyze
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
        {error && (
          <p
            className="mt-3 text-center text-xs text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          or run on{" "}
          <button
            type="button"
            onClick={handleSampleRun}
            disabled={submitting}
            className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            {COMPANY.brand.domain} →
          </button>
        </p>
      </form>

      <div className="mt-12">
        <div className="flex items-center justify-center gap-x-7 gap-y-3 flex-wrap text-sm text-muted-foreground">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground/60">
            Tracked engines
          </span>
          <span className="inline-flex items-center gap-2">
            <OpenAIMark className="size-4" />
            GPT-4o
          </span>
          <span className="inline-flex items-center gap-2">
            <ClaudeMark className="size-4" />
            Claude Sonnet 4.6
          </span>
          <span className="inline-flex items-center gap-2">
            <GeminiMark className="size-4" />
            Gemini 2.5 Pro
          </span>
          <span className="inline-flex items-center gap-2">
            <PerplexityMark className="size-4" />
            Perplexity
          </span>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        <PillarCard
          icon={<Search className="size-4" strokeWidth={2.25} />}
          label="Search Visibility"
          title="Rank, AI overviews, SERP features"
          body="Daily positions and feature ownership across Google, with competitor share-of-voice and rank movement alerts."
        />
        <PillarCard
          icon={<Sparkles className="size-4" strokeWidth={2.25} />}
          label="AI Recommendation"
          title="ChatGPT, Claude, Gemini, Perplexity"
          body="Per-engine citation share, sentiment, and competitor head-to-head — with the exact prompts and answers behind every number."
        />
        <PillarCard
          icon={<FileCode2 className="size-4" strokeWidth={2.25} />}
          label="AI Understanding"
          title="Schema, llms.txt, crawler access"
          body="Page-level audit of structured data, semantic clarity, and which AI crawlers can — and can't — read your site."
        />
      </div>

      <div className="mt-14 flex items-center justify-center gap-6 text-xs text-muted-foreground/80">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-foreground/40" />
          Evidence for every score
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-foreground/40" />
          Weekly run cadence
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-foreground/40" />
          No setup required
        </span>
      </div>
    </div>
  );
}

interface PillarCardProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
}

function PillarCard({ icon, label, title, body }: PillarCardProps) {
  return (
    <div className="group relative rounded-2xl border border-border/70 bg-card/70 p-5 backdrop-blur-sm transition-colors hover:border-border hover:bg-card">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground leading-snug">
        {title}
      </p>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {body}
      </p>
    </div>
  );
}
