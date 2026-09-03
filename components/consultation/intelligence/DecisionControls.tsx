"use client";

import { useState } from "react";
import { Check, EyeOff, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { DECISION_OUTCOME_META } from "@/lib/constants/live-consultation";
import { useConsultationStore } from "@/stores/consultation.store";
import { selectDecisionFor, useDoctorDecisionStore } from "@/stores/doctor-decision.store";
import type { DecisionOutcome, DecisionSubject } from "@/types";

export interface DecisionControlsProps {
  consultationId: string;
  subject: DecisionSubject;
  subjectId: string;
  subjectLabel: string;
  /** Which outcomes make sense for this subject. */
  outcomes: readonly DecisionOutcome[];
  disabled?: boolean;
  noteLabel?: string;
}

const OUTCOME_ICON = {
  ACCEPTED_FOR_CONSIDERATION: Check,
  ACKNOWLEDGED: Check,
  ACTIONED: Check,
  REJECTED: X,
  DEFERRED: EyeOff,
} as const;

/**
 * Records what the doctor decided about one Clinical Intelligence output.
 *
 * The wording is deliberate throughout: nothing here confirms a diagnosis or
 * orders anything. Accepting keeps an item under consideration; the doctor's
 * actual outcomes are recorded separately, on their own steps.
 */
export function DecisionControls({
  consultationId,
  subject,
  subjectId,
  subjectLabel,
  outcomes,
  disabled = false,
  noteLabel = "Your note on this item",
}: DecisionControlsProps) {
  const decisions = useDoctorDecisionStore((state) => state.decisions);
  const pendingSubjectId = useDoctorDecisionStore((state) => state.pendingSubjectId);
  const record = useDoctorDecisionStore((state) => state.record);
  const markUnsaved = useConsultationStore((state) => state.markUnsaved);

  const existing = selectDecisionFor(decisions, subjectId);
  const [note, setNote] = useState(existing?.note ?? "");
  const isPending = pendingSubjectId === subjectId;

  async function submit(outcome: DecisionOutcome) {
    const saved = await record(consultationId, {
      subject,
      subjectId,
      subjectLabel,
      outcome,
      note: note.trim() ? note.trim() : null,
    });
    if (saved) markUnsaved();
  }

  if (disabled) {
    return existing ? (
      <Badge tone={DECISION_OUTCOME_META[existing.outcome].tone} withDot className="mt-3">
        {DECISION_OUTCOME_META[existing.outcome].label}
      </Badge>
    ) : null;
  }

  return (
    <div className="mt-3 border-t border-border-default pt-3">
      {existing ? (
        <p className="mb-2.5 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
          <Badge tone={DECISION_OUTCOME_META[existing.outcome].tone} withDot>
            {DECISION_OUTCOME_META[existing.outcome].label}
          </Badge>
          <span>
            by {existing.doctorName} ·{" "}
            {new Date(existing.decidedAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>
      ) : null}

      <Textarea
        label={noteLabel}
        labelHidden
        rows={2}
        placeholder="Optional note — your reasoning for this decision"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <div className="mt-2.5 flex flex-wrap gap-2">
        {outcomes.map((outcome) => {
          const meta = DECISION_OUTCOME_META[outcome];
          const Icon = OUTCOME_ICON[outcome];
          const isCurrent = existing?.outcome === outcome;

          return (
            <Button
              key={outcome}
              size="sm"
              variant={isCurrent ? "primary" : outcome === "REJECTED" ? "secondary" : "secondary"}
              isLoading={isPending}
              onClick={() => void submit(outcome)}
            >
              {isPending ? null : <Icon aria-hidden className="size-4" />}
              {meta.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
