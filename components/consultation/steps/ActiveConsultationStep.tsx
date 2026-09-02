"use client";

import { useCallback, useState } from "react";
import { StepSection } from "./StepSection";
import { SymptomEditor } from "./SymptomEditor";
import { TimelineEditor } from "./TimelineEditor";
import { StepHeading } from "../StepHeading";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useStepSaver } from "@/features/consultations/use-step-saver";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";
import type { Symptom, SymptomTimelineEvent } from "@/types";

/**
 * The doctor's primary workspace for this visit. Every field here is manual —
 * the consultation is fully usable with no intelligence service connected.
 */
export function ActiveConsultationStep() {
  const consultation = useConsultationStore((state) => state.consultation);
  const saveContext = useConsultationStore((state) => state.saveContext);
  const saveNotes = useConsultationStore((state) => state.saveNotes);
  const markUnsaved = useConsultationStore((state) => state.markUnsaved);
  const isEditable = useConsultationStore(selectIsEditable);

  const caseContext = consultation?.caseContext;

  const [chiefComplaint, setChiefComplaint] = useState(caseContext?.chiefComplaint ?? "");
  const [hpi, setHpi] = useState(caseContext?.historyOfPresentIllness ?? "");
  const [symptoms, setSymptoms] = useState<Symptom[]>(caseContext?.symptoms ?? []);
  const [timeline, setTimeline] = useState<SymptomTimelineEvent[]>(
    caseContext?.symptomTimeline ?? [],
  );
  const [doctorNotes, setDoctorNotes] = useState(caseContext?.doctorNotes ?? "");

  const save = useCallback(async () => {
    const contextSaved = await saveContext({
      chiefComplaint,
      historyOfPresentIllness: hpi,
      // Blank rows are the doctor abandoning an entry, not data to persist.
      symptoms: symptoms.filter((symptom) => symptom.name.trim().length > 0),
      symptomTimeline: timeline.filter((event) => event.description.trim().length > 0),
    });
    if (!contextSaved) return false;
    return saveNotes({ doctorNotes });
  }, [chiefComplaint, hpi, symptoms, timeline, doctorNotes, saveContext, saveNotes]);

  useStepSaver(save);

  if (!consultation) return null;

  function onEdit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      markUnsaved();
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step="ACTIVE_CONSULTATION" />

      {!isEditable ? (
        <Alert tone="info" title="Read-only">
          This consultation is finalized, so these fields can no longer be changed.
        </Alert>
      ) : null}

      <StepSection
        title="Presenting complaint"
        description="Refine what the patient reported before the visit."
      >
        <div className="space-y-4">
          <Input
            label="Chief complaint"
            value={chiefComplaint}
            disabled={!isEditable}
            placeholder="e.g. Persistent fever and fatigue for six days"
            onChange={(event) => onEdit(setChiefComplaint)(event.target.value)}
          />
          <Textarea
            label="History of presenting illness"
            rows={6}
            value={hpi}
            disabled={!isEditable}
            hint="Onset, progression, severity, associated symptoms, triggers, relieving and aggravating factors."
            placeholder="Describe the history in your own words…"
            onChange={(event) => onEdit(setHpi)(event.target.value)}
          />
        </div>
      </StepSection>

      <StepSection
        title="Symptoms"
        description="Structured symptom list for this episode."
      >
        <SymptomEditor
          symptoms={symptoms}
          disabled={!isEditable}
          onChange={onEdit(setSymptoms)}
        />
      </StepSection>

      <StepSection
        title="Symptom timeline"
        description="Chronological account of how this episode developed."
      >
        <TimelineEditor
          events={timeline}
          disabled={!isEditable}
          onChange={onEdit(setTimeline)}
        />
      </StepSection>

      <StepSection
        title="Consultation notes"
        description="Free-text notes for anything the structured fields do not capture."
      >
        <Textarea
          label="Consultation notes"
          labelHidden
          rows={8}
          value={doctorNotes}
          disabled={!isEditable}
          placeholder="Your notes for this consultation…"
          onChange={(event) => onEdit(setDoctorNotes)(event.target.value)}
        />
      </StepSection>
    </div>
  );
}
