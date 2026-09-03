"use client";

import { BrainCircuit, FlaskConical, Loader2, TriangleAlert } from "lucide-react";
import { ClinicalConsiderationCard } from "./ClinicalConsiderationCard";
import { InvestigationRecommendationCard } from "./InvestigationRecommendationCard";
import { MissingInformationCard } from "./MissingInformationCard";
import { SafetyAlertCard } from "./SafetyAlertCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { INTELLIGENCE_STATUS_META } from "@/lib/constants/live-consultation";
import { cn } from "@/lib/utils/cn";
import {
  selectConsiderations,
  selectEvidence,
  selectIsFixtureIntelligence,
  selectMissingInformation,
  selectRecommendations,
  selectSafetyAlerts,
  useClinicalIntelligenceStore,
} from "@/stores/clinical-intelligence.store";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";
import type { Consultation } from "@/types";

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-eyebrow text-text-tertiary">
        {title}
        {typeof count === "number" && count > 0 ? (
          <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums">
            {count}
          </span>
        ) : null}
      </h3>
      <div className="mt-2.5 space-y-2.5">{children}</div>
    </section>
  );
}

/**
 * Explains an empty panel rather than leaving it blank.
 *
 * An absent platform is a supported product state: the doctor can run the whole
 * consultation without it, and the notice says so.
 */
function StatusNotice({
  tone,
  title,
  description,
}: {
  tone: "neutral" | "waiting" | "error";
  title: string;
  description: string;
}) {
  const Icon = tone === "waiting" ? Loader2 : tone === "error" ? TriangleAlert : BrainCircuit;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-control border border-dashed p-4",
        tone === "error"
          ? "border-error-border bg-error-subtle"
          : "border-border-default bg-surface-subtle",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "error" ? "text-error" : "text-text-tertiary",
          tone === "waiting" && "animate-spin",
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}

/**
 * The Clinical Intelligence surface for the live consultation.
 *
 * Safety comes first, then considerations, recommendations and gaps. Nothing
 * here is a decision: what the doctor does with each item is recorded through
 * the decision controls and stored on the consultation, never written back into
 * the platform payload.
 */
export function ClinicalIntelligencePanel({
  consultation,
  className,
}: {
  consultation: Consultation;
  className?: string;
}) {
  const status = useClinicalIntelligenceStore((state) => state.status);
  const message = useClinicalIntelligenceStore((state) => state.message);
  const intelligence = useClinicalIntelligenceStore((state) => state.intelligence);
  const isFixture = useClinicalIntelligenceStore(selectIsFixtureIntelligence);
  const considerations = useClinicalIntelligenceStore(selectConsiderations);
  const recommendations = useClinicalIntelligenceStore(selectRecommendations);
  const missingInformation = useClinicalIntelligenceStore(selectMissingInformation);
  const safetyAlerts = useClinicalIntelligenceStore(selectSafetyAlerts);
  const evidence = useClinicalIntelligenceStore(selectEvidence);
  const isEditable = useConsultationStore(selectIsEditable);

  const statusMeta = INTELLIGENCE_STATUS_META[status];
  const hasContent =
    considerations.length > 0 ||
    recommendations.length > 0 ||
    missingInformation.length > 0 ||
    safetyAlerts.length > 0 ||
    evidence.length > 0;

  // `relative` is load-bearing: an overflow container does not clip
  // absolutely-positioned descendants unless it is itself their containing
  // block, and without it the panel's content extends the page far below the
  // visible layout.
  return (
    <Card
      role="region"
      aria-label="Clinical Intelligence"
      className={cn("relative flex min-h-0 flex-col overflow-hidden", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default px-4 py-3">
        <h2 className="flex items-center gap-2 text-eyebrow text-text-secondary">
          <BrainCircuit aria-hidden className="size-3.5" />
          Clinical Intelligence
        </h2>
        <div className="flex items-center gap-2">
          {intelligence ? (
            <span className="text-xs text-text-tertiary">v{intelligence.version}</span>
          ) : null}
          <Badge tone={statusMeta.tone} withDot>
            {statusMeta.label}
          </Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {isFixture ? (
          <div
            role="note"
            className="flex gap-2.5 rounded-control border border-warning-border bg-warning-subtle p-3"
          >
            <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-warning">
                Test fixture — not clinical output.
              </span>{" "}
              Synthetic content from the mock adapter, shown so this interface can be verified.
            </p>
          </div>
        ) : null}

        {status === "UNAVAILABLE" ? (
          <StatusNotice
            tone="neutral"
            title="Clinical Intelligence not connected"
            description={
              message ??
              "Clinical considerations, investigation recommendations and safety findings will appear here once the platform is connected."
            }
          />
        ) : null}

        {status === "CONNECTING" || status === "WAITING" ? (
          <StatusNotice
            tone="waiting"
            title={status === "CONNECTING" ? "Connecting…" : "Processing the consultation…"}
            description={message ?? "The workspace remains fully usable while this completes."}
          />
        ) : null}

        {status === "ERROR" ? (
          <StatusNotice
            tone="error"
            title="Clinical Intelligence temporarily unavailable"
            description={message ?? "The consultation can continue."}
          />
        ) : null}

        {status === "STALE" ? (
          <StatusNotice
            tone="waiting"
            title="Catching up with the conversation"
            description={
              message ?? "Showing the last published output while newer content is processed."
            }
          />
        ) : null}

        {safetyAlerts.length > 0 ? (
          <Section title="Clinical safety" count={safetyAlerts.length}>
            {safetyAlerts.map((alert) => (
              <SafetyAlertCard
                key={alert.id}
                consultationId={consultation.id}
                alert={alert}
                disabled={!isEditable}
              />
            ))}
          </Section>
        ) : null}

        {considerations.length > 0 ? (
          <Section
            title="Clinical considerations — not confirmed diagnoses"
            count={considerations.length}
          >
            {considerations.map((consideration) => (
              <ClinicalConsiderationCard
                key={consideration.id}
                consultationId={consultation.id}
                consideration={consideration}
                disabled={!isEditable}
              />
            ))}
          </Section>
        ) : null}

        {recommendations.length > 0 ? (
          <Section title="Investigation recommendations" count={recommendations.length}>
            {recommendations.map((recommendation) => (
              <InvestigationRecommendationCard
                key={recommendation.id}
                consultationId={consultation.id}
                recommendation={recommendation}
                disabled={!isEditable}
              />
            ))}
          </Section>
        ) : null}

        {missingInformation.length > 0 ? (
          <Section title="Missing information" count={missingInformation.length}>
            {missingInformation.map((item) => (
              <MissingInformationCard key={item.id} item={item} />
            ))}
          </Section>
        ) : null}

        {evidence.length > 0 ? (
          <Section title="References">
            <ul className="space-y-1.5 text-sm">
              {evidence.map((entry) => (
                <li key={entry.id} className="text-text-secondary">
                  <span className="text-text">{entry.title}</span> — {entry.source}
                  {entry.citation ? (
                    <span className="block text-xs text-text-tertiary">{entry.citation}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {(status === "AVAILABLE" || status === "PARTIAL" || status === "STALE") && !hasContent ? (
          <StatusNotice
            tone="neutral"
            title="Nothing published yet"
            description="The platform is connected but has not produced output for this consultation."
          />
        ) : null}

        <p className="border-t border-border-default pt-3 text-xs text-text-tertiary">
          Clinical Intelligence is advisory context. Your assessment, investigations,
          prescriptions and follow-up are recorded separately and remain your decisions.
        </p>
      </div>
    </Card>
  );
}
