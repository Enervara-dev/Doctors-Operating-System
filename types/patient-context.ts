import type { Gender } from "./patient";

export type AllergySeverity = "MILD" | "MODERATE" | "SEVERE" | "CRITICAL";

export interface Allergy {
  id: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  recordedOn: string;
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
}

export interface CurrentMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startedOn: string | null;
  indication: string;
  prescribedBy: string | null;
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

export interface PatientDemographics {
  patientId: string;
  fullName: string;
  age: number;
  gender: Gender;
  bloodGroup: string | null;
  city: string;
  phoneMasked: string;
  avatarInitials: string;
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
  medicalHistory: MedicalHistoryItem[];
  currentMedications: CurrentMedication[];
  previousConsultations: PreviousConsultation[];
  relevantHealthInformation: string[];
  lastUpdatedAt: string;
}
