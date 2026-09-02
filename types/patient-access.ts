import type { AppointmentWithPatient } from "./appointment";
import type { Patient } from "./patient";

/** How the doctor arrived at this patient's record. */
export type AccessMethod = "APPOINTMENT" | "ACCESS_CODE" | "SHARING_LINK";

export type AuthorizationStatus = "AUTHORIZED" | "PENDING" | "DENIED";

/**
 * The result of a successful access attempt. In Phase 1 this is issued by a
 * mock repository; the shape is what a real authorization service would return.
 */
export interface PatientAccessGrant {
  /**
   * Server-issued grant id. The consultation service resolves authorization
   * from this rather than trusting anything the client asserts.
   */
  id: string;
  patient: Patient;
  method: AccessMethod;
  authorizationStatus: AuthorizationStatus;
  /** Populated when the grant originated from a scheduled appointment. */
  appointment: AppointmentWithPatient | null;
  /** ISO timestamp after which the grant must be re-established. */
  expiresAt: string | null;
  grantedAt: string;
}

export interface AccessCodeValidationRequest {
  code: string;
}

export interface SharingLinkValidationRequest {
  /** Either a full share URL or the bare token. */
  link: string;
}
