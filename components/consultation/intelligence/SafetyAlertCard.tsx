"use client";

import { ShieldAlert, TriangleAlert } from "lucide-react";
import { DecisionControls } from "./DecisionControls";
import { EvidenceList } from "./EvidenceList";
import { Badge } from "@/components/ui/Badge";
import { SAFETY_KIND_LABELS, SAFETY_SEVERITY_META } from "@/lib/constants/live-consultation";
import { cn } from "@/lib/utils/cn";
import type { ClinicalSafetyAlert } from "@/types";

const SEVERITY_SURFACE = {
  ADVISORY: "border-border-default bg-surface",
  WARNING: "border-warning-border bg-warning-subtle",
  CRITICAL: "border-error-border bg-error-subtle",
} as const;

const SEVERITY_ICON_TONE = {
  ADVISORY: "text-text-tertiary",
  WARNING: "text-warning",
  CRITICAL: "text-error",
} as const;

/**
 * A safety-critical finding.
 *
 * Given the strongest visual hierarchy in the workspace, but graded: an
 * advisory stays quiet so a critical alert still reads as critical. Safety is
 * immediately visible without the panel becoming alarmist.
 */
export function SafetyAlertCard({
  consultationId,
  alert,
  disabled = false,
}: {
  consultationId: string;
  alert: ClinicalSafetyAlert;
  disabled?: boolean;
}) {
  const severity = SAFETY_SEVERITY_META[alert.severity];
  const Icon = alert.severity === "CRITICAL" ? ShieldAlert : TriangleAlert;

  return (
    <article
      className={cn("rounded-card border p-4", SEVERITY_SURFACE[alert.severity])}
      role={alert.severity === "CRITICAL" ? "alert" : undefined}
    >
      <div className="flex gap-3">
        <Icon
          aria-hidden
          className={cn("mt-0.5 size-4 shrink-0", SEVERITY_ICON_TONE[alert.severity])}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-text">{alert.label}</h4>
            <Badge tone={severity.tone}>{severity.label}</Badge>
            <Badge>{SAFETY_KIND_LABELS[alert.kind]}</Badge>
          </div>

          {alert.finding ? <p className="mt-1.5 text-sm text-text">{alert.finding}</p> : null}
          {alert.rationale ? (
            <p className="mt-1.5 text-xs text-text-secondary">{alert.rationale}</p>
          ) : null}
          {alert.suggestedAction ? (
            <p className="mt-2 text-xs text-text-secondary">
              <span className="font-medium text-text">To consider:</span> {alert.suggestedAction}
            </p>
          ) : null}

          {alert.relatedMedications && alert.relatedMedications.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {alert.relatedMedications.map((medication) => (
                <li key={medication}>
                  <Badge>{medication}</Badge>
                </li>
              ))}
            </ul>
          ) : null}

          <EvidenceList
            title="Supporting findings"
            items={alert.supportingEvidence ?? []}
            className="mt-3"
          />

          <DecisionControls
            consultationId={consultationId}
            subject="CLINICAL_SAFETY_ALERT"
            subjectId={alert.id}
            subjectLabel={alert.label}
            outcomes={["ACKNOWLEDGED", "REJECTED"]}
            disabled={disabled}
            noteLabel="Your note on this safety finding"
          />
        </div>
      </div>
    </article>
  );
}
