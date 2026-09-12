import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { PasswordChangeGuard } from "@/components/layout/PasswordChangeGuard";

/**
 * Every route in this group requires an authenticated doctor who has already
 * completed a forced password change, in that order: `AuthGuard` first
 * (nothing here to protect if not even signed in), then
 * `PasswordChangeGuard`.
 */
export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <PasswordChangeGuard>
        <AppShell>{children}</AppShell>
      </PasswordChangeGuard>
    </AuthGuard>
  );
}
