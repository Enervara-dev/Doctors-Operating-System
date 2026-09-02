"use client";

import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";
import {
  CONSULTATION_STEPS,
  CONSULTATION_STEP_META,
  stepAvailability,
  stepHref,
  type StepAvailability,
} from "@/lib/constants/consultation";
import { cn } from "@/lib/utils/cn";
import { useConsultationStore } from "@/stores/consultation.store";
import type { Consultation, ConsultationStep } from "@/types";

const MARKER_STYLES: Record<StepAvailability, string> = {
  completed: "border-primary bg-primary text-primary-foreground",
  current: "border-primary bg-primary-subtle text-primary",
  available: "border-border-strong bg-surface text-text-tertiary",
  locked: "border-border-default bg-surface-muted text-text-tertiary",
};

const LABEL_STYLES: Record<StepAvailability, string> = {
  completed: "text-text",
  current: "text-text font-semibold",
  available: "text-text-secondary",
  locked: "text-text-tertiary",
};

function StepMarker({ availability, index }: { availability: StepAvailability; index: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold",
        MARKER_STYLES[availability],
      )}
    >
      {availability === "completed" ? (
        <Check className="size-3.5" />
      ) : availability === "locked" ? (
        <Lock className="size-3" />
      ) : (
        index + 1
      )}
    </span>
  );
}

/**
 * Desktop workflow rail. Steps already reached stay open for review; anything
 * beyond the furthest point reached is locked so the wizard cannot be skipped.
 */
export function StepNav({ consultation }: { consultation: Consultation }) {
  const router = useRouter();
  const goToStep = useConsultationStore((state) => state.goToStep);
  const saveDraft = useConsultationStore((state) => state.saveDraft);

  async function navigate(step: ConsultationStep) {
    if (step === consultation.currentStep) return;
    await saveDraft();
    await goToStep(step);
    router.push(stepHref(consultation.id, step));
  }

  return (
    <nav aria-label="Consultation steps" className="flex flex-col gap-1">
      <p className="mb-2 px-2 text-eyebrow text-text-tertiary">Consultation</p>

      {CONSULTATION_STEPS.map((step, index) => {
        const availability = stepAvailability(
          step,
          consultation.currentStep,
          consultation.furthestStep,
          consultation.completedSteps,
        );
        const meta = CONSULTATION_STEP_META[step];
        const isLocked = availability === "locked";

        return (
          <button
            key={step}
            type="button"
            disabled={isLocked}
            aria-current={availability === "current" ? "step" : undefined}
            onClick={() => void navigate(step)}
            className={cn(
              "flex items-center gap-2.5 rounded-control px-2 py-2 text-left text-sm transition-colors",
              availability === "current" ? "bg-primary-subtle" : "hover:bg-surface-muted",
              isLocked && "cursor-not-allowed hover:bg-transparent",
            )}
          >
            <StepMarker availability={availability} index={index} />
            <span className={cn("min-w-0 flex-1 truncate", LABEL_STYLES[availability])}>
              {meta.shortLabel}
            </span>
            {isLocked ? <span className="sr-only">(locked)</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
