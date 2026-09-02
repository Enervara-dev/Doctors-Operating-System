import type { Patient } from "./patient";

export type AppointmentStatus =
  | "UPCOMING"
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type AppointmentType =
  | "General Consultation"
  | "Follow-up"
  | "Teleconsultation"
  | "Report Review"
  | "Pre-operative Assessment"
  | "Chronic Care Review";

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
