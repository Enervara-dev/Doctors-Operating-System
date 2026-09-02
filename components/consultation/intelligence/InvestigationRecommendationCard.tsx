"use client";

import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { InvestigationSuggestion } from "@/types";

export interface InvestigationRecommendationCardProps {
  suggestion: InvestigationSuggestion;
  /** Undefined when the surface is read-only (no doctor action offered). */
  onSelect?: (suggestion: InvestigationSuggestion) => void | Promise<unknown>;
  isSelected?: boolean;
  isPending?: boolean;
  disabled?: boolean;
}

/**
 * A suggested investigation with the clinical question it would answer.
 * Selecting it copies it into the doctor's own list — suggestions are never
 * turned into orders automatically.
 */
export function InvestigationRecommendationCard({
  suggestion,
  onSelect,
  isSelected = false,
  isPending = false,
  disabled = false,
}: InvestigationRecommendationCardProps) {
  return (
    <article className="rounded-control border border-border-default bg-surface p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-text">{suggestion.name}</h4>
          <p className="mt-0.5 text-xs text-text-secondary">{suggestion.purpose}</p>
        </div>
        <Badge className="shrink-0">{suggestion.source === "AI" ? "Suggested" : "System"}</Badge>
      </div>

      <dl className="mt-2.5 space-y-1 text-xs">
        <div>
          <dt className="inline font-medium text-text-secondary">Clinical question: </dt>
          <dd className="inline text-text">{suggestion.clinicalQuestion}</dd>
        </div>
        {suggestion.relatedConsideration ? (
          <div>
            <dt className="inline font-medium text-text-secondary">Relates to: </dt>
            <dd className="inline text-text">{suggestion.relatedConsideration}</dd>
          </div>
        ) : null}
      </dl>

      {onSelect && !disabled ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          disabled={isSelected}
          isLoading={isPending}
          onClick={() => void onSelect(suggestion)}
        >
          {isPending ? null : <Plus aria-hidden className="size-4" />}
          {isSelected ? "Already added" : "Add to my investigations"}
        </Button>
      ) : null}
    </article>
  );
}
