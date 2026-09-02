"use client";

import { Plus, Trash2 } from "lucide-react";
import { StepEmpty } from "./StepSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SYMPTOM_SEVERITY_LABELS } from "@/lib/constants/consultation";
import { createLocalId } from "@/lib/utils/id";
import type { Symptom, SymptomSeverity } from "@/types";

const SEVERITY_OPTIONS = (
  Object.keys(SYMPTOM_SEVERITY_LABELS) as SymptomSeverity[]
).map((value) => ({ value, label: SYMPTOM_SEVERITY_LABELS[value] }));

export function SymptomEditor({
  symptoms,
  onChange,
  disabled = false,
}: {
  symptoms: Symptom[];
  onChange: (symptoms: Symptom[]) => void;
  disabled?: boolean;
}) {
  function update(id: string, patch: Partial<Symptom>) {
    onChange(symptoms.map((symptom) => (symptom.id === id ? { ...symptom, ...patch } : symptom)));
  }

  return (
    <div className="space-y-3">
      {symptoms.length === 0 ? (
        <StepEmpty>No symptoms recorded yet.</StepEmpty>
      ) : (
        <ul className="space-y-3">
          {symptoms.map((symptom) => (
            <li
              key={symptom.id}
              className="rounded-control border border-border-default bg-surface-subtle p-3"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-end">
                <Input
                  label="Symptom"
                  value={symptom.name}
                  disabled={disabled}
                  placeholder="e.g. Fever"
                  onChange={(event) => update(symptom.id, { name: event.target.value })}
                />
                <Input
                  label="Duration"
                  value={symptom.duration}
                  disabled={disabled}
                  placeholder="e.g. 6 days"
                  onChange={(event) => update(symptom.id, { duration: event.target.value })}
                />
                <Select
                  label="Severity"
                  options={SEVERITY_OPTIONS}
                  value={symptom.severity}
                  disabled={disabled}
                  onChange={(event) =>
                    update(symptom.id, { severity: event.target.value as SymptomSeverity })
                  }
                />
                <Button
                  variant="ghost"
                  size="md"
                  disabled={disabled}
                  aria-label={`Remove ${symptom.name || "symptom"}`}
                  onClick={() =>
                    onChange(symptoms.filter((entry) => entry.id !== symptom.id))
                  }
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </div>

              <Input
                label="Notes"
                className="mt-3"
                value={symptom.notes ?? ""}
                disabled={disabled}
                placeholder="Optional detail"
                onChange={(event) =>
                  update(symptom.id, { notes: event.target.value || null })
                }
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...symptoms,
            {
              id: createLocalId("sym"),
              name: "",
              duration: "",
              severity: "MILD",
              notes: null,
            },
          ])
        }
      >
        <Plus aria-hidden className="size-4" />
        Add symptom
      </Button>
    </div>
  );
}
