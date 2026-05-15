"use client";

import { createContext, useContext, type ReactNode } from "react";
import { CURRENT_USER } from "@/lib/mocks/fixtures";
import type { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser;
  loading: false;
  refresh: () => void;
}

const value: AuthContextValue = {
  user: CURRENT_USER,
  loading: false,
  refresh: () => {},
};

const AuthContext = createContext<AuthContextValue>(value);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
