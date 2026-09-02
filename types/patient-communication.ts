import type { DiagnosisCertainty } from "./consultation";

/**
 * The patient-facing projection of a finalized record.
 *
 * This is a boundary contract, not an integration. It defines the *only* shape
 * that may ever cross into the patient application, and it is built by
 * whitelisting fields from the finalized record — never by serialising it.
 *
 * Deliberately excluded, and asserted by tests: unselected or rejected AI
 * differentials, AI reasoning of any kind, differential reviews, clinical
 * findings, doctor notes and assessment reasoning, patient context snapshots,
 * authorization snapshots and audit metadata.
 */

export interface DoctorApprovedAssessment {
  condition: string;
  certainty: DiagnosisCertainty;
  additionalConditions: string[];
}

export interface PatientVisibleInvestigation {
  id: string;
  name: string;
  /** Why it is being done, in the doctor's own words. */
  purpose: string | null;
  /** Preparation or timing instructions for the patient. */
  instructions: string | null;
  urgency: "ROUTINE" | "URGENT" | "STAT";
}

export interface PatientVisibleMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string | null;
  instructions: string | null;
}

export interface PatientVisibleFollowUp {
  date: string | null;
  interval: string;
  reason: string;
  bringOrComplete: string[];
  symptomsToMonitor: string[];
  whenToSeekHelp: string;
}

export type PatientReminderType = "FOLLOW_UP" | "MEDICATION" | "INVESTIGATION";

export interface PatientReminder {
  id: string;
  type: PatientReminderType;
  label: string;
  /** Null when the doctor set no date; the patient app decides scheduling. */
  dueDate: string | null;
}

export interface PatientCommunicationPayload {
  consultationId: string;
  recordId: string;
  patientId: string;
  finalizedAt: string;

  assessment: DoctorApprovedAssessment | null;
  investigations: PatientVisibleInvestigation[];
  medications: PatientVisibleMedication[];
  treatmentInstructions: string | null;
  /** Non-pharmacological measures and procedures the doctor recorded. */
  treatmentMeasures: string[];
  followUp: PatientVisibleFollowUp | null;
  reminders: PatientReminder[];
}
