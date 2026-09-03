"use client";

import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  CLINICAL_FACT_KIND_LABELS,
  CLINICAL_FACT_KIND_TONE,
} from "@/lib/constants/live-consultation";
import { cn } from "@/lib/utils/cn";
import { selectFacts, useClinicalContextStore } from "@/stores/clinical-context.store";
import { useLiveSessionStore } from "@/stores/live-session.store";
import type { ClinicalFactKind } from "@/types";

/** Order that reads clinically, rather than the order facts happened to arrive. */
const KIND_ORDER: ClinicalFactKind[] = [
  "SYMPTOM",
  "DURATION",
  "SEVERITY",
  "VITAL",
  "EXAMINATION",
  "NEGATIVE_FINDING",
  "RISK_FACTOR",
  "MEDICATION",
  "ALLERGY",
  "HISTORY",
];

/**
 * The clinical picture extracted from this consultation.
 *
 * Every fact carries the utterance it came from, so the doctor can trace a
 * claim back to what was actually said rather than taking it on trust.
 */
export function ClinicalContextPanel({ className }: { className?: string }) {
  const facts = useClinicalContextStore(selectFacts);
  const status = useClinicalContextStore((state) => state.status);
  const failure = useClinicalContextStore((state) => state.failure);
  const load = useClinicalContextStore((state) => state.load);
  const context = useClinicalContextStore((state) => state.context);
  const session = useLiveSessionStore((state) => state.session);

  const grouped = KIND_ORDER.map(
    (kind) => [kind, facts.filter((fact) => fact.kind === kind)] as const,
  ).filter(([, group]) => group.length > 0);

  return (
    <Card role="region" aria-label="Clinical context" className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-eyebrow text-text-secondary">
          <Activity aria-hidden className="size-3.5" />
          Clinical context
        </h2>
        {context && context.version > 0 ? (
          <span className="text-xs text-text-tertiary">
            {facts.length} facts · v{context.version}
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        {status === "error" ? (
          <ErrorState
            title="Clinical context unavailable"
            description={failure?.message ?? "It could not be loaded."}
            onRetry={() => {
              if (session?.consultationId) void load(session.consultationId);
            }}
          />
        ) : facts.length === 0 ? (
          <p className="rounded-control border border-dashed border-border-default bg-surface-subtle px-4 py-6 text-center text-sm text-text-tertiary">
            No clinical facts have been extracted from this consultation yet.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([kind, group]) => (
              <div key={kind}>
                <p className="text-eyebrow text-text-tertiary">
                  {CLINICAL_FACT_KIND_LABELS[kind]}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {group.map((fact) => (
                    <li key={fact.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <Badge tone={CLINICAL_FACT_KIND_TONE[fact.kind]}>{fact.label}</Badge>
                      {fact.value ? (
                        <span className="text-sm text-text">{fact.value}</span>
                      ) : null}
                      {fact.sourceUtteranceId ? (
                        <span className="text-[0.6875rem] text-text-tertiary">
                          from the conversation
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
