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
}

export interface LoginCredentials {
  email: string;
  password: string;
}
