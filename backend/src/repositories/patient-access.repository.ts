import type { PatientAccessGrant } from "../domain/types";
import { patientApi } from "../lib/patient-api";
import { toAppointment, toPatientSummary, type RemoteGrant } from "../lib/remote-mapping";

/**
 * Patient access.
 *
 * Both paths are server-authoritative upstream: this service sends a code or
 * an appointment id and receives a grant, and never asserts that a doctor is
 * authorised. The grant is stored in PostgreSQL with its own expiry and
 * revocation, so it survives a restart of this process and can be withdrawn
 * by the patient while a session is open.
 *
 * Access codes are valid for 24 hours from issue. That window belongs to the
 * platform — it is evaluated in SQL against `now()`, so nothing here can
 * lengthen or shorten it.
 */

function toGrant(remote: RemoteGrant): PatientAccessGrant {
  return {
    id: remote.id,
    patient: remote.patient
      ? toPatientSummary(remote.patient)
      : // A PENDING grant names a patient the doctor may not read yet, so the
        // platform withholds the summary and the confirmation screen shows the
        // pending state instead of a record.
        toPatientSummary({
          id: remote.patientId,
          fullName: "",
          age: null,
          gender: null,
          bloodGroup: null,
          city: null,
          avatarInitials: "?",
        }),
    method: remote.method,
    authorizationStatus: remote.authorizationStatus,
    appointment: remote.appointment
      ? { ...toAppointment(remote.appointment), patient: toPatientSummary(remote.appointment.patient) }
      : null,
    grantedAt: remote.grantedAt,
    expiresAt: remote.expiresAt,
  };
}

export const patientAccessRepository = {
  async redeemAccessCode(code: string): Promise<PatientAccessGrant> {
    const { grant } = await patientApi.post<{ grant: RemoteGrant }>(
      "/api/doctor/patient-access/code/validate",
      { code },
    );
    return toGrant(grant);
  },

  async grantFromAppointment(appointmentId: string): Promise<PatientAccessGrant> {
    const { grant } = await patientApi.post<{ grant: RemoteGrant }>(
      "/api/doctor/patient-access/appointment/grant",
      { appointmentId },
    );
    return toGrant(grant);
  },
};
