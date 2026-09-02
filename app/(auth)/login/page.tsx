import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandMark } from "@/components/layout/BrandMark";
import { GuestGuard } from "@/components/layout/GuestGuard";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sign in" };

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

                <div className="mt-6 rounded-control border border-dashed border-border-default bg-surface-subtle px-4 py-3">
                  <p className="text-eyebrow text-text-tertiary">Phase 1 demo account</p>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-text-secondary">Email</dt>
                    <dd className="font-mono text-text">doctor@enervara.com</dd>
                    <dt className="text-text-secondary">Password</dt>
                    <dd className="font-mono text-text">password123</dd>
                  </dl>
                </div>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-text-tertiary">
              Authentication is mocked in this build. No patient data is transmitted.
            </p>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
