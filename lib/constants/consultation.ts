import {
  ClipboardList,
  FlaskConical,
  HeartPulse,
  NotebookPen,
  Pill,
  Stethoscope,
  CalendarClock,
  FileCheck2,
  type LucideIcon,
} from "lucide-react";
import type { ConsultationStatus, ConsultationStep } from "@/types";
import type { Tone } from "./appointment";

/**
 * Canonical step order.
 *
 * The backend keeps its own copy in `backend/src/lib/consultation-steps.ts`.
 * The shared `types/` package is declaration-only by design, so ordered runtime
 * values cannot live there without creating frontend/backend runtime coupling.
 */
export const CONSULTATION_STEPS: readonly ConsultationStep[] = [
  "BRIEF",
  "ACTIVE_CONSULTATION",
  "ASSESSMENT",
  "INVESTIGATIONS",
  "DIAGNOSIS",
  "TREATMENT",
  "FOLLOW_UP",
  "SUMMARY",
];

interface StepMeta {
  /** Full label used in the workspace heading. */
  label: string;
  /** Compact label for the navigation rail and mobile stepper. */
  shortLabel: string;
  /** URL segment under `/consultations/[consultationId]/`. */
  slug: string;
  description: string;
  icon: LucideIcon;
}

export const CONSULTATION_STEP_META: Record<ConsultationStep, StepMeta> = {
  BRIEF: {
    label: "Pre-consultation brief",
    shortLabel: "Brief",
    slug: "brief",
    description: "What is already known about this patient and this visit.",
    icon: ClipboardList,
  },
  ACTIVE_CONSULTATION: {
    label: "Active consultation",
    shortLabel: "Consultation",
    slug: "consultation",
    description: "Record the history and your notes for this visit.",
    icon: Stethoscope,
  },
  ASSESSMENT: {
    label: "Clinical assessment",
    shortLabel: "Assessment",
    slug: "assessment",
    description: "Record examination findings and observations.",
    icon: HeartPulse,
  },
  INVESTIGATIONS: {
    label: "Investigations",
    shortLabel: "Investigations",
    slug: "investigations",
    description: "Decide what to order and why.",
    icon: FlaskConical,
  },
  DIAGNOSIS: {
    label: "Diagnosis",
    shortLabel: "Diagnosis",
    slug: "diagnosis",
    description: "Your assessment for this consultation.",
    icon: NotebookPen,
  },
  TREATMENT: {
    label: "Medication & treatment",
    shortLabel: "Treatment",
    slug: "treatment",
    description: "Prescriptions and non-pharmacological management.",
    icon: Pill,
  },
  FOLLOW_UP: {
    label: "Follow-up",
    shortLabel: "Follow-up",
    slug: "follow-up",
    description: "What happens after this visit.",
    icon: CalendarClock,
  },
  SUMMARY: {
    label: "Consultation summary",
    shortLabel: "Summary",
    slug: "summary",
    description: "Review everything, then finalize the record.",
    icon: FileCheck2,
  },
};

const SLUG_TO_STEP = new Map<string, ConsultationStep>(
  CONSULTATION_STEPS.map((step) => [CONSULTATION_STEP_META[step].slug, step]),
);

export function stepFromSlug(slug: string): ConsultationStep | null {
  return SLUG_TO_STEP.get(slug) ?? null;
}

export function stepSlug(step: ConsultationStep): string {
  return CONSULTATION_STEP_META[step].slug;
}

export function consultationStepIndex(step: ConsultationStep): number {
  return CONSULTATION_STEPS.indexOf(step);
}

export function stepHref(consultationId: string, step: ConsultationStep): string {
  return `/consultations/${encodeURIComponent(consultationId)}/${stepSlug(step)}`;
}

export function previousStep(step: ConsultationStep): ConsultationStep | null {
  return CONSULTATION_STEPS[consultationStepIndex(step) - 1] ?? null;
}

export function nextStep(step: ConsultationStep): ConsultationStep | null {
  return CONSULTATION_STEPS[consultationStepIndex(step) + 1] ?? null;
}

export type StepAvailability = "completed" | "current" | "available" | "locked";

/**
 * A step is reachable once it has been reached before, or when it is the single
 * step immediately after the furthest point the doctor has got to. Everything
 * already visited stays open for review and editing.
 */
export function stepAvailability(
  step: ConsultationStep,
  currentStep: ConsultationStep,
  furthestStep: ConsultationStep,
  completedSteps: readonly ConsultationStep[],
): StepAvailability {
  if (step === currentStep) return "current";
  if (completedSteps.includes(step)) return "completed";
  return consultationStepIndex(step) <= consultationStepIndex(furthestStep)
    ? "available"
    : "locked";
}

interface StatusMeta {
  label: string;
  tone: Tone;
}

export const CONSULTATION_STATUS_META: Record<ConsultationStatus, StatusMeta> = {
  NOT_STARTED: { label: "Not started", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "primary" },
  DRAFT: { label: "Draft", tone: "info" },
  READY_FOR_REVIEW: { label: "Ready for review", tone: "warning" },
  FINALIZED: { label: "Finalized", tone: "success" },
};

export const ALLERGY_SEVERITY_TONE = {
  MILD: "neutral",
  MODERATE: "warning",
  SEVERE: "error",
  CRITICAL: "error",
} as const satisfies Record<string, Tone>;

export const DIAGNOSIS_CERTAINTY_LABELS = {
  PROVISIONAL: "Provisional",
  WORKING: "Working",
  CONFIRMED: "Confirmed",
} as const;

export const INVESTIGATION_URGENCY_LABELS = {
  ROUTINE: "Routine",
  URGENT: "Urgent",
  STAT: "Stat",
} as const;

export const MEDICAL_HISTORY_CATEGORY_LABELS = {
  CHRONIC_CONDITION: "Chronic condition",
  PAST_DIAGNOSIS: "Past diagnosis",
  SURGERY: "Surgery",
  HOSPITALISATION: "Hospitalisation",
  FAMILY_HISTORY: "Family history",
  LIFESTYLE: "Lifestyle",
} as const;

export const FINDING_CATEGORY_LABELS = {
  VITALS: "Vitals",
  GENERAL_EXAMINATION: "General examination",
  SYSTEMIC_EXAMINATION: "Systemic examination",
  OBSERVATION: "Observation",
} as const;

export const SYMPTOM_SEVERITY_LABELS = {
  MILD: "Mild",
  MODERATE: "Moderate",
  SEVERE: "Severe",
} as const;

/**
 * How the doctor has dispositioned a suggested differential. Deliberately never
 * phrased as confirming a diagnosis — accepting keeps it under consideration.
 */
export const DISPOSITION_META = {
  PENDING: { label: "Not reviewed", tone: "neutral" as Tone },
  ACCEPTED_FOR_CONSIDERATION: { label: "Accepted for consideration", tone: "primary" as Tone },
  REJECTED: { label: "Rejected", tone: "error" as Tone },
  IGNORED: { label: "Ignored", tone: "neutral" as Tone },
} as const;
