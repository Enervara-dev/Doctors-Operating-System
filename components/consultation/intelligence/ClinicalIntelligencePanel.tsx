"use client";

import { useState } from "react";
import { BrainCircuit, Loader2, TriangleAlert } from "lucide-react";
import { DifferentialCard } from "./DifferentialCard";
import { InvestigationRecommendationCard } from "./InvestigationRecommendationCard";
import { MedicationConsiderationCard } from "./MedicationConsiderationCard";
import { MissingInformationCard } from "./MissingInformationCard";
import { RecommendationCard } from "./RecommendationCard";
import { RedFlagCard } from "./RedFlagCard";
import { SuggestedQuestionCard } from "./SuggestedQuestionCard";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import type { IntelligencePreviewSource } from "@/features/clinical-intelligence/clinical-intelligence.api";
import {
  selectIsFixtureData,
  useClinicalIntelligenceStore,
} from "@/stores/clinical-intelligence.store";
import { selectIsEditable, useConsultationStore } from "@/stores/consultation.store";
import type { Consultation, ConsultationStep, InvestigationSuggestion } from "@/types";

type IntelligenceSection =
  | "redFlags"
  | "considerations"
  | "differentials"
  | "missingInformation"
  | "suggestedQuestions"
  | "investigations"
  | "medications"
  | "evidence";

/**
 * Which intelligence is relevant while the doctor is on a given step. Keeping
 * this explicit stops the panel from becoming an undifferentiated dump.
 */
const SECTIONS_BY_STEP: Record<ConsultationStep, readonly IntelligenceSection[]> = {
  BRIEF: ["redFlags", "missingInformation"],
  ACTIVE_CONSULTATION: [
    "redFlags",
    "considerations",
    "suggestedQuestions",
    "missingInformation",
  ],
  ASSESSMENT: ["redFlags", "considerations", "missingInformation"],
  INVESTIGATIONS: ["investigations", "missingInformation"],
  DIAGNOSIS: ["differentials", "evidence"],
  TREATMENT: ["medications", "redFlags"],
  FOLLOW_UP: ["missingInformation"],
  SUMMARY: [],
};

const PREVIEW_OPTIONS = [
  { value: "service", label: "Live service (none connected)" },
  { value: "waiting", label: "Test: waiting" },
  { value: "fixture", label: "Test: available payload" },
  { value: "fixture-partial", label: "Test: partial payload" },
  { value: "error", label: "Test: error" },
] as const;

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-eyebrow text-text-tertiary">{title}</h3>
      <div className="mt-2.5 space-y-2.5">{children}</div>
    </section>
  );
}

function StateNotice({
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

export function ClinicalIntelligencePanel({
  consultation,
  step,
}: {
  consultation: Consultation;
  step: ConsultationStep;
}) {
  const availability = useClinicalIntelligenceStore((state) => state.availability);
  const intelligence = useClinicalIntelligenceStore((state) => state.intelligence);
  const message = useClinicalIntelligenceStore((state) => state.message);
  const source = useClinicalIntelligenceStore((state) => state.source);
  const load = useClinicalIntelligenceStore((state) => state.load);
  const isFixture = useClinicalIntelligenceStore(selectIsFixtureData);

  const reviewDifferential = useConsultationStore((state) => state.reviewDifferential);
  const addInvestigation = useConsultationStore((state) => state.addInvestigation);
  const isEditable = useConsultationStore(selectIsEditable);

  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(null);

  const sections = SECTIONS_BY_STEP[step];
  if (sections.length === 0) return null;

  const has = (section: IntelligenceSection): boolean => {
    if (!sections.includes(section) || !intelligence) return false;
    switch (section) {
      case "redFlags":
        return (intelligence.redFlags?.length ?? 0) > 0;
      case "considerations":
        return (intelligence.clinicalConsiderations?.length ?? 0) > 0;
      case "differentials":
        return (intelligence.differentialDiagnoses?.length ?? 0) > 0;
      case "missingInformation":
        return (intelligence.missingInformation?.length ?? 0) > 0;
      case "suggestedQuestions":
        return (intelligence.suggestedQuestions?.length ?? 0) > 0;
      case "investigations":
        return (intelligence.investigationMappings?.length ?? 0) > 0;
      case "medications":
        return (intelligence.medicationConsiderations?.length ?? 0) > 0;
      case "evidence":
        return (intelligence.evidence?.length ?? 0) > 0;
    }
  };

  const hasAnythingForThisStep = sections.some(has);

  async function handleSelectSuggestion(suggestion: InvestigationSuggestion) {
    setPendingSuggestionId(suggestion.id);
    await addInvestigation({
      name: suggestion.name,
      purpose: suggestion.purpose,
      clinicalQuestion: suggestion.clinicalQuestion,
      fromSuggestionId: suggestion.id,
    });
    setPendingSuggestionId(null);
  }

  const selectedSuggestionIds = new Set(
    consultation.investigations
      .map((investigation) => investigation.fromSuggestionId)
      .filter((id): id is string => Boolean(id)),
  );

  const reviewsByDifferentialId = new Map(
    consultation.differentialReviews.map((review) => [review.differentialId, review]),
  );

  return (
    <section
      aria-label="Clinical intelligence"
      className="rounded-card border border-border-default bg-surface-subtle"
    >
      <div className="flex flex-col gap-3 border-b border-border-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <BrainCircuit aria-hidden className="size-4 text-text-tertiary" />
          <h2 className="text-eyebrow text-text-secondary">Clinical intelligence</h2>
        </div>

        <Select
          label="Preview intelligence state (test data)"
          labelHidden
          options={PREVIEW_OPTIONS}
          value={source}
          className="h-8 w-full text-xs sm:w-64"
          onChange={(event) =>
            void load(consultation.id, event.target.value as IntelligencePreviewSource)
          }
        />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {isFixture ? (
          <div
            role="note"
            className="flex gap-2.5 rounded-control border border-warning-border bg-warning-subtle p-3"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-warning">Test fixture — not clinical output.</span>{" "}
              Every label below is a synthetic placeholder used to verify this interface. No
              intelligence service is connected and nothing here is clinical advice.
            </p>
          </div>
        ) : null}

        {availability === "UNAVAILABLE" ? (
          <StateNotice
            tone="neutral"
            title="No clinical intelligence available yet"
            description={
              message ??
              "AI-generated clinical considerations will appear here when the clinical intelligence service is connected."
            }
          />
        ) : null}

        {availability === "WAITING" ? (
          <StateNotice
            tone="waiting"
            title="Waiting for clinical intelligence…"
            description="The workspace remains fully usable while this loads."
          />
        ) : null}

        {availability === "ERROR" ? (
          <StateNotice
            tone="error"
            title="Clinical intelligence could not be loaded"
            description={
              message ?? "This does not affect your consultation — continue as normal."
            }
          />
        ) : null}

        {(availability === "AVAILABLE" || availability === "PARTIAL") && !hasAnythingForThisStep ? (
          <StateNotice
            tone="neutral"
            title="Nothing relevant to this step"
            description="The current payload contains no intelligence for this part of the consultation."
          />
        ) : null}

        {has("redFlags") ? (
          <SectionShell title="Red flags">
            {intelligence?.redFlags?.map((item) => <RedFlagCard key={item.id} item={item} />)}
          </SectionShell>
        ) : null}

        {has("considerations") ? (
          <SectionShell title="Possible clinical considerations — not confirmed diagnoses">
            {intelligence?.clinicalConsiderations?.map((item) => (
              <RecommendationCard key={item.id} consideration={item} />
            ))}
          </SectionShell>
        ) : null}

        {has("differentials") ? (
          <SectionShell title="Differential diagnoses — suggestions for your review">
            {intelligence?.differentialDiagnoses?.map((item) => (
              <DifferentialCard
                key={item.id}
                differential={item}
                review={reviewsByDifferentialId.get(item.id)}
                onReview={reviewDifferential}
                disabled={!isEditable}
              />
            ))}
          </SectionShell>
        ) : null}

        {has("investigations") ? (
          <SectionShell title="Suggested investigations">
            {intelligence?.investigationMappings?.map((mapping) => (
              <div key={mapping.id}>
                <p className="mb-2 text-xs text-text-secondary">
                  For <span className="font-medium text-text">{mapping.consideration}</span>
                </p>
                <div className="space-y-2.5">
                  {mapping.investigations.map((suggestion) => (
                    <InvestigationRecommendationCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onSelect={handleSelectSuggestion}
                      isSelected={selectedSuggestionIds.has(suggestion.id)}
                      isPending={pendingSuggestionId === suggestion.id}
                      disabled={!isEditable}
                    />
                  ))}
                </div>
              </div>
            ))}
          </SectionShell>
        ) : null}

        {has("medications") ? (
          <SectionShell title="Medication considerations">
            {intelligence?.medicationConsiderations?.map((item) => (
              <MedicationConsiderationCard key={item.id} item={item} />
            ))}
          </SectionShell>
        ) : null}

        {has("missingInformation") ? (
          <SectionShell title="Missing information">
            {intelligence?.missingInformation?.map((item) => (
              <MissingInformationCard key={item.id} item={item} />
            ))}
          </SectionShell>
        ) : null}

        {has("suggestedQuestions") ? (
          <SectionShell title="Questions you may want to ask">
            {intelligence?.suggestedQuestions?.map((item) => (
              <SuggestedQuestionCard key={item.id} item={item} />
            ))}
          </SectionShell>
        ) : null}

        {has("evidence") ? (
          <SectionShell title="References">
            <ul className="space-y-1.5 text-sm">
              {intelligence?.evidence?.map((entry) => (
                <li key={entry.id} className="text-text-secondary">
                  <span className="text-text">{entry.title}</span> — {entry.source}
                  {entry.citation ? (
                    <span className="block text-xs text-text-tertiary">{entry.citation}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </SectionShell>
        ) : null}

        <p className="border-t border-border-default pt-3 text-xs text-text-tertiary">
          Clinical intelligence is advisory context only. Assessments, investigations,
          prescriptions and follow-up remain your decisions and are recorded separately.
        </p>
      </div>
    </section>
  );
}
