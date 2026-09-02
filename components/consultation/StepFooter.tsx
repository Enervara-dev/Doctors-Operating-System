"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  CONSULTATION_STEP_META,
  nextStep,
  previousStep,
  stepHref,
} from "@/lib/constants/consultation";
import { useConsultationStore } from "@/stores/consultation.store";
import type { Consultation, ConsultationStep } from "@/types";

/**
 * Step navigation. "Save & continue" flushes the active step's edits, marks the
 * step complete and advances — one action, so work is never silently dropped.
 */
export function StepFooter({
  consultation,
  step,
}: {
  consultation: Consultation;
  step: ConsultationStep;
}) {
  const router = useRouter();
  const saveDraft = useConsultationStore((state) => state.saveDraft);
  const goToStep = useConsultationStore((state) => state.goToStep);
  const saveState = useConsultationStore((state) => state.saveState);

  const previous = previousStep(step);
  const next = nextStep(step);
  const isBusy = saveState === "SAVING";
  const isFinalized = consultation.status === "FINALIZED";

  async function handlePrevious() {
    if (!previous) return;
    if (!isFinalized) await saveDraft();
    await goToStep(previous);
    router.push(stepHref(consultation.id, previous));
  }

  async function handleNext() {
    if (!next) return;
    if (!isFinalized) {
      const saved = await saveDraft();
      if (!saved) return;
      await goToStep(next, { completing: step });
    } else {
      await goToStep(next);
    }
    router.push(stepHref(consultation.id, next));
  }

  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {previous ? (
          <Button variant="secondary" onClick={() => void handlePrevious()} disabled={isBusy}>
            <ArrowLeft aria-hidden className="size-4" />
            {CONSULTATION_STEP_META[previous].shortLabel}
          </Button>
        ) : null}
      </div>

      <div>
        {next ? (
          <Button fullWidth onClick={() => void handleNext()} isLoading={isBusy}>
            {isFinalized ? "Continue" : "Save & continue"}
            {isBusy ? null : <ArrowRight aria-hidden className="size-4" />}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
