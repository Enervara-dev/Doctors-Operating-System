import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandMark } from "@/components/layout/BrandMark";
import { GuestGuard } from "@/components/layout/GuestGuard";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Demo credentials, shown only when a deployment sets them.
 *
 * These used to be hardcoded, and drifted the moment authentication moved to
 * the patient platform: the page went on advertising an account that no longer
 * existed, so every demo login failed with "invalid credentials" while the
 * screen insisted the credentials were right. Reading them from config means
 * the hint is either true or absent, and a production deploy that sets neither
 * renders nothing at all.
 *
 * Baked in at build time, like every NEXT_PUBLIC_ value — changing them needs
 * a rebuild, not just a restart.
 */
const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;
const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

export default function LoginPage() {
  return (
    <GuestGuard>
      <div className="flex min-h-dvh flex-col bg-background">
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-[26rem]">
            <div className="mb-8 flex justify-center">
              <BrandMark />
            </div>

            <Card className="shadow-raised">
              <CardHeader>
                <h1 className="text-xl font-semibold tracking-tight text-text">
                  Sign in to your workspace
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Access your appointments, patients and consultations.
                </p>
              </CardHeader>

              <CardContent>
                <LoginForm />

                {demoEmail && demoPassword ? (
                  <div className="mt-6 rounded-control border border-dashed border-border-default bg-surface-subtle px-4 py-3">
                    <p className="text-eyebrow text-text-tertiary">Demo account</p>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <dt className="text-text-secondary">Email</dt>
                      <dd className="font-mono break-all text-text">{demoEmail}</dd>
                      <dt className="text-text-secondary">Password</dt>
                      <dd className="font-mono break-all text-text">{demoPassword}</dd>
                    </dl>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-text-tertiary">
              Authorised clinicians only. Access to a patient record is logged.
            </p>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
