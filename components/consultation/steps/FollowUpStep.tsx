"use client";

import { useCallback, useState } from "react";
import { StepSection } from "./StepSection";
import { StepHeading } from "../StepHeading";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { StringListEditor } from "@/components/ui/StringListEditor";
import { Textarea } from "@/components/ui/Textarea";
import { useStepSaver } from "@/features/consultations/use-step-saver";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";

/** The plan after this visit. Entirely doctor-controlled. */
export function FollowUpStep() {
  const consultation = useConsultationStore((state) => state.consultation);
  const saveFollowUp = useConsultationStore((state) => state.saveFollowUp);
  const markUnsaved = useConsultationStore((state) => state.markUnsaved);
  const isEditable = useConsultationStore(selectIsEditable);

  const followUp = consultation?.followUp;

  const [date, setDate] = useState(followUp?.date ?? "");
  const [interval, setInterval] = useState(followUp?.interval ?? "");
  const [reason, setReason] = useState(followUp?.reason ?? "");
  const [requiredInvestigations, setRequiredInvestigations] = useState<string[]>(
    followUp?.requiredInvestigations ?? [],
  );
  const [medicationReview, setMedicationReview] = useState(followUp?.medicationReview ?? "");
  const [symptomMonitoring, setSymptomMonitoring] = useState<string[]>(
    followUp?.symptomMonitoring ?? [],
  );
  const [escalationInstructions, setEscalationInstructions] = useState(
    followUp?.escalationInstructions ?? "",
  );

  const save = useCallback(
    () =>
      saveFollowUp({
        date: date.trim() ? date.trim() : null,
        interval,
        reason,
        requiredInvestigations,
        medicationReview,
        symptomMonitoring,
        escalationInstructions,
      }),
    [
      date,
      interval,
      reason,
      requiredInvestigations,
      medicationReview,
      symptomMonitoring,
      escalationInstructions,
      saveFollowUp,
    ],
  );

  useStepSaver(save);

  if (!consultation) return null;

  const orderedInvestigations = consultation.investigations.map(
    (investigation) => investigation.name,
  );

  function edited<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      markUnsaved();
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step="FOLLOW_UP" />

      {!isEditable ? (
        <Alert tone="info" title="Read-only">
          This consultation is finalized, so the follow-up plan can no longer be changed.
        </Alert>
      ) : null}

      <StepSection title="When to return">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Follow-up date"
            type="date"
            value={date}
            disabled={!isEditable}
            hint="Leave blank if the interval alone is enough."
            onChange={(event) => edited(setDate)(event.target.value)}
          />
          <Input
            label="Interval"
            value={interval}
            disabled={!isEditable}
            placeholder="e.g. 1 week"
            onChange={(event) => edited(setInterval)(event.target.value)}
          />
        </div>

        <Textarea
          label="Reason for follow-up"
          className="mt-4"
          rows={3}
          value={reason}
          disabled={!isEditable}
          placeholder="What the next visit is for…"
          onChange={(event) => edited(setReason)(event.target.value)}
        />
      </StepSection>

      <StepSection
        title="What to bring or complete"
        description={
          orderedInvestigations.length > 0
            ? `Ordered this visit: ${orderedInvestigations.join(", ")}`
            : "No investigations were ordered in this consultation."
        }
      >
        <StringListEditor
          label="Required before the next visit"
          values={requiredInvestigations}
          disabled={!isEditable}
          placeholder="e.g. Complete blood count"
          emptyLabel="Nothing required before the next visit."
          onChange={edited(setRequiredInvestigations)}
        />
      </StepSection>

      <StepSection title="Monitoring and review">
        <div className="space-y-5">
          <StringListEditor
            label="Symptoms to monitor"
            values={symptomMonitoring}
            disabled={!isEditable}
            placeholder="e.g. Temperature twice daily"
            emptyLabel="No monitoring instructions added."
            onChange={edited(setSymptomMonitoring)}
          />
          <Textarea
            label="Medication review"
            rows={3}
            value={medicationReview}
            disabled={!isEditable}
            placeholder="What to review about the current medications…"
            onChange={(event) => edited(setMedicationReview)(event.target.value)}
          />
        </div>
      </StepSection>

      <StepSection
        title="Escalation"
        description="When the patient should seek help sooner."
      >
        <Textarea
          label="Escalation instructions"
          labelHidden
          rows={4}
          value={escalationInstructions}
          disabled={!isEditable}
          placeholder="e.g. Attend the emergency department if breathless or unable to keep fluids down."
          onChange={(event) => edited(setEscalationInstructions)(event.target.value)}
        />
      </StepSection>
    </div>
  );
}
