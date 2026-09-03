import type { ContentProvenance } from "./transcript";

/**
 * The clinical picture the platform has extracted from this consultation so far.
 *
 * Distinct from `PatientContext` (what was known before the visit) and from the
 * doctor's own record. Facts are observations derived from the conversation;
 * they are never decisions.
 */

export type ClinicalFactKind =
  | "SYMPTOM"
  | "NEGATIVE_FINDING"
  | "DURATION"
  | "SEVERITY"
  | "MEDICATION"
  | "ALLERGY"
  | "HISTORY"
  | "RISK_FACTOR"
  | "VITAL"
  | "EXAMINATION";

export type ClinicalFactSource = "TRANSCRIPT" | "PATIENT_RECORD" | "DOCTOR_ENTRY";

export interface ClinicalFact {
  id: string;
  kind: ClinicalFactKind;
  label: string;
  value: string | null;
  /**
   * The utterance this was extracted from. This is the explainability link
   * that lets a doctor jump from a fact back to what was actually said.
   */
  sourceUtteranceId: string | null;
  source: ClinicalFactSource;
  confidence: number | null;
  recordedAt: string;
  provenance: ContentProvenance;
}

export interface ClinicalContext {
  consultationId: string;
  facts: ClinicalFact[];
  /** Increments whenever the platform publishes a new extraction. */
  version: number;
  updatedAt: string | null;
}
