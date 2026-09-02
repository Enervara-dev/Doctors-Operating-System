"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShellSkeleton } from "./AppShellSkeleton";
import { selectIsAuthenticated, useAuthStore } from "@/stores/auth.store";

/** Keeps signed-in doctors off the login screen. */
export function GuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) router.replace("/dashboard");
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || isAuthenticated) return <AppShellSkeleton />;

  return <>{children}</>;
}
