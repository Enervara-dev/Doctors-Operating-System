import type { ConsultationStep } from "../domain/types";

/**
 * Canonical step order. The frontend keeps its own copy in
 * `lib/constants/consultation.ts` — the shared `types/` package is
 * declaration-only by design, so ordered runtime values cannot live there
 * without creating the frontend/backend runtime coupling Phase 1 forbids.
 */
export const STEP_ORDER: readonly ConsultationStep[] = [
  "BRIEF",
  "ACTIVE_CONSULTATION",
  "ASSESSMENT",
  "INVESTIGATIONS",
  "DIAGNOSIS",
  "TREATMENT",
  "FOLLOW_UP",
  "SUMMARY",
];

export function stepIndex(step: ConsultationStep): number {
  return STEP_ORDER.indexOf(step);
}

export function isStep(value: unknown): value is ConsultationStep {
  return typeof value === "string" && STEP_ORDER.includes(value as ConsultationStep);
}

/** The later of two steps, used to advance `furthestStep` monotonically. */
export function furthestOf(a: ConsultationStep, b: ConsultationStep): ConsultationStep {
  return stepIndex(a) >= stepIndex(b) ? a : b;
}
