"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DecisionControls } from "./DecisionControls";
import { EvidenceList } from "./EvidenceList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { INVESTIGATION_PRIORITY_META } from "@/lib/constants/live-consultation";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";
import { useDoctorDecisionStore } from "@/stores/doctor-decision.store";
import type { InvestigationRecommendation } from "@/types";

/**
 * A recommended investigation, with the clinical question it would answer.
 *
 * The recommendation and the doctor's own order are separate things and stay
 * that way: "Add to my investigations" copies it into the doctor's list on an
 * explicit action, and records that decision. Nothing is ordered automatically.
 */
export function InvestigationRecommendationCard({
  consultationId,
  recommendation,
  disabled = false,
}: {
  consultationId: string;
  recommendation: InvestigationRecommendation;
  disabled?: boolean;
}) {
  const consultation = useConsultationStore((state) => state.consultation);
  const addInvestigation = useConsultationStore((state) => state.addInvestigation);
  const isEditable = useConsultationStore(selectIsEditable);
  const recordDecision = useDoctorDecisionStore((state) => state.record);

  const [isAdding, setIsAdding] = useState(false);
  const priority = INVESTIGATION_PRIORITY_META[recommendation.priority];

  const alreadySelected = (consultation?.investigations ?? []).some(
    (investigation) => investigation.fromSuggestionId === recommendation.id,
  );

  async function carryIntoRecord() {
    setIsAdding(true);
    const added = await addInvestigation({
      name: recommendation.name,
      purpose: recommendation.rationale,
      clinicalQuestion: recommendation.clinicalQuestion,
      fromSuggestionId: recommendation.id,
      urgency: recommendation.priority === "URGENT" ? "URGENT" : "ROUTINE",
    });
    if (added) {
      // The decision and the order are recorded separately, so an auditor can
      // see both that the doctor accepted it and what they then ordered.
      await recordDecision(consultationId, {
        subject: "INVESTIGATION_RECOMMENDATION",
        subjectId: recommendation.id,
        subjectLabel: recommendation.name,
        outcome: "ACTIONED",
      });
    }
    setIsAdding(false);
  }

  return (
    <article className="rounded-card border border-border-default bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-text">{recommendation.name}</h4>
          <p className="mt-0.5 text-xs text-text-secondary">{recommendation.rationale}</p>
        </div>
        <Badge tone={priority.tone} className="shrink-0">
          {priority.label}
        </Badge>
      </div>

      <dl className="mt-2.5 space-y-1 text-xs">
        <div>
          <dt className="inline font-medium text-text-secondary">Clinical question: </dt>
          <dd className="inline text-text">{recommendation.clinicalQuestion}</dd>
        </div>
        {recommendation.relatedConsideration ? (
          <div>
            <dt className="inline font-medium text-text-secondary">Relates to: </dt>
            <dd className="inline text-text">{recommendation.relatedConsideration}</dd>
          </div>
        ) : null}
      </dl>

      <EvidenceList
        title="Supporting findings"
        items={recommendation.supportingFindings ?? []}
        className="mt-3"
      />

      {!disabled && isEditable ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          disabled={alreadySelected}
          isLoading={isAdding}
          onClick={() => void carryIntoRecord()}
        >
          {isAdding ? null : <Plus aria-hidden className="size-4" />}
          {alreadySelected ? "In your investigations" : "Add to my investigations"}
        </Button>
      ) : null}

      <DecisionControls
        consultationId={consultationId}
        subject="INVESTIGATION_RECOMMENDATION"
        subjectId={recommendation.id}
        subjectLabel={recommendation.name}
        outcomes={["ACCEPTED_FOR_CONSIDERATION", "REJECTED", "DEFERRED"]}
        disabled={disabled}
        noteLabel="Your note on this recommendation"
      />
    </article>
  );
}
