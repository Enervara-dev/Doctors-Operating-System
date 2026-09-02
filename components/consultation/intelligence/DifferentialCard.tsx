"use client";

import { useState } from "react";
import { Check, EyeOff, X } from "lucide-react";
import { EvidenceList } from "./EvidenceList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { Textarea } from "@/components/ui/Textarea";
import { DISPOSITION_META } from "@/lib/constants/consultation";
import { cn } from "@/lib/utils/cn";
import type {
  DifferentialDiagnosis,
  DifferentialDisposition,
  DifferentialReview,
} from "@/types";

export interface DifferentialCardProps {
  differential: DifferentialDiagnosis;
  /** The doctor's existing disposition, held on the consultation record. */
  review: DifferentialReview | undefined;
  onReview: (input: {
    differentialId: string;
    condition: string;
    disposition: DifferentialDisposition;
    doctorNote: string | null;
  }) => Promise<boolean>;
  disabled?: boolean;
}

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
 * A suggested differential plus the doctor's disposition of it.
 *
 * Accepting keeps a differential *under consideration* — it never becomes an
 * assessment. Recording the final assessment is a separate, explicit action on
 * the Diagnosis step.
 */
export function DifferentialCard({
  differential,
  review,
  onReview,
  disabled = false,
}: DifferentialCardProps) {
  const [note, setNote] = useState(review?.doctorNote ?? "");
  const [pending, setPending] = useState<DifferentialDisposition | null>(null);

  const disposition = review?.disposition ?? "PENDING";
  const meta = DISPOSITION_META[disposition];

  async function submit(next: DifferentialDisposition) {
    setPending(next);
    await onReview({
      differentialId: differential.id,
      condition: differential.condition,
      disposition: next,
      doctorNote: note.trim() ? note.trim() : null,
    });
    setPending(null);
  }

  return (
    <article
      className={cn(
        "rounded-card border bg-surface p-4",
        disposition === "REJECTED" || disposition === "IGNORED"
          ? "border-border-default opacity-70"
          : "border-border-default",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-text">{differential.condition}</h4>
          {differential.relevance ? (
            <p className="mt-0.5 text-xs text-text-secondary">{differential.relevance}</p>
          ) : null}
        </div>
        <Badge tone={meta.tone} withDot className="shrink-0">
          {meta.label}
        </Badge>
      </div>

      {differential.rationale ? (
        <p className="mt-2.5 text-sm text-text-secondary">{differential.rationale}</p>
      ) : null}

      <Disclosure
        className="mt-3 border-t border-border-default pt-3"
        summary={
          <span className="text-sm font-medium text-text-secondary">
            Supporting and contradictory detail
          </span>
        }
      >
        <div className="space-y-3">
          <EvidenceList
            title="Supporting evidence"
            items={differential.supportingEvidence ?? []}
          />
          <EvidenceList
            title="Contradictory evidence"
            items={differential.contradictoryEvidence ?? []}
            variant="contradictory"
          />
          <EvidenceList
            title="Patient-specific factors"
            items={differential.patientSpecificFactors ?? []}
          />
          <StringSection title="Missing information" items={differential.missingInformation} />
          <StringSection title="Important questions" items={differential.importantQuestions} />
          <StringSection title="Red flags" items={differential.redFlags} />
        </div>
      </Disclosure>

      {disabled ? null : (
        <div className="mt-3 border-t border-border-default pt-3">
          <Textarea
            label="Your note on this differential"
            labelHidden
            rows={2}
            placeholder="Optional note — why you are keeping or setting this aside"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={disposition === "ACCEPTED_FOR_CONSIDERATION" ? "primary" : "secondary"}
              isLoading={pending === "ACCEPTED_FOR_CONSIDERATION"}
              onClick={() => void submit("ACCEPTED_FOR_CONSIDERATION")}
            >
              {pending === "ACCEPTED_FOR_CONSIDERATION" ? null : (
                <Check aria-hidden className="size-4" />
              )}
              Accept for consideration
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isLoading={pending === "REJECTED"}
              onClick={() => void submit("REJECTED")}
            >
              {pending === "REJECTED" ? null : <X aria-hidden className="size-4" />}
              Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isLoading={pending === "IGNORED"}
              onClick={() => void submit("IGNORED")}
            >
              {pending === "IGNORED" ? null : <EyeOff aria-hidden className="size-4" />}
              Ignore
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
