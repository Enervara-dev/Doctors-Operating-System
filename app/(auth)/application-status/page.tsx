import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandMark } from "@/components/layout/BrandMark";
import { GuestGuard } from "@/components/layout/GuestGuard";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ApplicationStatusView } from "@/components/auth/ApplicationStatusView";

export const metadata: Metadata = { title: "Application status" };

export default function ApplicationStatusPage() {
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
                <h1 className="text-xl font-semibold tracking-tight text-text">Application status</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Check the status of your doctor registration application.
                </p>
              </CardHeader>

              <CardContent>
                <Suspense fallback={null}>
                  <ApplicationStatusView />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
