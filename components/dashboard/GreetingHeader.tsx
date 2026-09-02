"use client";

import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";
import { formatLongDate, greetingForHour, todayIsoDate } from "@/lib/utils/date";
import { useAuthStore } from "@/stores/auth.store";

export function GreetingHeader() {
  const doctor = useAuthStore((state) => state.doctor);
  // The greeting and date depend on the viewer's clock, so they are resolved
  // only after hydration to keep server and client markup identical.
  const isHydrated = useIsHydrated();
  const now = isHydrated ? new Date() : null;

  return (
    <header>
      <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
        {now ? `${greetingForHour(now)}, ` : "Welcome back, "}
        Dr. {doctor?.displayName ?? ""}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        {now ? formatLongDate(todayIsoDate(now)) : "Loading your day…"}
      </p>
    </header>
  );
}
