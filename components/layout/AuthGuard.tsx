"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShellSkeleton } from "./AppShellSkeleton";
import { selectIsAuthenticated, useAuthStore } from "@/stores/auth.store";

/**
 * Client-side route protection. Phase 1 auth is a mock token held in the
 * browser, so the guard lives here rather than in middleware; once real
 * cookie-based sessions land, this moves to `middleware.ts` unchanged in intent.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace("/login");
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) return <AppShellSkeleton />;

  return <>{children}</>;
}
