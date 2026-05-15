"use client";

import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/types";
import type { ReactNode } from "react";

interface CanProps {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only if the current user has one of the allowed roles.
 */
export function Can({ roles, children, fallback = null }: CanProps) {
  const { user, loading } = useAuth();

  if (loading || !user) return null;
  if (!roles.includes(user.role)) return <>{fallback}</>;

  return <>{children}</>;
}
