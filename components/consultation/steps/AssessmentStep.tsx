"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { StepEmpty, StepSection } from "./StepSection";
import { StepHeading } from "../StepHeading";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useStepSaver } from "@/features/consultations/use-step-saver";
import { FINDING_CATEGORY_LABELS } from "@/lib/constants/consultation";
import { createLocalId } from "@/lib/utils/id";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";
import type { ClinicalFinding, FindingCategory } from "@/types";

const CATEGORY_OPTIONS = (
  Object.keys(FINDING_CATEGORY_LABELS) as FindingCategory[]
).map((value) => ({ value, label: FINDING_CATEGORY_LABELS[value] }));

/** Examination findings and observations recorded during the visit. */
export function AssessmentStep() {
  const consultation = useConsultationStore((state) => state.consultation);
  const saveContext = useConsultationStore((state) => state.saveContext);
  const saveNotes = useConsultationStore((state) => state.saveNotes);
  const markUnsaved = useConsultationStore((state) => state.markUnsaved);
  const isEditable = useConsultationStore(selectIsEditable);

  const [findings, setFindings] = useState<ClinicalFinding[]>(
    consultation?.caseContext.clinicalFindings ?? [],
  );
  const [observations, setObservations] = useState(
    consultation?.caseContext.additionalObservations ?? "",
  );

  const save = useCallback(async () => {
    const saved = await saveContext({
      clinicalFindings: findings.filter((finding) => finding.label.trim().length > 0),
    });
    if (!saved) return false;
    return saveNotes({ additionalObservations: observations });
  }, [findings, observations, saveContext, saveNotes]);

  useStepSaver(save);

  if (!consultation) return null;

  function updateFinding(id: string, patch: Partial<ClinicalFinding>) {
    setFindings((current) =>
      current.map((finding) => (finding.id === id ? { ...finding, ...patch } : finding)),
    );
    markUnsaved();
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step="ASSESSMENT" />

      {!isEditable ? (
        <Alert tone="info" title="Read-only">
          This consultation is finalized, so findings can no longer be changed.
        </Alert>
      ) : null}

      <StepSection
        title="Clinical findings"
        description="Vitals, examination findings and objective observations."
      >
        <div className="space-y-3">
          {findings.length === 0 ? (
            <StepEmpty>No findings recorded yet.</StepEmpty>
          ) : (
            <ul className="space-y-3">
              {findings.map((finding) => (
                <li
                  key={finding.id}
                  className="rounded-control border border-border-default bg-surface-subtle p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-end">
                    <Select
                      label="Category"
                      options={CATEGORY_OPTIONS}
                      value={finding.category}
                      disabled={!isEditable}
                      onChange={(event) =>
                        updateFinding(finding.id, {
                          category: event.target.value as FindingCategory,
                        })
                      }
                    />
                    <Input
                      label="Finding"
                      value={finding.label}
                      disabled={!isEditable}
                      placeholder="e.g. Temperature"
                      onChange={(event) =>
                        updateFinding(finding.id, { label: event.target.value })
                      }
                    />
                    <Input
                      label="Value"
                      value={finding.value}
                      disabled={!isEditable}
                      placeholder="e.g. 38.4 °C"
                      onChange={(event) =>
                        updateFinding(finding.id, { value: event.target.value })
                      }
                    />
                    <Button
                      variant="ghost"
                      disabled={!isEditable}
                      aria-label={`Remove ${finding.label || "finding"}`}
                      onClick={() => {
                        setFindings((current) =>
                          current.filter((entry) => entry.id !== finding.id),
                        );
                        markUnsaved();
                      }}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="secondary"
            size="sm"
            disabled={!isEditable}
            onClick={() => {
              setFindings((current) => [
                ...current,
                {
                  id: createLocalId("find"),
                  category: "VITALS",
                  label: "",
                  value: "",
                  recordedAt: new Date().toISOString(),
                },
              ]);
              markUnsaved();
            }}
          >
            <Plus aria-hidden className="size-4" />
            Add finding
          </Button>
        </div>
      </StepSection>

      <StepSection
        title="Observations"
        description="Anything relevant that the structured findings do not capture."
      >
        <Textarea
          label="Observations"
          labelHidden
          rows={6}
          value={observations}
          disabled={!isEditable}
          placeholder="General appearance, patient concerns, examination notes…"
          onChange={(event) => {
            setObservations(event.target.value);
            markUnsaved();
          }}
        />
      </StepSection>
    </div>
  );
}
