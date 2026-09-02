"use client";

import { BellRing, FlaskConical, Info, Pill, Send } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StepEmpty } from "@/components/consultation/steps/StepSection";
import { DIAGNOSIS_CERTAINTY_LABELS, INVESTIGATION_URGENCY_LABELS } from "@/lib/constants/consultation";
import { formatHistoricalDate } from "@/lib/utils/date";
import type { RequestFailure } from "@/lib/api/failure";
import type { PatientCommunicationPayload } from "@/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border-default pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-eyebrow text-text-tertiary">{title}</h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

export interface PatientCommunicationPreviewProps {
  payload: PatientCommunicationPayload | null;
  status: "idle" | "loading" | "ready" | "error";
  failure: RequestFailure | null;
  onRetry: () => void;
}

/**
 * Shows the doctor exactly what the patient application would receive.
 *
 * This is a preview of a contract, not an integration: opening it transmits
 * nothing. The payload is a whitelist projection of the finalized record, so
 * suggestions, reasoning and internal notes are structurally absent.
 */
export function PatientCommunicationPreview({
  payload,
  status,
  failure,
  onRetry,
}: PatientCommunicationPreviewProps) {
  if (status === "error") {
    return (
      <ErrorState
        title="Preview unavailable"
        description={failure?.message ?? "The patient preview could not be generated."}
        onRetry={onRetry}
      />
    );
  }

  if (status === "idle" || status === "loading") {
    return (
      <div aria-hidden className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!payload) {
    return (
      <EmptyState
        icon={Send}
        title="No preview available"
        description="A patient-facing summary is generated when the consultation is finalized."
      />
    );
  }

  return (
    <div className="space-y-5">
      <Alert tone="info" title="What the patient would receive">
        This is a preview of the patient communication contract. Nothing is sent — the patient
        application is not connected in this build.
      </Alert>

      <Section title="Assessment">
        {payload.assessment ? (
          <div>
            <p className="text-sm font-medium text-text">{payload.assessment.condition}</p>
            <Badge className="mt-1.5">
              {DIAGNOSIS_CERTAINTY_LABELS[payload.assessment.certainty]}
            </Badge>
            {payload.assessment.additionalConditions.length > 0 ? (
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {payload.assessment.additionalConditions.map((condition) => (
                  <li key={condition}>
                    <Badge>{condition}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <StepEmpty>No assessment recorded.</StepEmpty>
        )}
      </Section>

      <Section title="Investigations">
        {payload.investigations.length === 0 ? (
          <StepEmpty>No investigations were ordered.</StepEmpty>
        ) : (
          <ul className="space-y-2.5">
            {payload.investigations.map((investigation) => (
              <li key={investigation.id} className="flex gap-2.5">
                <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
                <div className="min-w-0">
                  <p className="text-sm text-text">
                    {investigation.name}{" "}
                    <Badge>{INVESTIGATION_URGENCY_LABELS[investigation.urgency]}</Badge>
                  </p>
                  {investigation.purpose ? (
                    <p className="text-xs text-text-secondary">{investigation.purpose}</p>
                  ) : null}
                  {investigation.instructions ? (
                    <p className="text-xs text-text-tertiary">{investigation.instructions}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Medications">
        {payload.medications.length === 0 ? (
          <StepEmpty>No medications were prescribed.</StepEmpty>
        ) : (
          <ul className="space-y-2.5">
            {payload.medications.map((medication) => (
              <li key={medication.id} className="flex gap-2.5">
                <Pill aria-hidden className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{medication.name}</p>
                  <p className="text-xs text-text-secondary">
                    {medication.dosage} · {medication.frequency} · {medication.duration}
                    {medication.route ? ` · ${medication.route}` : ""}
                  </p>
                  {medication.instructions ? (
                    <p className="text-xs text-text-tertiary">{medication.instructions}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Treatment instructions">
        {payload.treatmentInstructions || payload.treatmentMeasures.length > 0 ? (
          <>
            {payload.treatmentInstructions ? (
              <p className="text-sm whitespace-pre-wrap text-text">
                {payload.treatmentInstructions}
              </p>
            ) : null}
            {payload.treatmentMeasures.length > 0 ? (
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {payload.treatmentMeasures.map((measure) => (
                  <li key={measure}>
                    <Badge>{measure}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <StepEmpty>No treatment instructions were recorded.</StepEmpty>
        )}
      </Section>

      <Section title="Follow-up">
        {payload.followUp ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-text-secondary">When</dt>
              <dd className="text-sm text-text">
                {[
                  payload.followUp.date ? formatHistoricalDate(payload.followUp.date) : null,
                  payload.followUp.interval || null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary">Reason</dt>
              <dd className="text-sm text-text">{payload.followUp.reason || "—"}</dd>
            </div>
            {payload.followUp.bringOrComplete.length > 0 ? (
              <div>
                <dt className="text-xs font-medium text-text-secondary">Bring or complete</dt>
                <dd className="text-sm text-text">
                  {payload.followUp.bringOrComplete.join(", ")}
                </dd>
              </div>
            ) : null}
            {payload.followUp.symptomsToMonitor.length > 0 ? (
              <div>
                <dt className="text-xs font-medium text-text-secondary">Monitor</dt>
                <dd className="text-sm text-text">
                  {payload.followUp.symptomsToMonitor.join(", ")}
                </dd>
              </div>
            ) : null}
            {payload.followUp.whenToSeekHelp ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-text-secondary">When to seek help</dt>
                <dd className="text-sm text-text">{payload.followUp.whenToSeekHelp}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <StepEmpty>No follow-up plan was recorded.</StepEmpty>
        )}
      </Section>

      {payload.reminders.length > 0 ? (
        <Section title="Reminders">
          <ul className="space-y-1.5">
            {payload.reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-start gap-2 text-sm">
                <BellRing aria-hidden className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" />
                <span className="min-w-0 text-text">
                  {reminder.label}
                  {reminder.dueDate ? (
                    <span className="text-text-secondary">
                      {" "}
                      · {formatHistoricalDate(reminder.dueDate)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="flex gap-2.5 rounded-control border border-dashed border-border-default bg-surface-subtle p-3.5">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
        <p className="text-xs text-text-secondary">
          Clinical intelligence suggestions, differentials you reviewed, your consultation notes,
          examination findings and assessment reasoning are part of the internal record only. They
          are excluded from this payload by construction, not by filtering.
        </p>
      </div>
    </div>
  );
}
