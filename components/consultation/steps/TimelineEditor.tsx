"use client";

import { Plus, Trash2 } from "lucide-react";
import { StepEmpty } from "./StepSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createLocalId } from "@/lib/utils/id";
import type { SymptomTimelineEvent, TimelineEventSource } from "@/types";

const SOURCE_OPTIONS: { value: TimelineEventSource; label: string }[] = [
  { value: "PATIENT_REPORTED", label: "Patient reported" },
  { value: "DOCTOR_RECORDED", label: "Doctor recorded" },
  { value: "RECORD", label: "From records" },
];

export function TimelineEditor({
  events,
  onChange,
  disabled = false,
}: {
  events: SymptomTimelineEvent[];
  onChange: (events: SymptomTimelineEvent[]) => void;
  disabled?: boolean;
}) {
  function update(id: string, patch: Partial<SymptomTimelineEvent>) {
    onChange(events.map((event) => (event.id === id ? { ...event, ...patch } : event)));
  }

  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <StepEmpty>No timeline entries yet.</StepEmpty>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-control border border-border-default bg-surface-subtle p-3"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
                <Input
                  label="When"
                  value={event.label}
                  disabled={disabled}
                  placeholder="e.g. Day 1"
                  onChange={(changed) => update(event.id, { label: changed.target.value })}
                />
                <Input
                  label="What happened"
                  value={event.description}
                  disabled={disabled}
                  placeholder="e.g. Fever begins"
                  onChange={(changed) => update(event.id, { description: changed.target.value })}
                />
                <Select
                  label="Source"
                  options={SOURCE_OPTIONS}
                  value={event.source}
                  disabled={disabled}
                  onChange={(changed) =>
                    update(event.id, { source: changed.target.value as TimelineEventSource })
                  }
                />
                <Button
                  variant="ghost"
                  disabled={disabled}
                  aria-label={`Remove timeline entry ${event.label || ""}`}
                  onClick={() => onChange(events.filter((entry) => entry.id !== event.id))}
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
        disabled={disabled}
        onClick={() =>
          onChange([
            ...events,
            {
              id: createLocalId("tl"),
              label: "",
              date: null,
              description: "",
              source: "DOCTOR_RECORDED",
            },
          ])
        }
      >
        <Plus aria-hidden className="size-4" />
        Add timeline entry
      </Button>
    </div>
  );
}
