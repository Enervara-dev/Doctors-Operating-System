"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShellSkeleton } from "./AppShellSkeleton";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Composed inside `(doctor)/layout.tsx`, after `AuthGuard`: a doctor still on
 * a temporary credential is redirected to `/change-password` before any
 * dashboard route renders. This is the client-side half of the enforcement —
 * the server-side half is the patient platform's own `requirePasswordChange`
 * middleware, which 403s every doctor route except `/auth/me` and
 * `/auth/change-password` regardless of what this guard does. Neither
 * replaces the other.
 */
export function PasswordChangeGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const mustChangePassword = useAuthStore((state) => state.mustChangePassword);

  useEffect(() => {
    if (hasHydrated && mustChangePassword) router.replace("/change-password");
  }, [hasHydrated, mustChangePassword, router]);

  if (!hasHydrated || mustChangePassword) return <AppShellSkeleton />;

  return <>{children}</>;
}
