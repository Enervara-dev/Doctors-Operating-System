import type { Gender } from "./patient";

export type AllergySeverity = "MILD" | "MODERATE" | "SEVERE" | "CRITICAL";

export interface Allergy {
  id: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  recordedOn: string;
  /**
   * The patient retired this entry from their own profile.
   *
   * Still shown to a clinician, and marked — an allergy someone stopped
   * tracking is history, not a fact that never existed. The patient app hides
   * these; a clinical brief must not.
   */
  archived: boolean;
}

export type MedicalHistoryCategory =
  | "CHRONIC_CONDITION"
  | "PAST_DIAGNOSIS"
  | "SURGERY"
  | "HOSPITALISATION"
  | "FAMILY_HISTORY"
  | "LIFESTYLE";

export type MedicalHistoryStatus = "ACTIVE" | "ONGOING" | "RESOLVED";

export interface MedicalHistoryItem {
  id: string;
  category: MedicalHistoryCategory;
  label: string;
  detail: string | null;
  /** ISO date or a free-text year when only that is known. */
  since: string | null;
  status: MedicalHistoryStatus;
  archived: boolean;
}

export interface CurrentMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startedOn: string | null;
  indication: string;
  prescribedBy: string | null;
  archived: boolean;
}

export interface PreviousConsultation {
  id: string;
  date: string;
  doctorName: string | null;
  specialty: string | null;
  complaint: string;
  assessment: string;
  investigations: string[];
  treatment: string[];
  outcome: string;
}

/** One measured value from a lab report, with the range it is judged against. */
export interface LabResultValue {
  testName: string;
  value: number | string | null;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string | null;
  status: "NORMAL" | "HIGH" | "LOW" | "REVIEW";
  panelName: string | null;
}

export interface LabReportSummary {
  id: string;
  reportType: string;
  reportDate: string | null;
  labName: string | null;
  referringDoctor: string | null;
  /** Results outside their reference range — what the doctor looks for first. */
  abnormalCount: number;
  results: LabResultValue[];
}

export interface PrescribedMedication {
  name: string;
  genericName: string | null;
  strength: string | null;
  form: string | null;
  route: string | null;
  dosage: string | null;
  frequency: string | null;
  timing: string | null;
  duration: string | null;
  instructions: string | null;
}

export interface PrescriptionSummary {
  id: string;
  prescribedDate: string | null;
  prescriberName: string | null;
  clinicName: string | null;
  medications: PrescribedMedication[];
}

export interface PatientDemographics {
  patientId: string;
  fullName: string;
  age: number;
  gender: Gender;
  bloodGroup: string | null;
  city: string;
  phoneMasked: string;
  avatarInitials: string;
  heightCm: number | null;
  weightKg: number | null;
}

/**
 * Everything the workspace knows about the patient *before* this visit.
 * Assembled once per consultation and consumed from a single store, so no
 * component re-derives patient facts for itself.
 */
export interface PatientContext {
  patientId: string;
  demographics: PatientDemographics;
  allergies: Allergy[];
  /**
   * When the patient positively confirmed they have none.
   *
   * Distinct from an empty list, which only means nobody has said. "No known
   * allergies, confirmed in March" and "we never asked" are different
   * sentences on a brief and must not render the same way.
   */
  noKnownAllergiesConfirmedAt: string | null;
  noKnownConditionsConfirmedAt: string | null;
  medicalHistory: MedicalHistoryItem[];
  currentMedications: CurrentMedication[];
  previousConsultations: PreviousConsultation[];
  labReports: LabReportSummary[];
  prescriptions: PrescriptionSummary[];
  relevantHealthInformation: string[];
  lastUpdatedAt: string;
}
