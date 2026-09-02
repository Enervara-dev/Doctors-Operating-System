import appointmentsFixture from "../../../data/appointments.json";
import auditEventsFixture from "../../../data/audit-events.json";
import caseIntakeFixture from "../../../data/case-intake.json";
import clinicalIntelligenceFixture from "../../../data/clinical-intelligence-fixtures.json";
import consultationRecordsFixture from "../../../data/consultation-records.json";
import consultationsFixture from "../../../data/consultations.json";
import credentialsFixture from "../../../data/credentials.json";
import doctorsFixture from "../../../data/doctors.json";
import accessCodesFixture from "../../../data/access-codes.json";
import patientContextsFixture from "../../../data/patient-contexts.json";
import patientsFixture from "../../../data/patients.json";
import sharingLinksFixture from "../../../data/sharing-links.json";

import type {
  Appointment,
  AuditEvent,
  Consultation,
  ConsultationRecord,
  Doctor,
  Patient,
} from "../domain/types";
import type {
  AccessCodeRecord,
  CaseIntakeRecord,
  ClinicalIntelligenceFixtures,
  CredentialRecord,
  PatientContextRecord,
  SharingLinkRecord,
} from "./types";
import { addDaysToIsoDate, differenceInDays, todayIsoDate } from "./date";

/**
 * The date the appointment fixtures were authored against. Every fixture date
 * is shifted by `today - anchor` on load, so the demo dataset always spans
 * past / today / upcoming no matter when the app is run. Delete this rebasing
 * step once a real database supplies live appointment rows.
 */
const FIXTURE_ANCHOR_DATE = "2026-09-02";

function rebaseAppointments(appointments: Appointment[]): Appointment[] {
  const shift = differenceInDays(FIXTURE_ANCHOR_DATE, todayIsoDate());
  if (shift === 0) return appointments;
  return appointments.map((appointment) => ({
    ...appointment,
    date: addDaysToIsoDate(appointment.date, shift),
  }));
}

/**
 * In-memory dataset standing in for the eventual PostgreSQL schema.
 * Repositories are the only modules allowed to touch it.
 */
export const db = {
  doctors: doctorsFixture as Doctor[],
  patients: patientsFixture as Patient[],
  appointments: rebaseAppointments(appointmentsFixture as Appointment[]),
  credentials: credentialsFixture as CredentialRecord[],
  accessCodes: accessCodesFixture as AccessCodeRecord[],
  sharingLinks: sharingLinksFixture as SharingLinkRecord[],
  patientContexts: patientContextsFixture as PatientContextRecord[],
  caseIntakes: caseIntakeFixture as CaseIntakeRecord[],
  /**
   * Seed only. Consultations created during a session live in the consultation
   * repository's in-memory store and are lost on restart — Phase 2 has no
   * database by design.
   */
  consultationSeed: consultationsFixture as Consultation[],
  /** Finalized records from earlier visits, so the archive is not empty. */
  consultationRecordSeed: consultationRecordsFixture as unknown as ConsultationRecord[],
  auditEventSeed: auditEventsFixture as unknown as AuditEvent[],
  /** AI FIXTURE / TEST DATA ONLY. Served solely on an explicit opt-in request. */
  clinicalIntelligenceFixtures:
    clinicalIntelligenceFixture as unknown as ClinicalIntelligenceFixtures,
} as const;
