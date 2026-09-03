"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleCheckBig, FileText, History, Pencil, TriangleAlert } from "lucide-react";
import { StepEmpty, StepSection } from "./StepSection";
import { ReviewChecklist } from "./ReviewChecklist";
import { StepHeading } from "../StepHeading";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { consultationsApi } from "@/features/consultations/consultations.api";
import { useStepSaver } from "@/features/consultations/use-step-saver";
import { useAsyncResource } from "@/lib/hooks/use-async-resource";
import {
  DIAGNOSIS_CERTAINTY_LABELS,
  INVESTIGATION_URGENCY_LABELS,
  stepHref,
} from "@/lib/constants/consultation";
import { recordHref } from "@/lib/constants/record";
import { formatHistoricalDate } from "@/lib/utils/date";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";
import { usePatientContextStore } from "@/stores/patient-context.store";
import type { ConsultationStep } from "@/types";

function EditLink({
  consultationId,
  step,
  disabled,
}: {
  consultationId: string;
  step: ConsultationStep;
  disabled: boolean;
}) {
  if (disabled) return null;
  return (
    <Link
      href={stepHref(consultationId, step)}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      <Pencil aria-hidden className="size-3.5" />
      Edit
    </Link>
  );
}

function Prose({ value, fallback }: { value: string; fallback: string }) {
  if (!value.trim()) return <StepEmpty>{fallback}</StepEmpty>;
  return <p className="text-sm leading-relaxed whitespace-pre-wrap text-text">{value}</p>;
}

/**
 * The full record for review. Every section links back to the step that owns it,
 * so the doctor edits in one place rather than re-entering data here.
 */
export function SummaryStep() {
  const consultation = useConsultationStore((state) => state.consultation);
  const patch = useConsultationStore((state) => state.patch);
  const finalize = useConsultationStore((state) => state.finalize);
  const markUnsaved = useConsultationStore((state) => state.markUnsaved);
  const saveState = useConsultationStore((state) => state.saveState);
  const saveFailure = useConsultationStore((state) => state.saveFailure);
  const isEditable = useConsultationStore(selectIsEditable);

  const patientContext = usePatientContextStore((state) => state.context);

  const [additionalNotes, setAdditionalNotes] = useState(consultation?.additionalNotes ?? "");
  const [isConfirming, setIsConfirming] = useState(false);
  const [finalizedRecordId, setFinalizedRecordId] = useState<string | null>(null);

  const save = useCallback(() => patch({ additionalNotes }), [additionalNotes, patch]);
  useStepSaver(save);

  // Readiness is the server's assessment, re-read whenever the record changes.
  const consultationId = consultation?.id;
  const updatedAt = consultation?.updatedAt;
  const loadSummary = useCallback(
    (signal: AbortSignal) => {
      void updatedAt;
      if (!consultationId) return Promise.reject(new Error("No consultation"));
      return consultationsApi.getSummary(consultationId, signal);
    },
    [consultationId, updatedAt],
  );
  const summary = useAsyncResource(loadSummary);
  const reloadSummary = summary.reload;

  useEffect(() => {
    if (saveState === "SAVED") reloadSummary();
  }, [saveState, reloadSummary]);

  if (!consultation) return null;

  const id = consultation.id;
  const readOnly = !isEditable;
  const { caseContext, treatmentPlan, followUp } = consultation;

  const acceptedConsiderations = consultation.doctorDecisions.filter(
    (decision) =>
      decision.subject === "CLINICAL_CONSIDERATION" &&
      decision.outcome === "ACCEPTED_FOR_CONSIDERATION",
  );

  const readiness = summary.data?.finalization ?? null;
  const isInReview = consultation.status === "REVIEW";
  /**
   * Moving to review is what clears the workflow issue, so it cannot itself
   * wait on that issue clearing — everything else must already be in order.
   */
  const canMoveToReview = Boolean(
    readiness && readiness.issues.every((issue) => issue.field === "workflow"),
  );
  const recordId = finalizedRecordId ?? consultation.recordId;

  async function handleMarkReady() {
    const saved = await save();
    if (!saved) return;
    await patch({ status: "REVIEW" });
  }

  async function handleFinalize() {
    const saved = await save();
    if (!saved) {
      setIsConfirming(false);
      return;
    }
    const record = await finalize();
    setIsConfirming(false);
    if (record) setFinalizedRecordId(record.id);
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step="SUMMARY" />

      <StepSection
        title="Presenting complaint"
        action={<EditLink consultationId={id} step="LIVE_CONSULTATION" disabled={readOnly} />}
      >
        <Prose value={caseContext.chiefComplaint} fallback="No chief complaint recorded." />
        {caseContext.historyOfPresentIllness ? (
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-text-secondary">
            {caseContext.historyOfPresentIllness}
          </p>
        ) : null}
      </StepSection>

      <StepSection
        title="Symptoms and timeline"
        action={<EditLink consultationId={id} step="LIVE_CONSULTATION" disabled={readOnly} />}
      >
        {caseContext.symptoms.length === 0 ? (
          <StepEmpty>No symptoms recorded.</StepEmpty>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {caseContext.symptoms.map((symptom) => (
              <li key={symptom.id}>
                <Badge>
                  {symptom.name}
                  {symptom.duration ? ` · ${symptom.duration}` : ""}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        {caseContext.symptomTimeline.length > 0 ? (
          <ol className="mt-4 space-y-1.5 text-sm">
            {caseContext.symptomTimeline.map((event) => (
              <li key={event.id} className="text-text-secondary">
                <span className="font-medium text-text">{event.label}</span> — {event.description}
              </li>
            ))}
          </ol>
        ) : null}
      </StepSection>

      <StepSection title="Relevant medical history">
        {!patientContext || patientContext.medicalHistory.length === 0 ? (
          <StepEmpty>No medical history on record.</StepEmpty>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {patientContext.medicalHistory.map((item) => (
              <li key={item.id}>
                <Badge>{item.label}</Badge>
              </li>
            ))}
          </ul>
        )}
        {patientContext && patientContext.allergies.length > 0 ? (
          <p className="mt-3 text-sm text-error">
            <span className="font-semibold">Allergies:</span>{" "}
            {patientContext.allergies.map((allergy) => allergy.substance).join(", ")}
          </p>
        ) : null}
      </StepSection>

      <StepSection
        title="Consultation notes"
        action={<EditLink consultationId={id} step="LIVE_CONSULTATION" disabled={readOnly} />}
      >
        <Prose value={caseContext.doctorNotes} fallback="No consultation notes recorded." />
      </StepSection>

      <StepSection
        title="Clinical findings"
        action={<EditLink consultationId={id} step="ASSESSMENT" disabled={readOnly} />}
      >
        {caseContext.clinicalFindings.length === 0 ? (
          <StepEmpty>No findings recorded.</StepEmpty>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            {caseContext.clinicalFindings.map((finding) => (
              <div key={finding.id}>
                <dt className="text-eyebrow text-text-tertiary">{finding.label}</dt>
                <dd className="mt-0.5 text-sm text-text">{finding.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {caseContext.additionalObservations ? (
          <p className="mt-4 text-sm whitespace-pre-wrap text-text-secondary">
            {caseContext.additionalObservations}
          </p>
        ) : null}
      </StepSection>

      <StepSection
        title="Considerations you accepted"
        description="Clinical Intelligence output you kept in play. These are not assessments."
      >
        {acceptedConsiderations.length === 0 ? (
          <StepEmpty>No clinical considerations were accepted for consideration.</StepEmpty>
        ) : (
          <ul className="space-y-2">
            {acceptedConsiderations.map((review) => (
              <li key={review.subjectId} className="text-sm">
                <span className="text-text">{review.subjectLabel}</span>
                {review.note ? (
                  <span className="block text-xs text-text-secondary">{review.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </StepSection>

      <StepSection
        title="Your assessment"
        action={<EditLink consultationId={id} step="DIAGNOSIS" disabled={readOnly} />}
      >
        {consultation.diagnoses.length === 0 ? (
          <StepEmpty>No assessment recorded. This is required before finalizing.</StepEmpty>
        ) : (
          <ul className="space-y-2.5">
            {consultation.diagnoses.map((diagnosis) => (
              <li key={diagnosis.id} className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-text">{diagnosis.condition}</span>
                <Badge tone={diagnosis.isPrimary ? "primary" : "neutral"}>
                  {diagnosis.isPrimary ? "Primary" : "Additional"}
                </Badge>
                <Badge>{DIAGNOSIS_CERTAINTY_LABELS[diagnosis.certainty]}</Badge>
                {diagnosis.notes ? (
                  <span className="w-full text-xs text-text-secondary">{diagnosis.notes}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {consultation.assessmentNotes ? (
          <p className="mt-4 text-sm whitespace-pre-wrap text-text-secondary">
            {consultation.assessmentNotes}
          </p>
        ) : null}
      </StepSection>

      <StepSection
        title="Investigations"
        action={<EditLink consultationId={id} step="INVESTIGATIONS" disabled={readOnly} />}
      >
        {consultation.investigations.length === 0 ? (
          <StepEmpty>No investigations ordered.</StepEmpty>
        ) : (
          <ul className="space-y-2">
            {consultation.investigations.map((investigation) => (
              <li key={investigation.id} className="text-sm">
                <span className="text-text">{investigation.name}</span>{" "}
                <Badge>{INVESTIGATION_URGENCY_LABELS[investigation.urgency]}</Badge>
                {investigation.purpose ? (
                  <span className="block text-xs text-text-secondary">
                    {investigation.purpose}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </StepSection>

      <StepSection
        title="Medication and treatment"
        action={<EditLink consultationId={id} step="TREATMENT" disabled={readOnly} />}
      >
        {consultation.medications.length === 0 ? (
          <StepEmpty>No medications prescribed.</StepEmpty>
        ) : (
          <ul className="space-y-2">
            {consultation.medications.map((medication) => (
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
      </StepSection>

      <StepSection
        title="Follow-up"
        action={<EditLink consultationId={id} step="FOLLOW_UP" disabled={readOnly} />}
      >
        {!followUp.date && !followUp.interval && !followUp.reason ? (
          <StepEmpty>No follow-up plan recorded.</StepEmpty>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-eyebrow text-text-tertiary">When</dt>
              <dd className="mt-0.5 text-sm text-text">
                {followUp.date ? formatHistoricalDate(followUp.date) : followUp.interval || "—"}
                {followUp.date && followUp.interval ? ` · ${followUp.interval}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-eyebrow text-text-tertiary">Reason</dt>
              <dd className="mt-0.5 text-sm text-text">{followUp.reason || "—"}</dd>
            </div>
            {followUp.requiredInvestigations.length > 0 ? (
              <div>
                <dt className="text-eyebrow text-text-tertiary">Bring or complete</dt>
                <dd className="mt-0.5 text-sm text-text">
                  {followUp.requiredInvestigations.join(", ")}
                </dd>
              </div>
            ) : null}
            {followUp.symptomMonitoring.length > 0 ? (
              <div>
                <dt className="text-eyebrow text-text-tertiary">Monitor</dt>
                <dd className="mt-0.5 text-sm text-text">
                  {followUp.symptomMonitoring.join(", ")}
                </dd>
              </div>
            ) : null}
            {followUp.escalationInstructions ? (
              <div className="sm:col-span-2">
                <dt className="text-eyebrow text-text-tertiary">Escalation</dt>
                <dd className="mt-0.5 text-sm text-text">{followUp.escalationInstructions}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </StepSection>

      <StepSection
        title="Additional notes"
        description="Anything else that belongs in the record."
      >
        <Textarea
          label="Additional notes"
          labelHidden
          rows={4}
          value={additionalNotes}
          disabled={readOnly}
          placeholder="Optional closing notes…"
          onChange={(event) => {
            setAdditionalNotes(event.target.value);
            markUnsaved();
          }}
        />
      </StepSection>

      {readOnly ? (
        <StepSection
          title="Consultation record"
          description={
            consultation.finalizedAt
              ? `Finalized ${new Date(consultation.finalizedAt).toLocaleString()}. This record is read-only.`
              : "This record is read-only."
          }
        >
          <div className="flex flex-wrap gap-2">
            {recordId ? (
              <>
                <Link
                  href={recordHref(recordId)}
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                >
                  <FileText aria-hidden className="size-4" />
                  View record
                </Link>
                <Link
                  href={`${recordHref(recordId)}?view=audit`}
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  <History aria-hidden className="size-4" />
                  Audit history
                </Link>
              </>
            ) : (
              <Link
                href="/records"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <FileText aria-hidden className="size-4" />
                Open records
              </Link>
            )}
          </div>
        </StepSection>
      ) : (
        <StepSection
          title="Review and finalize"
          description="Confirm the documented information reflects your clinical assessment."
        >
          {summary.status === "loading" ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ReviewChecklist consultation={consultation} patientContext={patientContext} />
          )}

          {readiness && !readiness.ready ? (
            <Alert tone="warning" title="Consultation cannot be finalized yet" className="mt-5">
              <ul className="mt-1 list-inside list-disc space-y-1">
                {readiness.issues.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {summary.status === "error" ? (
            <Alert tone="error" title="Could not check readiness" className="mt-5">
              {summary.failure?.message ?? "Try again in a moment."}
            </Alert>
          ) : null}

          {saveFailure ? (
            <Alert tone="error" title="Finalization failed" className="mt-5">
              {saveFailure.message}
            </Alert>
          ) : null}

          {isInReview ? (
            <Alert tone="info" title="Moved to review" className="mt-5">
              The live session has ended. Review every section, then finalize.
            </Alert>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {!isInReview ? (
              <Button
                variant="secondary"
                isLoading={saveState === "SAVING"}
                disabled={!canMoveToReview}
                onClick={() => void handleMarkReady()}
              >
                <CircleCheckBig aria-hidden className="size-4" />
                Move to review
              </Button>
            ) : null}

            <Button
              disabled={!readiness?.ready}
              onClick={() => setIsConfirming(true)}
            >
              <CheckCircle2 aria-hidden className="size-4" />
              Finalize consultation
            </Button>
          </div>

          {!readiness?.ready && summary.status === "ready" ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-text-tertiary">
              <TriangleAlert aria-hidden className="size-3.5" />
              Resolve the items above to enable finalization.
            </p>
          ) : null}
        </StepSection>
      )}

      <Dialog
        isOpen={isConfirming}
        title="Finalize consultation?"
        description="You are about to finalize this consultation. Please confirm that the documented information accurately reflects your clinical assessment."
        onClose={() => setIsConfirming(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsConfirming(false)}>
              Cancel
            </Button>
            <Button isLoading={saveState === "SAVING"} onClick={() => void handleFinalize()}>
              {saveState === "SAVING" ? "Finalizing…" : "Finalize consultation"}
            </Button>
          </>
        }
      >
        <ul className="space-y-1.5 text-sm text-text-secondary">
          <li>The finalized information forms this patient&apos;s consultation record.</li>
          <li>Normal editing will no longer be available.</li>
          <li>Any later correction is recorded separately as a new version.</li>
        </ul>
      </Dialog>
    </div>
  );
}
