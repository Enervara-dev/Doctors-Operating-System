"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Consultation, PatientContext } from "@/types";

interface ChecklistItem {
  label: string;
  complete: boolean;
  /** Sections that are simply empty, rather than missing something required. */
  optional: boolean;
}

/**
 * A completeness overview of the consultation. It reports what has content, not
 * what is permitted — whether the record can be finalized is decided by the
 * server and shown separately as blocking issues.
 */
function buildItems(
  consultation: Consultation,
  patientContext: PatientContext | null,
): ChecklistItem[] {
  const { caseContext } = consultation;

  return [
    {
      label: "Patient information",
      complete: Boolean(patientContext?.demographics.fullName),
      optional: false,
    },
    {
      label: "Clinical history",
      complete: Boolean(
        patientContext &&
          (patientContext.medicalHistory.length > 0 ||
            patientContext.allergies.length > 0 ||
            patientContext.currentMedications.length > 0),
      ),
      optional: true,
    },
    {
      label: "Consultation notes",
      complete: Boolean(
        caseContext.chiefComplaint.trim() ||
          caseContext.historyOfPresentIllness.trim() ||
          caseContext.doctorNotes.trim(),
      ),
      optional: true,
    },
    {
      label: "Clinical findings",
      complete: caseContext.clinicalFindings.length > 0,
      optional: true,
    },
    {
      label: "Clinical assessment",
      complete: consultation.diagnoses.length > 0,
      optional: false,
    },
    {
      label: "Investigations",
      complete: consultation.investigations.length > 0,
      optional: true,
    },
    {
      label: "Treatment",
      complete:
        consultation.medications.length > 0 ||
        consultation.treatmentPlan.nonPharmacological.length > 0 ||
        consultation.treatmentPlan.procedures.length > 0 ||
        Boolean(consultation.treatmentPlan.advice.trim()),
      optional: true,
    },
    {
      label: "Follow-up",
      complete: Boolean(
        consultation.followUp.date ||
          consultation.followUp.interval.trim() ||
          consultation.followUp.reason.trim(),
      ),
      optional: true,
    },
  ];
}

export function ReviewChecklist({
  consultation,
  patientContext,
}: {
  consultation: Consultation;
  patientContext: PatientContext | null;
}) {
  const items = buildItems(consultation, patientContext);

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full",
              item.complete ? "bg-success-subtle text-success" : "bg-surface-muted text-text-tertiary",
            )}
          >
            {item.complete ? <Check className="size-3" /> : <Circle className="size-2" />}
          </span>
          <span className={cn("text-sm", item.complete ? "text-text" : "text-text-secondary")}>
            {item.label}
          </span>
          {!item.complete ? (
            <span className="text-xs text-text-tertiary">
              {item.optional ? "not recorded" : "required"}
            </span>
          ) : null}
          <span className="sr-only">
            {item.complete ? "recorded" : item.optional ? "not recorded" : "required"}
          </span>
        </li>
      ))}
    </ul>
  );
}
