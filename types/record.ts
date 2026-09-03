import type {
  ClinicalIntelligence,
  ClinicalIntelligenceStatus,
} from "./clinical-intelligence";
import type {
  ClinicalFinding,
  CurrentCaseContext,
  Diagnosis,
  FollowUpPlan,
  Medication,
  SelectedInvestigation,
  TreatmentPlan,
} from "./consultation";
import type { DoctorDecision } from "./doctor-decision";
import type { TranscriptUtterance } from "./transcript";
import type { AccessMethod, AuthorizationStatus } from "./patient-access";
import type {
  Allergy,
  CurrentMedication,
  MedicalHistoryItem,
  PatientDemographics,
  PreviousConsultation,
} from "./patient-context";

export type RecordStatus = "DRAFT" | "FINALIZED" | "AMENDED";

/** How the doctor was authorised to open this patient, captured at finalization. */
export interface AuthorizationSnapshot {
  grantId: string;
  method: AccessMethod;
  status: AuthorizationStatus;
  grantedAt: string;
  expiresAt: string | null;
  appointmentId: string | null;
}

/**
 * The patient's pre-visit picture as it stood when the record was finalized.
 * Copied, not referenced: the record must stay historically meaningful after
 * the live patient context changes.
 */
export interface PatientContextSnapshot {
  patientId: string;
  demographics: PatientDemographics;
  allergies: Allergy[];
  medicalHistory: MedicalHistoryItem[];
  currentMedications: CurrentMedication[];
  previousConsultations: PreviousConsultation[];
  relevantHealthInformation: string[];
  capturedAt: string;
}

/**
 * The visit narrative at finalization. Findings are lifted to the record's top
 * level, so they are stored once rather than in two places.
 */
export type ConsultationContextSnapshot = Omit<CurrentCaseContext, "clinicalFindings">;

/** The doctor's conclusion. Always authored by the doctor, never derived. */
export interface DoctorAssessment {
  primary: Diagnosis | null;
  additional: Diagnosis[];
  notes: string;
  decidedBy: "DOCTOR";
  decidedAt: string;
}

/**
 * What the Clinical Intelligence Platform offered during this consultation,
 * preserved for audit. Held apart from `finalAssessment` so platform output and
 * doctor judgement can never be conflated when the record is read back.
 */
export interface ClinicalIntelligenceSnapshot {
  status: ClinicalIntelligenceStatus;
  provenance: "FIXTURE" | "SERVICE" | null;
  intelligence: ClinicalIntelligence | null;
  capturedAt: string;
}

export interface ConsultationRecord {
  id: string;
  consultationId: string;
  /** The consultation's human reference, e.g. "C-1024". */
  reference: string;

  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;

  authorization: AuthorizationSnapshot | null;

  consultationType: string;
  consultationDateTime: string;
  finalizedAt: string;

  patientContext: PatientContextSnapshot;
  consultationContext: ConsultationContextSnapshot;
  clinicalFindings: ClinicalFinding[];

  /**
   * The speaker-labelled transcript as it stood at finalization. Copied, so the
   * record remains readable independently of the live session.
   */
  transcript: TranscriptUtterance[];

  /** Platform output, kept strictly separate from the decisions below. */
  clinicalIntelligence: ClinicalIntelligenceSnapshot | null;
  /** How the doctor dispositioned that output. */
  doctorDecisions: DoctorDecision[];

  finalAssessment: DoctorAssessment;
  investigations: SelectedInvestigation[];
  medications: Medication[];
  treatmentPlan: TreatmentPlan;
  followUpPlan: FollowUpPlan | null;
  additionalNotes: string;

  status: RecordStatus;

  /**
   * Version semantics for amendments. A correction creates a new version that
   * points back at the one it replaces; historical versions are never mutated.
   * Phase 3 establishes the model — the amendment workflow itself is not built.
   */
  version: number;
  amendedFromRecordId: string | null;
  supersededByRecordId: string | null;
}

/** Row shape for the records list; avoids shipping full snapshots to a table. */
export interface ConsultationRecordSummary {
  id: string;
  consultationId: string;
  reference: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  consultationType: string;
  consultationDateTime: string;
  finalizedAt: string;
  primaryAssessment: string | null;
  status: RecordStatus;
  version: number;
}

export interface RecordListFilters {
  patientId?: string;
  status?: RecordStatus;
  consultationType?: string;
  /** Free text over patient name, reference and primary assessment. */
  query?: string;
  from?: string;
  to?: string;
}

/** Distinguishes a fresh finalization from an idempotent repeat call. */
export interface FinalizationResult {
  record: ConsultationRecord;
  alreadyFinalized: boolean;
}

/** Server-side readiness assessment shown on the review step. */
export interface FinalizationReadiness {
  ready: boolean;
  issues: { field: string; message: string }[];
}
