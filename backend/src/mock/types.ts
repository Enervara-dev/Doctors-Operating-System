import type {
  Allergy,
  AuthorizationStatus,
  CurrentMedication,
  MedicalHistoryItem,
  PreviousConsultation,
  Symptom,
  SymptomTimelineEvent,
} from "../domain/types";

export interface CredentialRecord {
  doctorId: string;
  email: string;
  password: string;
}

export interface AccessCodeRecord {
  code: string;
  patientId: string;
  authorizationStatus: AuthorizationStatus;
  expiresInMinutes: number;
}

export type SharingLinkState = "VALID" | "EXPIRED" | "REVOKED";

export interface SharingLinkRecord {
  token: string;
  patientId: string;
  state: SharingLinkState;
  authorizationStatus: AuthorizationStatus;
  expiresInMinutes: number;
}

/** Clinical history fixture for one patient; demographics come from `patients.json`. */
export interface PatientContextRecord {
  patientId: string;
  allergies: Allergy[];
  medicalHistory: MedicalHistoryItem[];
  currentMedications: CurrentMedication[];
  previousConsultations: PreviousConsultation[];
  relevantHealthInformation: string[];
}

/**
 * Patient-reported intake captured by the patient application before the
 * visit. It seeds the case context when a consultation is opened; the doctor
 * then owns and edits it.
 */
export interface CaseIntakeRecord {
  appointmentId: string;
  patientId: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  symptoms: Symptom[];
  symptomTimeline: SymptomTimelineEvent[];
}
