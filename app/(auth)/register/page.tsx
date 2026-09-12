import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { BrandMark } from "@/components/layout/BrandMark";
import { GuestGuard } from "@/components/layout/GuestGuard";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Register as a doctor" };

/**
 * Public self-service doctor registration — there is deliberately none of
 * this on the patient platform itself (see the design note in
 * `doctorApplications.controller.ts`/`doctor.repository.ts` there); this is
 * the new front door for it. Submission goes straight from the browser to
 * the patient platform's public, rate-limited API — see
 * `features/doctor-applications/doctor-applications.api.ts` for why this is
 * the one feature that bypasses the BFF.
 */
export default function RegisterPage() {
  return (
    <GuestGuard>
      <div className="flex min-h-dvh flex-col bg-background">
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-[30rem]">
            <div className="mb-8 flex justify-center">
              <BrandMark />
            </div>

            <Card className="shadow-raised">
              <CardHeader>
                <h1 className="text-xl font-semibold tracking-tight text-text">
                  Register as a doctor
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Submit your NMR registration details and certificate for verification. An admin
                  reviews every application before an account is created.
                </p>
              </CardHeader>

              <CardContent>
                <RegisterForm />
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-text-tertiary">
              Already have an account?{" "}
              <Link href="/login" className="underline">
                Sign in
              </Link>
              {" · "}
              Already applied?{" "}
              <Link href="/application-status" className="underline">
                Check your status
              </Link>
            </p>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
