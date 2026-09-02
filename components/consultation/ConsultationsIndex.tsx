"use client";

import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CONSULTATION_STATUS_META,
  CONSULTATION_STEP_META,
  stepHref,
} from "@/lib/constants/consultation";
import { useConsultationStore } from "@/stores/consultation.store";
import { usePatientContextStore } from "@/stores/patient-context.store";

/**
 * Consultations are held in memory for the current session, so this lists the
 * one in progress rather than pretending to be a historical archive — that
 * arrives with the records phase and a real database.
 */
export function ConsultationsIndex() {
  const consultation = useConsultationStore((state) => state.consultation);
  const patientContext = usePatientContextStore((state) => state.context);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Consultations"
        description="Consultations you have open in this session."
      />

      {consultation ? (
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-text">
                  {patientContext?.demographics.fullName ?? consultation.patientId}
                </p>
                <Badge tone={CONSULTATION_STATUS_META[consultation.status].tone} withDot>
                  {CONSULTATION_STATUS_META[consultation.status].label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                <span className="font-mono">#{consultation.reference}</span> ·{" "}
                {consultation.consultationType} · currently on{" "}
                {CONSULTATION_STEP_META[consultation.currentStep].label.toLowerCase()}
              </p>
            </div>

            <Link
              href={stepHref(consultation.id, consultation.currentStep)}
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              {consultation.status === "FINALIZED" ? "Open record" : "Resume consultation"}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Stethoscope}
          title="No consultation open"
          description="Open a patient from your dashboard, or through an access code or sharing link, to start a consultation."
          action={
            <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Go to dashboard
            </Link>
          }
        />
      )}
    </div>
  );
}
