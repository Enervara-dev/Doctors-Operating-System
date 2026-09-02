import Link from "next/link";
import { UserSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Shown when a patient-scoped screen is reached without a live access grant —
 * for example after a page reload, since grants are never persisted.
 */
export function NoActiveAccess() {
  return (
    <EmptyState
      icon={UserSearch}
      title="No active patient access"
      description="Patient access is established per session. Choose an access method to continue."
      action={
        <Link href="/patients" className={buttonVariants({ variant: "primary", size: "sm" })}>
          Access a patient
        </Link>
      }
    />
  );
}
