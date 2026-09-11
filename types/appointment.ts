import type { Patient } from "./patient";

/**
 * The patient-facing lifecycle, shared verbatim with the platform's
 * `appointment_lifecycle_status`. The clinician's board reads the same states
 * the patient sees — one appointment cannot have two lifecycles.
 */
export type AppointmentStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "RESCHEDULED"
  | "CHECKED_IN"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "FOLLOW_UP_DUE";

/**
 * The visit types the practice offers. These strings are the database enum
 * `appointment_type` verbatim, so there is no mapping table to drift.
 */
export type AppointmentType =
  | "General Consultation"
  | "Follow-up"
  | "Report Review"
  | "Medication Review"
  | "Preventive Health Check"
  | "Urgent Consultation";

export type AppointmentAlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AppointmentAlert {
  severity: AppointmentAlertSeverity;
  label: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  /** 24h local clock, `HH:mm`. */
  time: string;
  durationMinutes: number;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  reason: string;
  alerts: AppointmentAlert[];
}

/**
 * Read model returned by the API: the appointment joined with the patient
 * snapshot the UI needs, so cards never have to fan out per-row requests.
 */
export interface AppointmentWithPatient extends Appointment {
  patient: Patient;
}

export interface AppointmentSummary {
  todayTotal: number;
  patientsToday: number;
  pendingFollowUps: number;
  readyForConsultation: number;
}

export interface AppointmentBoard {
  today: AppointmentWithPatient[];
  upcoming: AppointmentWithPatient[];
  past: AppointmentWithPatient[];
  summary: AppointmentSummary;
}
