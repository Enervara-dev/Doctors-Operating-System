"use client";

import { DecisionControls } from "./DecisionControls";
import { EvidenceList } from "./EvidenceList";
import { Badge } from "@/components/ui/Badge";
import { Disclosure } from "@/components/ui/Disclosure";
import type { ClinicalConsideration } from "@/types";

function StringSection({ title, items }: { title: string; items: readonly string[] | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-eyebrow text-text-tertiary">{title}</p>
      <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-text-secondary">
        {items.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One possible clinical consideration, with the evidence for and against it.
 *
 * A consideration is never a diagnosis. Accepting one keeps it under
 * consideration and records that the doctor did so — it does not create an
 * assessment, which is a separate and explicit action on the Diagnosis step.
 */
export function ClinicalConsiderationCard({
  consultationId,
  consideration,
  disabled = false,
}: {
  consultationId: string;
  consideration: ClinicalConsideration;
  disabled?: boolean;
}) {
  const hasDetail =
    (consideration.supportingFindings?.length ?? 0) > 0 ||
    (consideration.contradictingFindings?.length ?? 0) > 0 ||
    (consideration.relevantHistory?.length ?? 0) > 0 ||
    (consideration.missingInformation?.length ?? 0) > 0 ||
    (consideration.importantQuestions?.length ?? 0) > 0;

  return (
    <article className="rounded-card border border-border-default bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-text">{consideration.condition}</h4>
          {consideration.relevance ? (
            <p className="mt-0.5 text-xs text-text-secondary">{consideration.relevance}</p>
          ) : null}
        </div>
        {typeof consideration.confidence === "number" ? (
          <Badge className="shrink-0" title="Platform-reported relative weight">
            {Math.round(consideration.confidence * 100)}%
          </Badge>
        ) : null}
      </div>

      {consideration.rationale ? (
        <p className="mt-2.5 text-sm text-text-secondary">{consideration.rationale}</p>
      ) : null}

      {hasDetail ? (
        <Disclosure
          className="mt-3 border-t border-border-default pt-3"
          summary={
            <span className="text-sm font-medium text-text-secondary">
              Why this was identified
            </span>
          }
        >
          <div className="space-y-3">
            <EvidenceList
              title="Supporting findings"
              items={consideration.supportingFindings ?? []}
            />
            <EvidenceList
              title="Contradicting findings"
              items={consideration.contradictingFindings ?? []}
              variant="contradictory"
            />
            <EvidenceList title="Relevant history" items={consideration.relevantHistory ?? []} />
            <StringSection title="Missing information" items={consideration.missingInformation} />
            <StringSection title="Important questions" items={consideration.importantQuestions} />
          </div>
        </Disclosure>
      ) : null}

      <DecisionControls
        consultationId={consultationId}
        subject="CLINICAL_CONSIDERATION"
        subjectId={consideration.id}
        subjectLabel={consideration.condition}
        outcomes={["ACCEPTED_FOR_CONSIDERATION", "REJECTED", "DEFERRED"]}
        disabled={disabled}
      />
    </article>
  );
}
