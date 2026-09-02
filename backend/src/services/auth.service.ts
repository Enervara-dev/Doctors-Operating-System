import type { AuthSession, Doctor, LoginCredentials } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { simulateLatency } from "../lib/delay";
import { doctorRepository } from "../repositories/doctor.repository";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PREFIX = "enervara.mock";

/**
 * Phase 1 token: a reversible, unsigned envelope. It exists so that every layer
 * above it can already be written against a bearer-token contract. It provides
 * no security and must be replaced before any real patient data is served.
 */
function issueToken(doctorId: string, issuedAt: string): string {
  const payload = Buffer.from(`${doctorId}:${issuedAt}`, "utf8").toString("base64url");
  return `${TOKEN_PREFIX}.${payload}`;
}

function readTokenDoctorId(token: string): string | null {
  if (!token.startsWith(`${TOKEN_PREFIX}.`)) return null;
  const payload = token.slice(TOKEN_PREFIX.length + 1);
  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const [doctorId] = decoded.split(":");
    return doctorId && doctorId.length > 0 ? doctorId : null;
  } catch {
    return null;
  }
}

function assertValidCredentials(credentials: Partial<LoginCredentials>): LoginCredentials {
  const email = credentials.email?.trim() ?? "";
  const password = credentials.password ?? "";
  const details: Record<string, string> = {};

  if (!email) details.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email)) details.email = "Enter a valid email address.";

  if (!password) details.password = "Password is required.";
  else if (password.length < 6) details.password = "Password must be at least 6 characters.";

  if (Object.keys(details).length > 0) {
    throw ApiError.validation("Please correct the highlighted fields.", details);
  }

  return { email, password };
}

export const authService = {
  async login(input: Partial<LoginCredentials>): Promise<AuthSession> {
    const credentials = assertValidCredentials(input);
    await simulateLatency(2);

    const doctorId = await doctorRepository.findIdByCredentials(
      credentials.email,
      credentials.password,
    );
    if (!doctorId) {
      throw ApiError.unauthorized(
        "INVALID_CREDENTIALS",
        "The email or password you entered is incorrect.",
      );
    }

    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) {
      throw ApiError.notFound("DOCTOR_NOT_FOUND", "The doctor profile could not be loaded.");
    }

    const issuedAt = new Date().toISOString();
    return { doctor, token: issueToken(doctor.id, issuedAt), issuedAt };
  },

  async resolveDoctorFromToken(token: string): Promise<Doctor> {
    const doctorId = readTokenDoctorId(token);
    if (!doctorId) {
      throw ApiError.unauthorized("UNAUTHORIZED", "Your session is no longer valid.");
    }
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) {
      throw ApiError.unauthorized("UNAUTHORIZED", "Your session is no longer valid.");
    }
    return doctor;
  },
};
