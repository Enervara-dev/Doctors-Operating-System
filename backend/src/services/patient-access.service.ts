import type { PatientAccessGrant } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { patientAccessRepository } from "../repositories/patient-access.repository";

/**
 * Getting permission to open a patient's record.
 *
 * Authorization is decided by the patient platform, which owns the codes, the
 * grants and the patient's consent. This service validates the shape of what
 * the doctor typed and forwards it; it never decides that access was granted,
 * and it holds no grant of its own that could outlive a revocation.
 *
 * Access codes are issued by the patient and valid for 24 hours. The window is
 * evaluated in SQL against the database clock, so nothing here — and no
 * container with a skewed clock — can extend it.
 */

/** Codes are typed by hand from the patient's screen; be liberal about format. */
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export const patientAccessService = {
  async validateAccessCode(rawCode: unknown): Promise<PatientAccessGrant> {
    const code = typeof rawCode === "string" ? normalizeCode(rawCode) : "";
    if (!code) {
      throw ApiError.validation("Please correct the highlighted fields.", {
        code: "Access code is required.",
      });
    }
    return patientAccessRepository.redeemAccessCode(code);
  },

  async grantFromAppointment(rawAppointmentId: unknown): Promise<PatientAccessGrant> {
    const appointmentId = typeof rawAppointmentId === "string" ? rawAppointmentId.trim() : "";
    if (!appointmentId) {
      throw ApiError.validation("Please correct the highlighted fields.", {
        appointmentId: "An appointment is required.",
      });
    }
    return patientAccessRepository.grantFromAppointment(appointmentId);
  },

  /**
   * Sharing links are not part of this flow.
   *
   * The patient platform issues 24-hour access codes; a link-based share of a
   * clinical record has no issuing path behind it yet. Returning a clear
   * refusal is better than a screen that accepts a token nothing can mint.
   */
  async validateSharingLink(): Promise<never> {
    throw new ApiError(
      501,
      "INTERNAL_ERROR",
      "Sharing links are not available. Ask the patient for a 24-hour access code instead.",
    );
  },
};
