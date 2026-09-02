import { Spinner } from "@/components/ui/Spinner";

/** Shown while the persisted session is being read back on the client. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <span className="flex items-center gap-2.5 text-sm text-text-secondary">
        <Spinner />
        Loading your workspace…
      </span>
    </div>
  );
}
