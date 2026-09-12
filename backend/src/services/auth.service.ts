import type { AuthSession, ChangePasswordInput, Doctor, LoginCredentials } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { doctorRepository } from "../repositories/doctor.repository";
import { withSession } from "../lib/patient-api";

const MIN_PASSWORD_LENGTH = 12;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Authentication, delegated to the patient platform.
 *
 * This service issues no tokens and stores no credentials. It forwards the
 * clinician's email and password once, receives the platform's own session
 * token, and hands that back to the browser; every later request carries it
 * straight through. One account store, one token format, one audit trail —
 * and no password ever reaches this process's memory beyond the single call
 * that forwards it.
 *
 * Shape validation stays here because it is a form concern: telling a doctor
 * their email is malformed should not cost a network round trip.
 */
function assertValidCredentials(credentials: Partial<LoginCredentials>): LoginCredentials {
  const email = credentials.email?.trim() ?? "";
  const password = credentials.password ?? "";
  const details: Record<string, string> = {};

  if (!email) details.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email)) details.email = "Enter a valid email address.";

  if (!password) details.password = "Password is required.";

  if (Object.keys(details).length > 0) {
    throw ApiError.validation("Please correct the highlighted fields.", details);
  }

  return { email, password };
}

export const authService = {
  async login(input: Partial<LoginCredentials>): Promise<AuthSession> {
    const credentials = assertValidCredentials(input);
    return doctorRepository.login(credentials.email, credentials.password);
  },

  /**
   * Resolves a bearer token to the clinician holding it.
   *
   * The token is verified upstream, not here: this service has no signing key
   * and cannot decide whether one is genuine. A token that no longer resolves
   * — expired, revoked, or belonging to a patient rather than a doctor — comes
   * back as a 401 from the platform and is reported as an ended session.
   */
  async resolveDoctorFromToken(token: string): Promise<Doctor> {
    return withSession(token, async () => {
      try {
        return await doctorRepository.me();
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          throw ApiError.unauthorized("UNAUTHORIZED", "Your session is no longer valid.");
        }
        throw error;
      }
    });
  },

  /**
   * Shape validation only — the current-password check and the actual hash
   * rotation happen on the patient platform, the one place that holds the
   * credential. Enforcing a minimum length here as well as there means a
   * bad request fails before a network round trip.
   */
  async changePassword(input: Partial<ChangePasswordInput>): Promise<void> {
    const currentPassword = input.currentPassword ?? "";
    const newPassword = input.newPassword ?? "";
    const details: Record<string, string> = {};

    if (!currentPassword) details.currentPassword = "Your current password is required.";
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      details.newPassword = `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (Object.keys(details).length > 0) {
      throw ApiError.validation("Please correct the highlighted fields.", details);
    }

    await doctorRepository.changePassword({ currentPassword, newPassword });
  },
};
