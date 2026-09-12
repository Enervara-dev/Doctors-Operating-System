import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { BrandMark } from "@/components/layout/BrandMark";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Set your password" };

/**
 * Reachable by any signed-in doctor — not only one on a forced first-login
 * change. `AuthGuard` (not `GuestGuard`) is what's required here: a doctor
 * with `mustChangePassword` is redirected here by `PasswordChangeGuard`
 * inside `(doctor)/layout.tsx`; one without it can still open this page
 * directly, as an ordinary "change my password" screen.
 */
export default function ChangePasswordPage() {
  return (
    <AuthGuard>
      <ChangePasswordPageContent />
    </AuthGuard>
  );
}

function ChangePasswordPageContent() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[26rem]">
          <div className="mb-8 flex justify-center">
            <BrandMark />
          </div>

          <Card className="shadow-raised">
            <CardHeader>
              <h1 className="text-xl font-semibold tracking-tight text-text">Set your password</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Choose a new password for your account.
              </p>
            </CardHeader>

            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-text-tertiary">
            Trouble signing in? Contact{" "}
            <a href="mailto:admin@enervara.com" className="underline">
              admin@enervara.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
