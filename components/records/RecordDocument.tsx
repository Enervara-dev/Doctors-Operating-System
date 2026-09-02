"use client";

import { ShieldCheck } from "lucide-react";
import { StepEmpty } from "@/components/consultation/steps/StepSection";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Disclosure } from "@/components/ui/Disclosure";
import {
  ALLERGY_SEVERITY_TONE,
  DIAGNOSIS_CERTAINTY_LABELS,
  DISPOSITION_META,
  INVESTIGATION_URGENCY_LABELS,
  MEDICAL_HISTORY_CATEGORY_LABELS,
} from "@/lib/constants/consultation";
import { ACCESS_METHOD_LABELS } from "@/lib/constants/patient-access";
import { formatHistoricalDate, formatTimestamp } from "@/lib/utils/date";
import type { ConsultationRecord } from "@/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function Prose({ value, fallback }: { value: string; fallback: string }) {
  if (!value.trim()) return <StepEmpty>{fallback}</StepEmpty>;
  return <p className="text-sm leading-relaxed whitespace-pre-wrap text-text">{value}</p>;
}

/** The finalized clinical record, rendered exactly as it was snapshotted. */
export function RecordDocument({ record }: { record: ConsultationRecord }) {
  const { patientContext, consultationContext, finalAssessment, treatmentPlan, followUpPlan } =
    record;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Patient">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-eyebrow text-text-tertiary">Name</dt>
            <dd className="mt-1 text-sm text-text">{patientContext.demographics.fullName}</dd>
          </div>
          <div>
            <dt className="text-eyebrow text-text-tertiary">Age & sex</dt>
            <dd className="mt-1 text-sm text-text">
              {patientContext.demographics.age} years · {patientContext.demographics.gender.toLowerCase()}
            </dd>
          </div>
          <div>
            <dt className="text-eyebrow text-text-tertiary">Blood group</dt>
            <dd className="mt-1 text-sm text-text">
              {patientContext.demographics.bloodGroup ?? "Not recorded"}
            </dd>
          </div>
          <div>
            <dt className="text-eyebrow text-text-tertiary">Consultation</dt>
            <dd className="mt-1 text-sm text-text">
              {formatHistoricalDate(record.consultationDateTime.slice(0, 10))}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-default pt-4">
          <ShieldCheck aria-hidden className="size-4 text-text-tertiary" />
          {record.authorization ? (
            <p className="text-xs text-text-secondary">
              Authorised via {ACCESS_METHOD_LABELS[record.authorization.method].toLowerCase()} ·{" "}
              {record.authorization.status.toLowerCase()} · granted{" "}
              {formatTimestamp(record.authorization.grantedAt)}
            </p>
          ) : (
            <p className="text-xs text-text-tertiary">
              No authorization snapshot was captured for this consultation.
            </p>
          )}
        </div>
      </Section>

      {patientContext.allergies.length > 0 ? (
        <Card className="border-error-border bg-error-subtle p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-text">Allergies at time of consultation</h2>
          <ul className="mt-3 space-y-2">
            {patientContext.allergies.map((allergy) => (
              <li key={allergy.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-text">{allergy.substance}</p>
                  <Badge tone={ALLERGY_SEVERITY_TONE[allergy.severity]}>
                    {allergy.severity.toLowerCase()}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary">{allergy.reaction}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Section title="Chief complaint and history">
        <Prose value={consultationContext.chiefComplaint} fallback="No chief complaint recorded." />
        {consultationContext.historyOfPresentIllness ? (
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-text-secondary">
            {consultationContext.historyOfPresentIllness}
          </p>
        ) : null}

        {consultationContext.symptoms.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {consultationContext.symptoms.map((symptom) => (
              <li key={symptom.id}>
                <Badge>
                  {symptom.name}
                  {symptom.duration ? ` · ${symptom.duration}` : ""}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {consultationContext.symptomTimeline.length > 0 ? (
          <ol className="mt-4 space-y-1.5 text-sm">
            {consultationContext.symptomTimeline.map((event) => (
              <li key={event.id} className="text-text-secondary">
                <span className="font-medium text-text">{event.label}</span> — {event.description}
              </li>
            ))}
          </ol>
        ) : null}
      </Section>

      <Section title="Relevant medical history">
        {patientContext.medicalHistory.length === 0 ? (
          <StepEmpty>No medical history recorded.</StepEmpty>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {patientContext.medicalHistory.map((item) => (
              <li key={item.id}>
                <span className="text-text">{item.label}</span>
                <span className="text-text-tertiary">
                  {" "}
                  · {MEDICAL_HISTORY_CATEGORY_LABELS[item.category]}
                  {item.since ? ` · since ${item.since}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {patientContext.currentMedications.length > 0 ? (
          <div className="mt-4 border-t border-border-default pt-4">
            <p className="text-eyebrow text-text-tertiary">Medications at time of consultation</p>
            <ul className="mt-2 space-y-1 text-sm">
              {patientContext.currentMedications.map((medication) => (
                <li key={medication.id} className="text-text">
                  {medication.name}{" "}
                  <span className="text-text-secondary">
                    {medication.dosage} · {medication.frequency}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section title="Consultation notes">
        <Prose
          value={consultationContext.doctorNotes}
          fallback="No consultation notes recorded."
        />
        {consultationContext.additionalObservations ? (
          <p className="mt-3 text-sm whitespace-pre-wrap text-text-secondary">
            {consultationContext.additionalObservations}
          </p>
        ) : null}
      </Section>

      <Section title="Clinical findings">
        {record.clinicalFindings.length === 0 ? (
          <StepEmpty>No findings recorded.</StepEmpty>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            {record.clinicalFindings.map((finding) => (
              <div key={finding.id}>
                <dt className="text-eyebrow text-text-tertiary">{finding.label}</dt>
                <dd className="mt-0.5 text-sm text-text">{finding.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      <Section title="Clinical intelligence and your review of it">
        {record.aiRecommendations ? (
          <p className="text-sm text-text-secondary">
            Intelligence availability at consultation:{" "}
            <span className="text-text">{record.aiRecommendations.availability.toLowerCase()}</span>
            {record.aiRecommendations.provenance === "FIXTURE" ? (
              <Badge tone="warning" className="ml-2">
                Test fixture
              </Badge>
            ) : null}
          </p>
        ) : (
          <p className="text-sm text-text-secondary">
            No clinical intelligence was available during this consultation.
          </p>
        )}

        {record.differentialReviews.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {record.differentialReviews.map((review) => {
              const meta = DISPOSITION_META[review.disposition];
              return (
                <li key={review.differentialId} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-text">{review.condition}</span>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {review.doctorNote ? (
                    <span className="w-full text-xs text-text-secondary">{review.doctorNote}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-tertiary">
            No suggested differentials were reviewed.
          </p>
        )}

        <p className="mt-4 border-t border-border-default pt-3 text-xs text-text-tertiary">
          Suggestions are recorded for audit only. They never became the assessment below, which
          was authored by the doctor.
        </p>
      </Section>

      <Section title="Final doctor assessment">
        {finalAssessment.primary ? (
          <ul className="space-y-2">
            <li className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text">
                {finalAssessment.primary.condition}
              </span>
              <Badge tone="primary">Primary</Badge>
              <Badge>{DIAGNOSIS_CERTAINTY_LABELS[finalAssessment.primary.certainty]}</Badge>
              {finalAssessment.primary.notes ? (
                <span className="w-full text-xs text-text-secondary">
                  {finalAssessment.primary.notes}
                </span>
              ) : null}
            </li>
            {finalAssessment.additional.map((diagnosis) => (
              <li key={diagnosis.id} className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-text">{diagnosis.condition}</span>
                <Badge>Additional</Badge>
                <Badge>{DIAGNOSIS_CERTAINTY_LABELS[diagnosis.certainty]}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <StepEmpty>No assessment recorded.</StepEmpty>
        )}

        {finalAssessment.notes ? (
          <p className="mt-4 text-sm whitespace-pre-wrap text-text-secondary">
            {finalAssessment.notes}
          </p>
        ) : null}

        <p className="mt-3 text-xs text-text-tertiary">
          Recorded by {record.doctorName} on {formatTimestamp(finalAssessment.decidedAt)}
        </p>
      </Section>

      <Section title="Investigations">
        {record.investigations.length === 0 ? (
          <StepEmpty>No investigations ordered.</StepEmpty>
        ) : (
          <ul className="space-y-2.5">
            {record.investigations.map((investigation) => (
              <li key={investigation.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-text">{investigation.name}</span>
                  <Badge>{INVESTIGATION_URGENCY_LABELS[investigation.urgency]}</Badge>
                </div>
                {investigation.purpose ? (
                  <p className="text-xs text-text-secondary">{investigation.purpose}</p>
                ) : null}
                {investigation.clinicalQuestion ? (
                  <p className="text-xs text-text-tertiary">
                    Question: {investigation.clinicalQuestion}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Medications and treatment">
        {record.medications.length === 0 ? (
          <StepEmpty>No medications prescribed.</StepEmpty>
        ) : (
          <ul className="space-y-2">
            {record.medications.map((medication) => (
              <li key={medication.id} className="text-sm">
                <span className="font-medium text-text">{medication.name}</span>{" "}
                <span className="text-text-secondary">
                  {medication.dosage} · {medication.frequency} · {medication.duration}
                </span>
                {medication.instructions ? (
                  <span className="block text-xs text-text-tertiary">
                    {medication.instructions}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {treatmentPlan.nonPharmacological.length > 0 || treatmentPlan.procedures.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {[...treatmentPlan.nonPharmacological, ...treatmentPlan.procedures].map((entry) => (
              <li key={entry}>
                <Badge>{entry}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {treatmentPlan.advice ? (
          <p className="mt-4 text-sm whitespace-pre-wrap text-text-secondary">
            {treatmentPlan.advice}
          </p>
        ) : null}
      </Section>

      <Section title="Follow-up">
        {followUpPlan && (followUpPlan.date || followUpPlan.interval || followUpPlan.reason) ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-eyebrow text-text-tertiary">When</dt>
              <dd className="mt-0.5 text-sm text-text">
                {[
                  followUpPlan.date ? formatHistoricalDate(followUpPlan.date) : null,
                  followUpPlan.interval || null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-eyebrow text-text-tertiary">Reason</dt>
              <dd className="mt-0.5 text-sm text-text">{followUpPlan.reason || "—"}</dd>
            </div>
            {followUpPlan.requiredInvestigations.length > 0 ? (
              <div>
                <dt className="text-eyebrow text-text-tertiary">Bring or complete</dt>
                <dd className="mt-0.5 text-sm text-text">
                  {followUpPlan.requiredInvestigations.join(", ")}
                </dd>
              </div>
            ) : null}
            {followUpPlan.symptomMonitoring.length > 0 ? (
              <div>
                <dt className="text-eyebrow text-text-tertiary">Monitor</dt>
                <dd className="mt-0.5 text-sm text-text">
                  {followUpPlan.symptomMonitoring.join(", ")}
                </dd>
              </div>
            ) : null}
            {followUpPlan.medicationReview ? (
              <div className="sm:col-span-2">
                <dt className="text-eyebrow text-text-tertiary">Medication review</dt>
                <dd className="mt-0.5 text-sm text-text">{followUpPlan.medicationReview}</dd>
              </div>
            ) : null}
            {followUpPlan.escalationInstructions ? (
              <div className="sm:col-span-2">
                <dt className="text-eyebrow text-text-tertiary">Escalation</dt>
                <dd className="mt-0.5 text-sm text-text">
                  {followUpPlan.escalationInstructions}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <StepEmpty>No follow-up plan recorded.</StepEmpty>
        )}
      </Section>

      {record.additionalNotes ? (
        <Section title="Additional notes">
          <p className="text-sm whitespace-pre-wrap text-text">{record.additionalNotes}</p>
        </Section>
      ) : null}

      <Card className="p-4 sm:p-5">
        <Disclosure
          summary={
            <span className="text-sm font-semibold text-text">Record provenance</span>
          }
        >
          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-text-secondary">Record id</dt>
              <dd className="font-mono text-text">{record.id}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Consultation id</dt>
              <dd className="font-mono text-text">{record.consultationId}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Version</dt>
              <dd className="text-text">
                {record.version}
                {record.amendedFromRecordId ? ` (amends ${record.amendedFromRecordId})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Finalized</dt>
              <dd className="text-text">{formatTimestamp(record.finalizedAt)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Context captured</dt>
              <dd className="text-text">{formatTimestamp(patientContext.capturedAt)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Superseded by</dt>
              <dd className="text-text">{record.supersededByRecordId ?? "—"}</dd>
            </div>
          </dl>
        </Disclosure>
      </Card>
    </div>
  );
}
