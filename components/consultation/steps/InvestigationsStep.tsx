"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { StepEmpty, StepSection } from "./StepSection";
import { StepHeading } from "../StepHeading";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { INVESTIGATION_URGENCY_LABELS } from "@/lib/constants/consultation";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";
import type { InvestigationUrgency } from "@/types";

const URGENCY_OPTIONS = (
  Object.keys(INVESTIGATION_URGENCY_LABELS) as InvestigationUrgency[]
).map((value) => ({ value, label: INVESTIGATION_URGENCY_LABELS[value] }));

const URGENCY_TONE = { ROUTINE: "neutral", URGENT: "warning", STAT: "error" } as const;

const EMPTY_FORM = {
  name: "",
  purpose: "",
  clinicalQuestion: "",
  notes: "",
  urgency: "ROUTINE" as InvestigationUrgency,
};

/**
 * The doctor's investigation list. Suggestions surface in the clinical
 * intelligence panel below and are only ever *copied* here on an explicit
 * action — nothing is ordered automatically.
 */
export function InvestigationsStep() {
  const consultation = useConsultationStore((state) => state.consultation);
  const addInvestigation = useConsultationStore((state) => state.addInvestigation);
  const updateInvestigation = useConsultationStore((state) => state.updateInvestigation);
  const removeInvestigation = useConsultationStore((state) => state.removeInvestigation);
  const saveState = useConsultationStore((state) => state.saveState);
  const isEditable = useConsultationStore(selectIsEditable);

  const [form, setForm] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!consultation) return null;
  const investigations = consultation.investigations;

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setNameError("Enter the investigation you want to order.");
      return;
    }
    setNameError(undefined);
    const added = await addInvestigation({
      name: form.name.trim(),
      purpose: form.purpose.trim() || null,
      clinicalQuestion: form.clinicalQuestion.trim() || null,
      notes: form.notes.trim() || null,
      urgency: form.urgency,
    });
    if (added) setForm(EMPTY_FORM);
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step="INVESTIGATIONS" />

      {!isEditable ? (
        <Alert tone="info" title="Read-only">
          This consultation is finalized, so investigations can no longer be changed.
        </Alert>
      ) : null}

      <StepSection
        title="Investigations you have selected"
        description="Your list is authoritative. Each entry records what it is meant to answer."
      >
        {investigations.length === 0 ? (
          <StepEmpty>No investigations selected for this consultation.</StepEmpty>
        ) : (
          <ul className="space-y-3">
            {investigations.map((investigation) => (
              <li
                key={investigation.id}
                className="rounded-control border border-border-default bg-surface-subtle p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-text">{investigation.name}</p>
                      <Badge tone={URGENCY_TONE[investigation.urgency]}>
                        {INVESTIGATION_URGENCY_LABELS[investigation.urgency]}
                      </Badge>
                      {investigation.fromSuggestionId ? (
                        <Badge>From a suggestion</Badge>
                      ) : null}
                    </div>
                    {investigation.purpose ? (
                      <p className="mt-1 text-xs text-text-secondary">{investigation.purpose}</p>
                    ) : null}
                    {investigation.clinicalQuestion ? (
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        Question: {investigation.clinicalQuestion}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!isEditable}
                    isLoading={pendingId === investigation.id && saveState === "SAVING"}
                    aria-label={`Remove ${investigation.name}`}
                    onClick={() => {
                      setPendingId(investigation.id);
                      void removeInvestigation(investigation.id).finally(() =>
                        setPendingId(null),
                      );
                    }}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <Input
                    label="Notes"
                    value={investigation.notes ?? ""}
                    disabled={!isEditable}
                    placeholder="Optional instruction, e.g. fasting sample"
                    onChange={(event) =>
                      void updateInvestigation(investigation.id, {
                        notes: event.target.value || null,
                      })
                    }
                  />
                  <Select
                    label="Urgency"
                    options={URGENCY_OPTIONS}
                    value={investigation.urgency}
                    disabled={!isEditable}
                    onChange={(event) =>
                      void updateInvestigation(investigation.id, {
                        urgency: event.target.value as InvestigationUrgency,
                      })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </StepSection>

      {isEditable ? (
        <StepSection
          title="Add an investigation"
          description="Record what you are ordering and the clinical question behind it."
        >
          <form onSubmit={handleAdd} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <Input
                label="Investigation"
                value={form.name}
                error={nameError}
                placeholder="e.g. Complete blood count"
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }));
                  if (nameError) setNameError(undefined);
                }}
              />
              <Select
                label="Urgency"
                options={URGENCY_OPTIONS}
                value={form.urgency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    urgency: event.target.value as InvestigationUrgency,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Purpose"
                value={form.purpose}
                placeholder="What this is for"
                onChange={(event) =>
                  setForm((current) => ({ ...current, purpose: event.target.value }))
                }
              />
              <Input
                label="Clinical question"
                value={form.clinicalQuestion}
                placeholder="What it should answer"
                onChange={(event) =>
                  setForm((current) => ({ ...current, clinicalQuestion: event.target.value }))
                }
              />
            </div>

            <Textarea
              label="Notes"
              rows={2}
              value={form.notes}
              placeholder="Optional instructions for the laboratory or patient"
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />

            <div className="flex justify-end">
              <Button type="submit" isLoading={saveState === "SAVING" && pendingId === null}>
                <Plus aria-hidden className="size-4" />
                Add investigation
              </Button>
            </div>
          </form>
        </StepSection>
      ) : null}
    </div>
  );
}
