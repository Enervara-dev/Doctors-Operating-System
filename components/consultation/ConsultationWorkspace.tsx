"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { PanelRightOpen } from "lucide-react";
import { AllergyBanner } from "./AllergyBanner";
import { ConsultationHeader } from "./ConsultationHeader";
import { StepFooter } from "./StepFooter";
import { StepNav } from "./StepNav";
import { StepProgress } from "./StepProgress";
import { PatientContextPanel } from "./context/PatientContextPanel";
import { Alert } from "@/components/ui/Alert";
import { buttonVariants } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useConsultationStore } from "@/stores/consultation.store";
import {
  filterCriticalAllergies,
  selectAllergies,
  usePatientContextStore,
} from "@/stores/patient-context.store";
import { useClinicalIntelligenceStore } from "@/stores/clinical-intelligence.store";
import type { ConsultationStep } from "@/types";

function WorkspaceSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b border-border-default bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function ConsultationWorkspace({
  consultationId,
  step,
  children,
}: {
  consultationId: string;
  step: ConsultationStep;
  children: ReactNode;
}) {
  const consultation = useConsultationStore((state) => state.consultation);
  const status = useConsultationStore((state) => state.status);
  const failure = useConsultationStore((state) => state.failure);
  const saveFailure = useConsultationStore((state) => state.saveFailure);
  const load = useConsultationStore((state) => state.load);
  const goToStep = useConsultationStore((state) => state.goToStep);

  const patientContext = usePatientContextStore((state) => state.context);
  const contextStatus = usePatientContextStore((state) => state.status);
  const contextFailure = usePatientContextStore((state) => state.failure);
  const loadContext = usePatientContextStore((state) => state.load);
  const allergies = usePatientContextStore(selectAllergies);
  const criticalAllergies = useMemo(() => filterCriticalAllergies(allergies), [allergies]);

  const loadIntelligence = useClinicalIntelligenceStore((state) => state.load);

  useEffect(() => {
    void load(consultationId);
  }, [consultationId, load]);

  const patientId = consultation?.patientId;
  useEffect(() => {
    if (patientId) void loadContext(patientId);
  }, [patientId, loadContext]);

  useEffect(() => {
    if (consultation?.id) void loadIntelligence(consultation.id);
  }, [consultation?.id, loadIntelligence]);

  // The URL is the source of truth for "where am I". When the doctor arrives by
  // link or the browser's back button, the record is brought into line with it.
  const syncedStepRef = useRef<string | null>(null);
  const serverStep = consultation?.currentStep;
  useEffect(() => {
    if (!consultation || !serverStep) return;
    if (serverStep === step) {
      syncedStepRef.current = step;
      return;
    }
    if (syncedStepRef.current === step) return;
    syncedStepRef.current = step;
    void goToStep(step);
  }, [consultation, serverStep, step, goToStep]);

  const retryContext = useCallback(() => {
    if (patientId) void loadContext(patientId, { force: true });
  }, [patientId, loadContext]);

  const retryConsultation = useCallback(() => {
    void load(consultationId, { force: true });
  }, [consultationId, load]);

  if (status === "error") {
    const isMissing = failure?.code === "CONSULTATION_NOT_FOUND";
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4">
        {isMissing ? (
          <EmptyState
            icon={PanelRightOpen}
            title="This consultation is no longer available"
            description="Consultations are held in memory for this session only. Open the patient again from your dashboard to start a new one."
            action={
              <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Back to dashboard
              </Link>
            }
            className="w-full"
          />
        ) : (
          <ErrorState
            title="Unable to open this consultation"
            description={failure?.message ?? "Please try again in a moment."}
            onRetry={retryConsultation}
            className="w-full"
          />
        )}
      </div>
    );
  }

  if (!consultation || status !== "ready") return <WorkspaceSkeleton />;

  // During the live consultation the transcript and Clinical Intelligence are
  // the priority, so the workspace gives them the full width and moves patient
  // context into the collapsible section rather than a permanent column.
  const isLiveStep = step === "LIVE_CONSULTATION";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <ConsultationHeader
        consultation={consultation}
        demographics={patientContext?.demographics ?? null}
      />
      <AllergyBanner allergies={criticalAllergies} />

      <div className="mx-auto w-full max-w-[100rem] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <div
          className={
            isLiveStep
              ? "grid gap-5 lg:grid-cols-[13.5rem_minmax(0,1fr)]"
              : "grid gap-5 lg:grid-cols-[13.5rem_minmax(0,1fr)] xl:grid-cols-[13.5rem_minmax(0,1fr)_20rem]"
          }
        >
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <StepNav consultation={consultation} />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="lg:hidden">
              <StepProgress consultation={consultation} />
            </div>

            {consultation.status === "FINALIZED" ? (
              <Alert tone="success" title="This consultation has been finalized">
                The record is read-only. Amendments to finalized records arrive in a later phase.
              </Alert>
            ) : null}

            {saveFailure ? <Alert tone="error" title={saveFailure.message} /> : null}

            {children}

            

            {/*
              Below xl the context column has nowhere to sit, so it becomes a
              collapsible section here — after the clinical task, never in front
              of it. Critical allergies stay in the banner regardless.
            */}
            <div className={isLiveStep ? "" : "xl:hidden"}>
              <div className="rounded-card border border-border-default bg-surface px-4 py-3">
                <Disclosure
                  summary={
                    <span className="text-sm font-semibold text-text">Patient context</span>
                  }
                  panelClassName="-mx-4 -mb-3"
                >
                  <PatientContextPanel
                    context={patientContext}
                    status={contextStatus}
                    failure={contextFailure}
                    onRetry={retryContext}
                    className="rounded-none border-x-0 border-b-0"
                  />
                </Disclosure>
              </div>
            </div>

            <StepFooter consultation={consultation} step={step} />
          </div>

          <div className={isLiveStep ? "hidden" : "hidden xl:block"}>
            <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto">
              <PatientContextPanel
                context={patientContext}
                status={contextStatus}
                failure={contextFailure}
                onRetry={retryContext}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
