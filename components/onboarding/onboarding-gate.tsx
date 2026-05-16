"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  getOnboardingSnapshot,
  subscribeOnboarding,
  type OnboardingSnapshot,
} from "@/lib/mocks/store";
import { OnboardingLanding } from "@/components/onboarding/onboarding-landing";

export function useOnboardingState(): OnboardingSnapshot {
  return useSyncExternalStore(
    subscribeOnboarding,
    getOnboardingSnapshot,
    getOnboardingSnapshot
  );
}

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { hasOnboarded } = useOnboardingState();
  if (!hasOnboarded) return <OnboardingLanding />;
  return <>{children}</>;
}
