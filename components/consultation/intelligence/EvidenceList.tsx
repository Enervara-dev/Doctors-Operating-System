import { cn } from "@/lib/utils/cn";
import type { EvidenceItem, EvidenceKind } from "@/types";

const KIND_LABELS: Record<EvidenceKind, string> = {
  SYMPTOM: "Symptom",
  FINDING: "Finding",
  HISTORY: "History",
  MEDICATION: "Medication",
  INVESTIGATION: "Investigation",
  DEMOGRAPHIC: "Demographic",
  RISK_FACTOR: "Risk factor",
};

export interface EvidenceListProps {
  title: string;
  items: readonly EvidenceItem[];
  /** Contradictory evidence is muted rather than coloured, to stay restrained. */
  variant?: "supporting" | "contradictory";
  className?: string;
}

/**
 * Renders patient-specific evidence cited by a suggestion. Each row shows where
 * the claim came from, so the doctor can verify it rather than take it on trust.
 */
export function EvidenceList({
  title,
  items,
  variant = "supporting",
  className,
}: EvidenceListProps) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-eyebrow text-text-tertiary">{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                variant === "supporting" ? "bg-primary" : "bg-text-tertiary",
              )}
            />
            <span className="min-w-0">
              <span className="text-text">{item.label}</span>
              <span className="ml-1.5 rounded-full bg-surface-muted px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide text-text-tertiary uppercase">
                {KIND_LABELS[item.kind]}
              </span>
              {item.detail ? (
                <span className="mt-0.5 block text-xs text-text-secondary">{item.detail}</span>
              ) : null}
              {item.sourceRef ? (
                <span className="mt-0.5 block font-mono text-[0.6875rem] text-text-tertiary">
                  {item.sourceRef}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
