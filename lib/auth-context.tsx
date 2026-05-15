"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/types";

interface MeResponse extends Partial<AuthUser> {
  needsOnboarding?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Re-fetch the current user from /api/me */
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: meResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json() as Promise<MeResponse>;
    },
    retry: false,
  });

  const needsOnboarding = meResponse?.needsOnboarding === true;
  const user =
    !needsOnboarding && meResponse?.id ? (meResponse as AuthUser) : null;

  // Redirect to login on auth failure, or to onboarding if needed
  useEffect(() => {
    if (isLoading) return;
    if (isError) {
      window.location.href = "/login";
    } else if (needsOnboarding) {
      window.location.href = "/onboarding";
    }
  }, [isLoading, isError, needsOnboarding]);

  // Listen for Supabase auth state changes (token refresh, sign-out)
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        window.location.href = "/login";
      }
      if (event === "TOKEN_REFRESHED") {
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <AuthContext.Provider value={{ user, loading: isLoading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
