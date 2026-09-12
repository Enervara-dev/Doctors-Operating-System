export interface Doctor {
  id: string;
  fullName: string;
  /** Short form used in greetings, e.g. "Meera Iyer" -> "Dr. Iyer". */
  displayName: string;
  email: string;
  specialty: string;
  qualifications: string;
  registrationNumber: string;
  avatarInitials: string;
}

export interface AuthSession {
  doctor: Doctor;
  /** Opaque session token. Mocked in Phase 1; issued by a real IdP later. */
  token: string;
  issuedAt: string;
  /**
   * True for an account still on its one-time temporary credential (issued
   * when an admin approves a doctor application). The doctor dashboard is
   * unreachable — both client-side (`PasswordChangeGuard`) and server-side
   * (the patient platform's `requirePasswordChange` middleware) — until
   * `POST /auth/change-password` clears it.
   */
  mustChangePassword: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
