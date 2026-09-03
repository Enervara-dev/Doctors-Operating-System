import type { DoctorDecision } from "./doctor-decision";
import type { PatientContext } from "./patient-context";
import type { AuthorizationSnapshot, FinalizationReadiness } from "./record";

/**
 * Explicit clinical lifecycle, owned by the backend. Progression is a state
 * machine, never a set of booleans:
 *
 *   NOT_STARTED -> READY -> LIVE <-> PAUSED -> REVIEW -> FINALIZING -> FINALIZED
 *
 * `REVIEW` may return to `LIVE` if the doctor resumes the consultation.
 * `FINALIZED` is terminal; amendment is modelled but not implemented.
 *
 * Distinct from `LiveSessionState`, which describes whether the platform is
 * currently listening. A session can drop without the consultation changing.
 */
export type ConsultationStatus =
  | "NOT_STARTED"
  | "READY"
  | "LIVE"
  | "PAUSED"
  | "REVIEW"
  | "FINALIZING"
  | "FINALIZED";

export type ConsultationStep =
  | "BRIEF"
  | "LIVE_CONSULTATION"
  | "ASSESSMENT"
  | "INVESTIGATIONS"
  | "DIAGNOSIS"
  | "TREATMENT"
  | "FOLLOW_UP"
  | "SUMMARY";

export type SymptomSeverity = "MILD" | "MODERATE" | "SEVERE";

export interface Symptom {
  id: string;
  name: string;
  duration: string;
  severity: SymptomSeverity;
  notes: string | null;
}

export type TimelineEventSource = "PATIENT_REPORTED" | "DOCTOR_RECORDED" | "RECORD";

export interface SymptomTimelineEvent {
  id: string;
  /** Human label such as "Day 1" — kept separate from the resolvable date. */
  label: string;
  date: string | null;
  description: string;
  source: TimelineEventSource;
}

export type FindingCategory =
  | "VITALS"
  | "GENERAL_EXAMINATION"
  | "SYSTEMIC_EXAMINATION"
  | "OBSERVATION";

export interface ClinicalFinding {
  id: string;
  category: FindingCategory;
  label: string;
  value: string;
  recordedAt: string;
}

/**
 * The evolving picture of *this* visit. Kept structurally separate from
 * `PatientContext` (what was already known) and from `ClinicalIntelligence`
 * (what a future AI layer suggests). The clinical intelligence service will
 * consume this object as its case input.
 */
export interface CurrentCaseContext {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  symptoms: Symptom[];
  symptomTimeline: SymptomTimelineEvent[];
  clinicalFindings: ClinicalFinding[];
  doctorNotes: string;
  additionalObservations: string;
}

export type DiagnosisCertainty = "PROVISIONAL" | "WORKING" | "CONFIRMED";

export interface Diagnosis {
  id: string;
  condition: string;
  certainty: DiagnosisCertainty;
  isPrimary: boolean;
  notes: string | null;
  /** Always DOCTOR. A diagnosis is never authored by the intelligence layer. */
  decidedBy: "DOCTOR";
  decidedAt: string;
  /** Traceability only — set when the doctor started from an AI differential. */
  derivedFromDifferentialId: string | null;
}

export type InvestigationUrgency = "ROUTINE" | "URGENT" | "STAT";

/** An investigation the doctor has actually ordered. Authoritative. */
export interface SelectedInvestigation {
  id: string;
  name: string;
  purpose: string | null;
  clinicalQuestion: string | null;
  notes: string | null;
  urgency: InvestigationUrgency;
  selectedBy: "DOCTOR";
  selectedAt: string;
  /** Provenance when the doctor accepted a suggestion; never auto-populated. */
  fromSuggestionId: string | null;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string | null;
  instructions: string | null;
  prescribedBy: "DOCTOR";
  addedAt: string;
}

export interface TreatmentPlan {
  nonPharmacological: string[];
  procedures: string[];
  advice: string;
}

export interface FollowUpPlan {
  date: string | null;
  interval: string;
  reason: string;
  requiredInvestigations: string[];
  medicationReview: string;
  symptomMonitoring: string[];
  escalationInstructions: string;
}

export interface Consultation {
  id: string;
  /** Short human reference shown in the header, e.g. "C-1024". */
  reference: string;
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  consultationType: string;
  /**
   * How the doctor was authorised to open this patient. Resolved server-side
   * from the issued access grant — never asserted by the client.
   */
  authorization: AuthorizationSnapshot | null;
  status: ConsultationStatus;
  currentStep: ConsultationStep;
  /** Furthest step reached; everything up to it stays unlocked for editing. */
  furthestStep: ConsultationStep;
  completedSteps: ConsultationStep[];

  caseContext: CurrentCaseContext;

  /**
   * What the doctor decided about Clinical Intelligence output. Recorded here,
   * on the doctor's record — never written back into the platform payload.
   */
  doctorDecisions: DoctorDecision[];
  diagnoses: Diagnosis[];
  assessmentNotes: string;
  investigations: SelectedInvestigation[];
  medications: Medication[];
  treatmentPlan: TreatmentPlan;
  followUp: FollowUpPlan;
  additionalNotes: string;

  startedAt: string;
  updatedAt: string;
  finalizedAt: string | null;
  /** Set once finalized; the immutable record this consultation produced. */
  recordId: string | null;
}

export interface ConsultationSummary {
  consultation: Consultation;
  patientContext: PatientContext;
  /** Considerations the doctor explicitly kept in play, for the written record. */
  acceptedConsiderations: DoctorDecision[];
  /** Server-authoritative view of whether this consultation can be finalized. */
  finalization: FinalizationReadiness;
}

export interface CreateConsultationRequest {
  patientId: string;
  appointmentId?: string | null;
  consultationType?: string;
  /** Id of the access grant that authorised opening this patient. */
  accessGrantId?: string | null;
}
