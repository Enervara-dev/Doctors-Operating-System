"use client";

import { EvidenceList } from "./EvidenceList";
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
 * One possible clinical consideration. Presented as information for the doctor
 * to weigh — deliberately styled apart from anything the doctor has decided.
 */
export function RecommendationCard({ consideration }: { consideration: ClinicalConsideration }) {
  const hasDetail =
    (consideration.patientSpecificFactors?.length ?? 0) > 0 ||
    (consideration.relevantHistory?.length ?? 0) > 0 ||
    (consideration.missingInformation?.length ?? 0) > 0 ||
    (consideration.importantQuestions?.length ?? 0) > 0 ||
    (consideration.redFlags?.length ?? 0) > 0;

  return (
    <article className="rounded-card border border-border-default bg-surface p-4">
      <h4 className="text-sm font-semibold text-text">{consideration.condition}</h4>
      {consideration.relevance ? (
        <p className="mt-0.5 text-xs text-text-secondary">{consideration.relevance}</p>
      ) : null}
      {consideration.rationale ? (
        <p className="mt-2.5 text-sm text-text-secondary">{consideration.rationale}</p>
      ) : null}

      {hasDetail ? (
        <Disclosure
          className="mt-3 border-t border-border-default pt-3"
          summary={
            <span className="text-sm font-medium text-text-secondary">
              Patient-specific detail
            </span>
          }
        >
          <div className="space-y-3">
            <EvidenceList
              title="Supporting factors"
              items={consideration.patientSpecificFactors ?? []}
            />
            <EvidenceList
              title="Relevant history"
              items={consideration.relevantHistory ?? []}
            />
            <StringSection title="Missing information" items={consideration.missingInformation} />
            <StringSection title="Important questions" items={consideration.importantQuestions} />
            <StringSection title="Red flags" items={consideration.redFlags} />
          </div>
        </Disclosure>
      ) : null}
    </article>
  );
}
