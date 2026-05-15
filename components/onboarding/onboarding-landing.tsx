"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
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

      <div className="mt-16 mx-auto max-w-4xl">
        <TrustBar />
      </div>
    </div>
  );
}

const TRUSTED_BRANDS: Array<{
  name: string;
  accent: string;
  shape: "square" | "diamond" | "circle" | "hex";
}> = [
  { name: "Adspott", accent: "#FF5A5F", shape: "square" },
  { name: "Apparatus AI", accent: "#6366F1", shape: "diamond" },
  { name: "Uplyt", accent: "#10B981", shape: "circle" },
  { name: "YTubeBooster", accent: "#F59E0B", shape: "hex" },
  { name: "OneClip AI", accent: "#8B5CF6", shape: "square" },
];

function TrustBar() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-border/60 border-y border-border/60 py-5">
      <div className="px-6 py-3 sm:py-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
          4 engines
        </p>
        <div className="mt-3 flex items-center gap-3.5 text-foreground/70">
          <OpenAIMark className="size-4" />
          <ClaudeMark className="size-4" />
          <GeminiMark className="size-4" />
          <PerplexityMark className="size-4" />
        </div>
      </div>

      <div className="px-6 py-3 sm:py-0 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
          Trusted by
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
          {TRUSTED_BRANDS.map((b) => (
            <span
              key={b.name}
              title={b.name}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <BrandShape accent={b.accent} shape={b.shape} />
            </span>
          ))}
        </div>
      </div>

      <div className="px-6 py-3 sm:py-0 text-right">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
          Tracking
        </p>
        <div className="mt-1 flex items-baseline justify-end gap-1.5">
          <span className="text-xl font-semibold tabular-nums text-foreground">
            3,247
          </span>
          <span className="text-xs text-muted-foreground">prompts</span>
        </div>
      </div>
    </div>
  );
}

function BrandShape({
  accent,
  shape,
}: {
  accent: string;
  shape: "square" | "diamond" | "circle" | "hex";
}) {
  const common = "size-4 shrink-0 transition-opacity opacity-70 group-hover:opacity-100";
  if (shape === "circle") {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden>
        <circle cx="8" cy="8" r="7" fill={accent} />
        <circle cx="8" cy="8" r="3" fill="var(--background)" />
      </svg>
    );
  }
  if (shape === "diamond") {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden>
        <rect
          x="3"
          y="3"
          width="10"
          height="10"
          fill={accent}
          transform="rotate(45 8 8)"
          rx="1.5"
        />
      </svg>
    );
  }
  if (shape === "hex") {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden>
        <path
          d="M8 1.5 L13.5 4.5 L13.5 11.5 L8 14.5 L2.5 11.5 L2.5 4.5 Z"
          fill={accent}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={common} aria-hidden>
      <rect x="2" y="2" width="12" height="12" rx="3" fill={accent} />
      <rect x="6" y="6" width="4" height="4" rx="0.5" fill="var(--background)" />
    </svg>
  );
}
