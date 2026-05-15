"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingState } from "@/components/onboarding/onboarding-gate";

export default function HomePage() {
  const router = useRouter();
  const { hasOnboarded } = useOnboardingState();

  useEffect(() => {
    router.replace(hasOnboarded ? "/dashboard" : "/onboarding");
  }, [hasOnboarded, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-sm text-muted-foreground">Loading…</div>
    </div>
  );
}
