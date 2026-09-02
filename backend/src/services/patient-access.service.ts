import type { AccessMethod, AuthorizationStatus, PatientAccessGrant } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { simulateLatency } from "../lib/delay";
import { createId } from "../lib/id";
import { accessGrantRepository } from "../repositories/access-grant.repository";
import { minutesFromNow } from "../mock/date";
import { patientAccessRepository } from "../repositories/patient-access.repository";
import { patientRepository } from "../repositories/patient.repository";
import { appointmentService } from "./appointment.service";
import { appointmentRepository } from "../repositories/appointment.repository";

/**
 * Phase 1 authorization is simulated. Grants are derived from fixtures and are
 * not enforced anywhere. The real implementation will verify patient consent,
 * check token signatures and write an audit entry per grant.
 */
async function buildGrant(params: {
  patientId: string;
  method: AccessMethod;
  authorizationStatus: AuthorizationStatus;
  expiresInMinutes: number | null;
}): Promise<PatientAccessGrant> {
  const patient = await patientRepository.findById(params.patientId);
  if (!patient) {
    throw ApiError.notFound("PATIENT_NOT_FOUND", "Patient could not be found.");
  }

  const linkedAppointment = await appointmentRepository.findUpcomingByPatientId(patient.id);
  const appointment = linkedAppointment
    ? await appointmentService.getById(linkedAppointment.id)
    : null;

  // Grants are retained server-side so a consultation can resolve its
  // authorization from an id rather than from anything the client asserts.
  return accessGrantRepository.save({
    id: createId("grant"),
    patient,
    method: params.method,
    authorizationStatus: params.authorizationStatus,
    appointment,
    expiresAt:
      params.expiresInMinutes === null ? null : minutesFromNow(params.expiresInMinutes),
    grantedAt: new Date().toISOString(),
  });
}

function normalizeLinkToken(rawLink: string): string {
  const trimmed = rawLink.trim();
  // Accept a full share URL or the bare token the doctor may have copied.
  const withoutQuery = trimmed.split(/[?#]/)[0] ?? trimmed;
  const segments = withoutQuery.split("/").filter(Boolean);
  return (segments[segments.length - 1] ?? "").toUpperCase();
}

export const patientAccessService = {
  async validateAccessCode(rawCode: unknown): Promise<PatientAccessGrant> {
    const code = typeof rawCode === "string" ? rawCode.trim() : "";
    if (!code) {
      throw ApiError.validation("Please correct the highlighted fields.", {
        code: "Access code is required.",
      });
    }

    await simulateLatency(2);

    const record = await patientAccessRepository.findAccessCode(code);
    if (!record) {
      throw new ApiError(
        404,
        "ACCESS_CODE_INVALID",
        "This access code is not recognised. Check the code with the patient and try again.",
      );
    }

    return buildGrant({
      patientId: record.patientId,
      method: "ACCESS_CODE",
      authorizationStatus: record.authorizationStatus,
      expiresInMinutes: record.expiresInMinutes,
    });
  },

  async validateSharingLink(rawLink: unknown): Promise<PatientAccessGrant> {
    const link = typeof rawLink === "string" ? rawLink.trim() : "";
    if (!link) {
      throw ApiError.validation("Please correct the highlighted fields.", {
        link: "Sharing link is required.",
      });
    }

    await simulateLatency(2);

    const record = await patientAccessRepository.findSharingLink(normalizeLinkToken(link));
    if (!record) {
      throw new ApiError(
        404,
        "ACCESS_LINK_INVALID",
        "This sharing link is not valid. Ask the patient to generate a new one.",
      );
    }

    if (record.state === "EXPIRED") {
      throw new ApiError(
        410,
        "ACCESS_LINK_EXPIRED",
        "This sharing link has expired. Ask the patient to share a new link.",
      );
    }

    if (record.state === "REVOKED") {
      throw ApiError.forbidden(
        "ACCESS_LINK_REVOKED",
        "The patient has revoked access through this link.",
      );
    }

    return buildGrant({
      patientId: record.patientId,
      method: "SHARING_LINK",
      authorizationStatus: record.authorizationStatus,
      expiresInMinutes: record.expiresInMinutes,
    });
  },

  async grantFromAppointment(appointmentId: string): Promise<PatientAccessGrant> {
    const appointment = await appointmentService.getById(appointmentId);

    return accessGrantRepository.save({
      id: createId("grant"),
      patient: appointment.patient,
      method: "APPOINTMENT",
      authorizationStatus: "AUTHORIZED",
      appointment,
      expiresAt: minutesFromNow(appointment.durationMinutes + 30),
      grantedAt: new Date().toISOString(),
    });
  },
};
