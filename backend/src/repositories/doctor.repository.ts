import type { AuthSession, Doctor } from "../domain/types";
import { patientApi } from "../lib/patient-api";

/**
 * The signed-in clinician.
 *
 * Authentication is delegated to the patient platform, which owns the account
 * store: a doctor is a `users` row with `role = 'doctor'`. That is why there
 * is no credential handling in this service at all — no password ever reaches
 * this process, and the token it forwards is the platform's own, so the
 * platform's audit trail names the actual clinician rather than this app.
 */

interface RemoteDoctor {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  displayName: string;
  specialty: string | null;
  qualifications: string[];
  registrationNumber: string | null;
  avatarInitials: string;
}

function toDoctor(remote: RemoteDoctor): Doctor {
  return {
    id: remote.id,
    fullName: remote.fullName,
    displayName: remote.displayName,
    email: remote.email,
    specialty: remote.specialty ?? "",
    // The contract carries one display line; the platform stores the list.
    qualifications: remote.qualifications.join(', '),
    registrationNumber: remote.registrationNumber ?? "",
    avatarInitials: remote.avatarInitials,
  };
}

export const doctorRepository = {
  /**
   * Resolves a doctor by id.
   *
   * The only doctor this service can read is the signed-in one — the platform
   * exposes no directory, and a clinician has no business enumerating
   * colleagues. Callers use this to confirm the doctor named on a record is
   * the caller; any other id is reported as not found rather than guessed at.
   */
  async findById(id: string): Promise<Doctor | null> {
    const doctor = await this.me();
    return doctor.id === id ? doctor : null;
  },

  /** Anonymous by definition — this is the call that establishes the session. */
  async login(email: string, password: string): Promise<AuthSession> {
    const body = await patientApi.post<{ doctor: RemoteDoctor; token: string; issuedAt: string }>(
      "/api/doctor/auth/login",
      { email, password },
      { anonymous: true },
    );
    return { doctor: toDoctor(body.doctor), token: body.token, issuedAt: body.issuedAt };
  },

  async me(): Promise<Doctor> {
    const { doctor } = await patientApi.getOnce<{ doctor: RemoteDoctor }>("/api/doctor/auth/me");
    return toDoctor(doctor);
  },
};
