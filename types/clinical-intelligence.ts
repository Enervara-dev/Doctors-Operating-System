/**
 * Contracts for the future clinical intelligence layer.
 *
 * Nothing in this file is produced by an AI service today. It exists so that
 * every consumer — stores, hooks and components — is already written against
 * the shape the service will return, and so the UI degrades correctly when
 * fields are absent. Every payload field is optional: a partial response must
 * render, not crash.
 *
 * This layer is strictly an *input* to the doctor. It never carries a decision.
 */

export type IntelligenceAvailability =
  | "UNAVAILABLE"
  | "WAITING"
  | "AVAILABLE"
  | "PARTIAL"
  | "ERROR";

export type EvidenceKind =
  | "SYMPTOM"
  | "FINDING"
  | "HISTORY"
  | "MEDICATION"
  | "INVESTIGATION"
  | "DEMOGRAPHIC";

/** One patient-specific fact cited in support of, or against, a consideration. */
export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  label: string;
  detail?: string;
  /** Points back into patient/case context so the doctor can verify the claim. */
  sourceRef?: string;
}

/** External reference material backing a suggestion. */
export interface ClinicalEvidence {
  id: string;
  title: string;
  source: string;
  citation?: string;
  url?: string;
}

export interface MissingInformation {
  id: string;
  label: string;
  whyItMatters?: string;
  relatedConsiderationId?: string;
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  rationale?: string;
  relatedConsiderationId?: string;
}

export type RedFlagSeverity = "WARNING" | "CRITICAL";

export interface RedFlag {
  id: string;
  label: string;
  severity: RedFlagSeverity;
  rationale?: string;
  action?: string;
}

/** A possible clinical consideration. Explicitly not a diagnosis. */
export interface ClinicalConsideration {
  id: string;
  condition: string;
  relevance?: string;
  rationale?: string;
  patientSpecificFactors?: EvidenceItem[];
  relevantHistory?: EvidenceItem[];
  missingInformation?: string[];
  importantQuestions?: string[];
  redFlags?: string[];
}

export interface DifferentialDiagnosis {
  id: string;
  condition: string;
  relevance?: string;
  supportingEvidence?: EvidenceItem[];
  contradictoryEvidence?: EvidenceItem[];
  patientSpecificFactors?: EvidenceItem[];
  missingInformation?: string[];
  importantQuestions?: string[];
  redFlags?: string[];
  rationale?: string;
}

export interface InvestigationSuggestion {
  id: string;
  name: string;
  purpose: string;
  clinicalQuestion: string;
  relatedConsiderationId?: string;
  relatedConsideration?: string;
  source: "AI" | "SYSTEM";
}

/** Consideration -> investigation -> clinical purpose, as the PRD requires. */
export interface InvestigationMapping {
  id: string;
  considerationId: string;
  consideration: string;
  investigations: InvestigationSuggestion[];
}

export type MedicationConsiderationSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface MedicationConsideration {
  id: string;
  topic: string;
  detail: string;
  severity: MedicationConsiderationSeverity;
  relatedMedication?: string;
}

export interface ClinicalIntelligence {
  consultationId: string;
  generatedAt: string;
  /**
   * Marks where a payload came from. `FIXTURE` payloads are test data and the
   * UI labels them as such — they must never read as real clinical output.
   */
  provenance: "FIXTURE" | "SERVICE";

  clinicalConsiderations?: ClinicalConsideration[];
  differentialDiagnoses?: DifferentialDiagnosis[];
  missingInformation?: MissingInformation[];
  suggestedQuestions?: SuggestedQuestion[];
  redFlags?: RedFlag[];
  investigationMappings?: InvestigationMapping[];
  medicationConsiderations?: MedicationConsideration[];
  evidence?: ClinicalEvidence[];
}

/** What the API returns: availability is always explicit, payload may be null. */
export interface ClinicalIntelligenceEnvelope {
  availability: IntelligenceAvailability;
  intelligence: ClinicalIntelligence | null;
  /** Explains UNAVAILABLE / ERROR to the doctor in plain language. */
  message: string | null;
}
