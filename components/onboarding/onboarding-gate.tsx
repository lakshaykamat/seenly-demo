"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  getOnboardingSnapshot,
  subscribeOnboarding,
  type OnboardingSnapshot,
} from "@/lib/mocks/store";

export function useOnboardingState(): OnboardingSnapshot {
  return useSyncExternalStore(
    subscribeOnboarding,
    getOnboardingSnapshot,
    getOnboardingSnapshot
  );
}

export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { hasOnboarded } = useOnboardingState();

  useEffect(() => {
    if (!hasOnboarded) {
      router.replace("/onboarding");
    }
  }, [hasOnboarded, router]);

  if (!hasOnboarded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading workspace…</div>
      </div>
    );
  }

  return <>{children}</>;
}
