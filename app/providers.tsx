"use client";

import type { ReactNode } from "react";
import { configureApiClient } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Cross-cutting singleton wiring, evaluated once when this client module is
 * first imported. The API client is handed a token provider rather than
 * importing the store, so `lib/api` stays framework-agnostic and testable.
 */
configureApiClient({
  tokenProvider: () => useAuthStore.getState().token,
  unauthorizedHandler: () => useAuthStore.getState().logout(),
});

export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
