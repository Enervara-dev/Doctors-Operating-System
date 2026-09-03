import type { ContentProvenance } from "./transcript";

/**
 * Contracts for the Clinical Intelligence Platform.
 *
 * The Doctor application does not reason clinically. It consumes structured
 * output the platform produces from the consultation and presents it for the
 * doctor to review. Nothing here is a decision, and nothing here is generated
 * inside this repository.
 *
 * Every payload field is optional: the platform publishes incrementally, so a
 * partial response must render rather than break the workspace.
 */

/**
 * Availability is always explicit — a missing platform is a legitimate product
 * state, not an error to hide. `STALE` means the last payload predates newer
 * transcript content and a refresh is in flight or overdue.
 */
export type ClinicalIntelligenceStatus =
  | "UNAVAILABLE"
  | "CONNECTING"
  | "WAITING"
  | "PARTIAL"
  | "AVAILABLE"
  | "STALE"
  | "ERROR";

export type EvidenceKind =
  | "SYMPTOM"
  | "FINDING"
  | "HISTORY"
  | "MEDICATION"
  | "INVESTIGATION"
  | "DEMOGRAPHIC"
  | "RISK_FACTOR";

/** One patient-specific fact cited for or against a consideration. */
export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  label: string;
  detail?: string;
  /** Points into the clinical context or transcript so the doctor can verify it. */
  sourceRef?: string;
  /** The utterance this was drawn from, where the platform reports it. */
  sourceUtteranceId?: string;
}

/** External reference material supporting an output. */
export interface ClinicalEvidence {
  id: string;
  title: string;
  source: string;
  citation?: string;
  url?: string;
  relatedConsiderationId?: string;
}

export interface MissingInformation {
  id: string;
  label: string;
  whyItMatters?: string;
  /** A question the doctor may choose to ask. Asking it is never assumed. */
  suggestedQuestion?: string;
  relatedConsiderationId?: string;
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  rationale?: string;
  relatedConsiderationId?: string;
}

export type SafetySeverity = "ADVISORY" | "WARNING" | "CRITICAL";

/**
 * Safety-critical output. Kept as one type across red flags, contraindications,
 * interactions and risk findings so the workspace can present them together
 * with a single visual hierarchy.
 */
export type SafetyAlertKind =
  | "RED_FLAG"
  | "CONTRAINDICATION"
  | "DRUG_INTERACTION"
  | "RISK_FACTOR";

export interface ClinicalSafetyAlert {
  id: string;
  kind: SafetyAlertKind;
  severity: SafetySeverity;
  label: string;
  /** What was observed. */
  finding?: string;
  /** Why it matters clinically. */
  rationale?: string;
  /** What the doctor may wish to consider. Advisory only. */
  suggestedAction?: string;
  supportingEvidence?: EvidenceItem[];
  /** Populated for CONTRAINDICATION and DRUG_INTERACTION. */
  relatedMedications?: string[];
  detectedAt?: string;
}

/**
 * A possible clinical consideration. Explicitly not a diagnosis, and never
 * promoted into one automatically.
 */
export interface ClinicalConsideration {
  id: string;
  condition: string;
  relevance?: string;
  rationale?: string;
  /** 0–1 where the platform reports one. Never rendered as a certainty. */
  confidence?: number;
  supportingFindings?: EvidenceItem[];
  contradictingFindings?: EvidenceItem[];
  relevantHistory?: EvidenceItem[];
  missingInformation?: string[];
  importantQuestions?: string[];
  safetyAlertIds?: string[];
  updatedAt?: string;
}

export type InvestigationPriority = "ROUTINE" | "IMPORTANT" | "URGENT";

/**
 * A recommended investigation. Distinct from `SelectedInvestigation` on the
 * consultation, which is what the doctor has actually ordered.
 */
export interface InvestigationRecommendation {
  id: string;
  name: string;
  /** Why this is being recommended for this patient. */
  rationale: string;
  /** The question the result would answer. */
  clinicalQuestion: string;
  priority: InvestigationPriority;
  supportingFindings?: EvidenceItem[];
  relatedConsiderationId?: string;
  relatedConsideration?: string;
  source: "CLINICAL_INTELLIGENCE" | "SYSTEM";
  generatedAt?: string;
}

export interface ClinicalIntelligence {
  consultationId: string;
  generatedAt: string;
  /** Increments with each published revision; earlier versions are retained. */
  version: number;
  /**
   * `FIXTURE` marks synthetic output from the mock adapter. The UI labels it as
   * test data wherever it appears; it must never read as real clinical output.
   */
  provenance: ContentProvenance;

  clinicalConsiderations?: ClinicalConsideration[];
  investigationRecommendations?: InvestigationRecommendation[];
  missingInformation?: MissingInformation[];
  suggestedQuestions?: SuggestedQuestion[];
  safetyAlerts?: ClinicalSafetyAlert[];
  evidence?: ClinicalEvidence[];
}

/** What every Clinical Intelligence endpoint returns: status is never implicit. */
export interface ClinicalIntelligenceEnvelope {
  status: ClinicalIntelligenceStatus;
  intelligence: ClinicalIntelligence | null;
  /** Plain-language explanation for UNAVAILABLE, ERROR and STALE. */
  message: string | null;
  /** Set when the payload is older than the newest transcript content. */
  staleSince: string | null;
}

/** Domain-scoped responses, so no surface has to fetch the whole payload. */
export interface ClinicalConsiderationsResponse {
  status: ClinicalIntelligenceStatus;
  message: string | null;
  version: number | null;
  generatedAt: string | null;
  considerations: ClinicalConsideration[];
}

export interface InvestigationRecommendationsResponse {
  status: ClinicalIntelligenceStatus;
  message: string | null;
  version: number | null;
  generatedAt: string | null;
  recommendations: InvestigationRecommendation[];
}

export interface MissingInformationResponse {
  status: ClinicalIntelligenceStatus;
  message: string | null;
  items: MissingInformation[];
}

export interface ClinicalSafetyResponse {
  status: ClinicalIntelligenceStatus;
  message: string | null;
  alerts: ClinicalSafetyAlert[];
}

export interface ClinicalEvidenceResponse {
  status: ClinicalIntelligenceStatus;
  message: string | null;
  evidence: ClinicalEvidence[];
}
