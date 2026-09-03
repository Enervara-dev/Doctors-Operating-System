"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { StepEmpty, StepSection } from "./StepSection";
import { StepHeading } from "../StepHeading";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useStepSaver } from "@/features/consultations/use-step-saver";
import type { DiagnosisInput } from "@/features/consultations/consultations.api";
import { DIAGNOSIS_CERTAINTY_LABELS } from "@/lib/constants/consultation";
import { createLocalId } from "@/lib/utils/id";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";
import type { DiagnosisCertainty } from "@/types";

const CERTAINTY_OPTIONS = (
  Object.keys(DIAGNOSIS_CERTAINTY_LABELS) as DiagnosisCertainty[]
).map((value) => ({ value, label: DIAGNOSIS_CERTAINTY_LABELS[value] }));

interface DraftDiagnosis extends DiagnosisInput {
  id: string;
}

/**
 * The doctor's assessment for this visit.
 *
 * Differentials suggested elsewhere are never promoted automatically: the
 * doctor may copy one in, but what is recorded here is authored, edited and
 * owned by them. The provenance link is kept only for traceability.
 */
export function DiagnosisStep() {
  const consultation = useConsultationStore((state) => state.consultation);
  const saveDiagnoses = useConsultationStore((state) => state.saveDiagnoses);
  const markUnsaved = useConsultationStore((state) => state.markUnsaved);
  const isEditable = useConsultationStore(selectIsEditable);

  const [diagnoses, setDiagnoses] = useState<DraftDiagnosis[]>(
    () =>
      consultation?.diagnoses.map((diagnosis) => ({
        id: diagnosis.id,
        condition: diagnosis.condition,
        certainty: diagnosis.certainty,
        isPrimary: diagnosis.isPrimary,
        notes: diagnosis.notes,
        derivedFromDifferentialId: diagnosis.derivedFromDifferentialId,
      })) ?? [],
  );
  const [assessmentNotes, setAssessmentNotes] = useState(consultation?.assessmentNotes ?? "");

  const save = useCallback(
    () =>
      saveDiagnoses(
        diagnoses.filter((diagnosis) => diagnosis.condition.trim().length > 0),
        assessmentNotes,
      ),
    [diagnoses, assessmentNotes, saveDiagnoses],
  );

  useStepSaver(save);

  if (!consultation) return null;

  // Considerations the doctor kept in play. Accepting one never made it an
  // assessment; copying it across below is a separate, explicit action.
  const acceptedConsiderations = consultation.doctorDecisions.filter(
    (decision) =>
      decision.subject === "CLINICAL_CONSIDERATION" &&
      decision.outcome === "ACCEPTED_FOR_CONSIDERATION",
  );
  const recordedConditions = new Set(
    diagnoses.map((diagnosis) => diagnosis.condition.trim().toLowerCase()),
  );

  function update(id: string, patch: Partial<DraftDiagnosis>) {
    setDiagnoses((current) =>
      current.map((diagnosis) =>
        diagnosis.id === id ? { ...diagnosis, ...patch } : diagnosis,
      ),
    );
    markUnsaved();
  }

  function setPrimary(id: string) {
    setDiagnoses((current) =>
      current.map((diagnosis) => ({ ...diagnosis, isPrimary: diagnosis.id === id })),
    );
    markUnsaved();
  }

  function add(seed?: { condition: string; derivedFromDifferentialId?: string }) {
    setDiagnoses((current) => [
      ...current,
      {
        id: createLocalId("dx"),
        condition: seed?.condition ?? "",
        certainty: "PROVISIONAL",
        isPrimary: current.length === 0,
        notes: null,
        derivedFromDifferentialId: seed?.derivedFromDifferentialId ?? null,
      },
    ]);
    markUnsaved();
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step="DIAGNOSIS" />

      {!isEditable ? (
        <Alert tone="info" title="Read-only">
          This consultation is finalized, so the assessment can no longer be changed.
        </Alert>
      ) : null}

      <StepSection
        title="Your assessment"
        description="Recorded by you. This is the consultation's clinical conclusion."
      >
        <div className="space-y-3">
          {diagnoses.length === 0 ? (
            <StepEmpty>No assessment recorded yet.</StepEmpty>
          ) : (
            <ul className="space-y-3">
              {diagnoses.map((diagnosis) => (
                <li
                  key={diagnosis.id}
                  className="rounded-control border border-border-default bg-surface-subtle p-3.5"
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
                    <Input
                      label="Condition or assessment"
                      value={diagnosis.condition}
                      disabled={!isEditable}
                      placeholder="e.g. Viral febrile illness"
                      onChange={(event) =>
                        update(diagnosis.id, { condition: event.target.value })
                      }
                    />
                    <Select
                      label="Certainty"
                      options={CERTAINTY_OPTIONS}
                      value={diagnosis.certainty}
                      disabled={!isEditable}
                      onChange={(event) =>
                        update(diagnosis.id, {
                          certainty: event.target.value as DiagnosisCertainty,
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      disabled={!isEditable}
                      aria-label={`Remove ${diagnosis.condition || "assessment"}`}
                      onClick={() => {
                        setDiagnoses((current) =>
                          current.filter((entry) => entry.id !== diagnosis.id),
                        );
                        markUnsaved();
                      }}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </div>

                  <Input
                    label="Notes"
                    className="mt-3"
                    value={diagnosis.notes ?? ""}
                    disabled={!isEditable}
                    placeholder="Optional reasoning or qualifier"
                    onChange={(event) =>
                      update(diagnosis.id, { notes: event.target.value || null })
                    }
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="radio"
                        name="primary-diagnosis"
                        checked={diagnosis.isPrimary}
                        disabled={!isEditable}
                        onChange={() => setPrimary(diagnosis.id)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      Primary assessment
                    </label>
                    {diagnosis.derivedFromDifferentialId ? (
                      <Badge>Started from a suggestion</Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Button variant="secondary" size="sm" disabled={!isEditable} onClick={() => add()}>
            <Plus aria-hidden className="size-4" />
            Add assessment
          </Button>
        </div>
      </StepSection>

      {acceptedConsiderations.length > 0 ? (
        <StepSection
          title="Considerations you accepted"
          description="Kept in play during this consultation. Accepting one never made it your assessment — copy it across only if you decide it belongs there."
        >
          <ul className="space-y-2.5">
            {acceptedConsiderations.map((review) => {
              const alreadyRecorded = recordedConditions.has(
                review.subjectLabel.trim().toLowerCase(),
              );
              return (
                <li
                  key={review.subjectId}
                  className="flex flex-col gap-2 rounded-control border border-border-default bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">{review.subjectLabel}</p>
                    {review.note ? (
                      <p className="mt-0.5 text-xs text-text-secondary">{review.note}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!isEditable || alreadyRecorded}
                    className="shrink-0"
                    onClick={() =>
                      add({
                        condition: review.subjectLabel,
                        derivedFromDifferentialId: review.subjectId,
                      })
                    }
                  >
                    {alreadyRecorded ? "Already recorded" : "Record as assessment"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </StepSection>
      ) : null}

      <StepSection
        title="Clinical notes"
        description="Your reasoning for this assessment."
      >
        <Textarea
          label="Clinical notes"
          labelHidden
          rows={6}
          value={assessmentNotes}
          disabled={!isEditable}
          placeholder="Why you reached this assessment, and what would change it…"
          onChange={(event) => {
            setAssessmentNotes(event.target.value);
            markUnsaved();
          }}
        />
      </StepSection>
    </div>
  );
}
