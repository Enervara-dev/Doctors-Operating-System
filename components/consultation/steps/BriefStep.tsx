"use client";

import { CircleAlert } from "lucide-react";
import { StepEmpty, StepSection } from "./StepSection";
import { StepHeading } from "../StepHeading";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  ALLERGY_SEVERITY_TONE,
  MEDICAL_HISTORY_CATEGORY_LABELS,
  SYMPTOM_SEVERITY_LABELS,
} from "@/lib/constants/consultation";
import { formatHistoricalDate } from "@/lib/utils/date";
import { formatDemographics } from "@/lib/utils/format";
import { useConsultationStore } from "@/stores/consultation.store";
import { usePatientContextStore } from "@/stores/patient-context.store";
import type { MedicalHistoryCategory, MedicalHistoryItem } from "@/types";

const HISTORY_ORDER: MedicalHistoryCategory[] = [
  "CHRONIC_CONDITION",
  "PAST_DIAGNOSIS",
  "SURGERY",
  "HOSPITALISATION",
  "FAMILY_HISTORY",
  "LIFESTYLE",
];

function groupHistory(items: MedicalHistoryItem[]): [MedicalHistoryCategory, MedicalHistoryItem[]][] {
  return HISTORY_ORDER.map(
    (category) =>
      [category, items.filter((item) => item.category === category)] as [
        MedicalHistoryCategory,
        MedicalHistoryItem[],
      ],
  ).filter(([, group]) => group.length > 0);
}

/**
 * The read-first summary of what is already known. Nothing here is editable —
 * the doctor's own record of the visit begins on the next step.
 */
export function BriefStep() {
  const consultation = useConsultationStore((state) => state.consultation);
  const context = usePatientContextStore((state) => state.context);
  const contextStatus = usePatientContextStore((state) => state.status);
  const contextFailure = usePatientContextStore((state) => state.failure);
  const loadContext = usePatientContextStore((state) => state.load);

  if (!consultation) return null;
  const { caseContext } = consultation;

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step="BRIEF" />

      {contextStatus === "error" ? (
        <ErrorState
          title="Unable to load patient history"
          description={contextFailure?.message ?? "Please try again in a moment."}
          onRetry={() => void loadContext(consultation.patientId, { force: true })}
        />
      ) : null}

      <StepSection
        title="Patient"
        description="Demographics recorded for this patient."
      >
        {contextStatus !== "ready" || !context ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-eyebrow text-text-tertiary">Name</dt>
              <dd className="mt-1 text-sm text-text">{context.demographics.fullName}</dd>
            </div>
            <div>
              <dt className="text-eyebrow text-text-tertiary">Age & sex</dt>
              <dd className="mt-1 text-sm text-text">
                {formatDemographics(context.demographics.age, context.demographics.gender)}
              </dd>
            </div>
            <div>
              <dt className="text-eyebrow text-text-tertiary">Blood group</dt>
              <dd className="mt-1 text-sm text-text">
                {context.demographics.bloodGroup ?? "Not recorded"}
              </dd>
            </div>
            <div>
              <dt className="text-eyebrow text-text-tertiary">Location</dt>
              <dd className="mt-1 text-sm text-text">{context.demographics.city}</dd>
            </div>
          </dl>
        )}
      </StepSection>

      {context && context.allergies.length > 0 ? (
        <StepSection
          title="Allergies"
          description="Confirm these with the patient before prescribing."
          className="border-error-border bg-error-subtle"
        >
          <ul className="space-y-2.5">
            {context.allergies.map((allergy) => (
              <li key={allergy.id} className="flex items-start gap-2.5">
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-error" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-text">{allergy.substance}</p>
                    <Badge tone={ALLERGY_SEVERITY_TONE[allergy.severity]}>
                      {allergy.severity.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-text-secondary">{allergy.reaction}</p>
                  <p className="text-xs text-text-tertiary">
                    Recorded {formatHistoricalDate(allergy.recordedOn)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </StepSection>
      ) : null}

      <StepSection
        title="Chief complaint & history of presenting illness"
        description="Reported by the patient before this visit."
      >
        {caseContext.chiefComplaint ? (
          <p className="text-sm font-medium text-text">{caseContext.chiefComplaint}</p>
        ) : (
          <StepEmpty>No chief complaint was recorded before this visit.</StepEmpty>
        )}
        {caseContext.historyOfPresentIllness ? (
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            {caseContext.historyOfPresentIllness}
          </p>
        ) : null}
      </StepSection>

      <StepSection title="Symptoms">
        {caseContext.symptoms.length === 0 ? (
          <StepEmpty>No symptoms were reported before this visit.</StepEmpty>
        ) : (
          <ul className="divide-y divide-border-default">
            {caseContext.symptoms.map((symptom) => (
              <li key={symptom.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-text">{symptom.name}</span>
                <Badge>{SYMPTOM_SEVERITY_LABELS[symptom.severity]}</Badge>
                <span className="text-xs text-text-secondary">{symptom.duration}</span>
                {symptom.notes ? (
                  <span className="w-full text-xs text-text-tertiary">{symptom.notes}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </StepSection>

      <StepSection
        title="Symptom timeline"
        description="How this episode has developed."
      >
        {caseContext.symptomTimeline.length === 0 ? (
          <StepEmpty>No timeline was recorded for this episode.</StepEmpty>
        ) : (
          <ol className="relative space-y-4 border-l border-border-default pl-5">
            {caseContext.symptomTimeline.map((event) => (
              <li key={event.id} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[1.4375rem] size-2 rounded-full border-2 border-surface bg-primary"
                />
                <p className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
                  {event.label}
                </p>
                <p className="mt-0.5 text-sm text-text">{event.description}</p>
              </li>
            ))}
          </ol>
        )}
      </StepSection>

      <StepSection title="Past medical history">
        {contextStatus !== "ready" || !context ? (
          <Skeleton className="h-24 w-full" />
        ) : context.medicalHistory.length === 0 ? (
          <StepEmpty>No past medical history recorded.</StepEmpty>
        ) : (
          <div className="space-y-4">
            {groupHistory(context.medicalHistory).map(([category, items]) => (
              <div key={category}>
                <p className="text-eyebrow text-text-tertiary">
                  {MEDICAL_HISTORY_CATEGORY_LABELS[category]}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {items.map((item) => (
                    <li key={item.id} className="text-sm">
                      <span className="text-text">{item.label}</span>
                      {item.since ? (
                        <span className="text-text-tertiary"> · since {item.since}</span>
                      ) : null}
                      {item.status === "RESOLVED" ? (
                        <span className="text-text-tertiary"> · resolved</span>
                      ) : null}
                      {item.detail ? (
                        <span className="block text-xs text-text-secondary">{item.detail}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </StepSection>

      <StepSection
        title="Past consultations"
        description="Earlier visits you are authorised to view."
      >
        {contextStatus !== "ready" || !context ? (
          <Skeleton className="h-24 w-full" />
        ) : context.previousConsultations.length === 0 ? (
          <StepEmpty>No previous consultations on record.</StepEmpty>
        ) : (
          <ul className="space-y-3">
            {context.previousConsultations.map((visit) => (
              <li
                key={visit.id}
                className="rounded-control border border-border-default bg-surface-subtle p-3.5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-text">{visit.complaint}</p>
                  <p className="text-xs text-text-tertiary">
                    {formatHistoricalDate(visit.date)}
                    {visit.doctorName ? ` · ${visit.doctorName}` : ""}
                    {visit.specialty ? ` · ${visit.specialty}` : ""}
                  </p>
                </div>
                <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="inline font-medium text-text-secondary">Assessment: </dt>
                    <dd className="inline text-text">{visit.assessment}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-text-secondary">Outcome: </dt>
                    <dd className="inline text-text">{visit.outcome}</dd>
                  </div>
                  {visit.investigations.length > 0 ? (
                    <div>
                      <dt className="inline font-medium text-text-secondary">Investigations: </dt>
                      <dd className="inline text-text">{visit.investigations.join(", ")}</dd>
                    </div>
                  ) : null}
                  {visit.treatment.length > 0 ? (
                    <div>
                      <dt className="inline font-medium text-text-secondary">Treatment: </dt>
                      <dd className="inline text-text">{visit.treatment.join("; ")}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </StepSection>
    </div>
  );
}
