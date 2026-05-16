"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { completeOnboarding, normalizeDomain } from "@/lib/mocks/store";
import {
  FIRST_RUN_STAGES,
  FIRST_RUN_TOTAL_MS,
} from "@/lib/mocks/onboarding-stages";
import { OnboardingActivity } from "./onboarding-activity";
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

  return (
    <>
      <PageHeader title="Overview" />

      {phase === "input" ? (
        <SetupRow
          value={value}
          onChange={(v) => {
            setValue(v);
            if (error) setError(null);
          }}
          onSubmit={handleSubmit}
          onSample={handleSampleRun}
          submitting={submitting}
          error={error}
        />
      ) : (
        <Card>
          <CardContent className="p-6 md:p-8">
            <OnboardingActivity
              domain={submittedDomain}
              stages={FIRST_RUN_STAGES}
              totalMs={FIRST_RUN_TOTAL_MS}
              onDone={handleDone}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function SetupRow({
  value,
  onChange,
  onSubmit,
  onSample,
  submitting,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSample: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <Card className="relative overflow-hidden border-border/80">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 120% at 0% 0%, var(--pillar-ai-soft), transparent 60%)",
          opacity: 0.55,
        }}
      />
      <CardContent className="relative p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Add your domain to populate this workspace
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              We&apos;ll crawl your pages, probe 4 AI engines, and score how
              you&apos;re recommended — about 10 seconds.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="w-full md:w-auto md:min-w-[460px]"
          >
            <div
              className={cn(
                "flex items-center rounded-xl border border-border bg-background/80 shadow-sm transition-colors backdrop-blur-sm",
                "focus-within:border-ring/60",
                error && "border-destructive/60"
              )}
            >
              <span className="pl-3.5 pr-1 text-xs text-muted-foreground/70 select-none">
                https://
              </span>
              <input
                autoFocus
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="acme.com"
                disabled={submitting}
                aria-invalid={Boolean(error)}
                className="flex-1 bg-transparent py-2.5 pr-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="m-1 h-8 rounded-lg px-3 text-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    Analyze
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
              {error ? (
                <span className="text-destructive" role="alert">
                  {error}
                </span>
              ) : (
                <span className="text-muted-foreground/80">
                  Public sites only · no signup beyond this
                </span>
              )}
              <button
                type="button"
                onClick={onSample}
                disabled={submitting}
                className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50 shrink-0"
              >
                Try {COMPANY.brand.domain}
              </button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

