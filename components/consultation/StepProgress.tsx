"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, Lock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  CONSULTATION_STEPS,
  CONSULTATION_STEP_META,
  consultationStepIndex,
  stepAvailability,
  stepHref,
} from "@/lib/constants/consultation";
import { cn } from "@/lib/utils/cn";
import { useConsultationStore } from "@/stores/consultation.store";
import type { Consultation, ConsultationStep } from "@/types";

/**
 * Compact stepper for screens without room for the rail. It shows position at a
 * glance and expands into a step selector — never a shrunken desktop sidebar.
 */
export function StepProgress({ consultation }: { consultation: Consultation }) {
  const router = useRouter();
  const goToStep = useConsultationStore((state) => state.goToStep);
  const saveDraft = useConsultationStore((state) => state.saveDraft);

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const currentIndex = consultationStepIndex(consultation.currentStep);
  const total = CONSULTATION_STEPS.length;
  const meta = CONSULTATION_STEP_META[consultation.currentStep];

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function navigate(step: ConsultationStep) {
    setIsOpen(false);
    if (step === consultation.currentStep) return;
    await saveDraft();
    await goToStep(step);
    router.push(stepHref(consultation.id, step));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-3 rounded-card border border-border-default bg-surface px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="text-eyebrow text-text-tertiary">
            Step {currentIndex + 1} of {total}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-text">
            {meta.label}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 shrink-0 text-text-tertiary transition-transform", isOpen && "rotate-180")}
        />
      </button>

      <div aria-hidden className="mt-2 flex gap-1">
        {CONSULTATION_STEPS.map((step, index) => (
          <span
            key={step}
            className={cn(
              "h-1 flex-1 rounded-full",
              index < currentIndex
                ? "bg-primary"
                : index === currentIndex
                  ? "bg-primary"
                  : "bg-border-default",
            )}
          />
        ))}
      </div>

      {isOpen ? (
        <ul
          id={listId}
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-card border border-border-default bg-surface shadow-overlay"
        >
          {CONSULTATION_STEPS.map((step, index) => {
            const availability = stepAvailability(
              step,
              consultation.currentStep,
              consultation.furthestStep,
              consultation.completedSteps,
            );
            const isLocked = availability === "locked";

            return (
              <li key={step}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => void navigate(step)}
                  aria-current={availability === "current" ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
                    availability === "current"
                      ? "bg-primary-subtle font-semibold text-text"
                      : "text-text-secondary hover:bg-surface-muted",
                    isLocked && "cursor-not-allowed text-text-tertiary hover:bg-transparent",
                  )}
                >
                  <span
                    aria-hidden
                    className="flex size-5 shrink-0 items-center justify-center text-xs text-text-tertiary"
                  >
                    {availability === "completed" ? (
                      <Check className="size-3.5 text-primary" />
                    ) : isLocked ? (
                      <Lock className="size-3" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {CONSULTATION_STEP_META[step].shortLabel}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
