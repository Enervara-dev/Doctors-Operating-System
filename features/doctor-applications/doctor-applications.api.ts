/**
 * Doctor application submission and status — the ONE feature that calls the
 * patient platform's public API directly from the browser rather than
 * through the doctor BFF (`lib/api/client.ts` / `@/api/*`).
 *
 * Every other feature in this app is authenticated: the BFF forwards the
 * doctor's own bearer token upstream (`lib/patient-api.ts`, backend side).
 * There is no token yet at the point someone is applying to become a doctor,
 * so there is nothing for that forwarding to do — this talks to
 * `NEXT_PUBLIC_PATIENT_API_URL`'s public, rate-limited
 * `/api/doctor-applications/*` endpoints directly, the same way any external
 * client of that public API would.
 */

export interface DoctorApplicationStatus {
  id: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "RESUBMISSION_REQUIRED";
  fullName: string;
  email: string;
  submittedAt: string;
  decidedAt: string | null;
}

export interface DoctorApplicationApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export class DoctorApplicationRequestError extends Error {
  readonly code: string;
  readonly details?: Record<string, string>;

  constructor(body: DoctorApplicationApiError) {
    super(body.message);
    this.name = "DoctorApplicationRequestError";
    this.code = body.code;
    this.details = body.details;
  }
}

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_PATIENT_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_PATIENT_API_URL is not set — see .env.example. This must point at the " +
        "patient platform's public origin.",
    );
  }
  return url.replace(/\/$/, "");
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const body = (payload as DoctorApplicationApiError | null) ?? {
      code: "INTERNAL_ERROR",
      message: "The application service is unavailable. Please try again.",
    };
    throw new DoctorApplicationRequestError(body);
  }

  return payload as T;
}

export interface DoctorApplicationSubmission {
  email: string;
  phone?: string;
  fullName: string;
  displayName?: string;
  nmrNumber: string;
  qualifications?: string;
  yearsOfExperience?: string;
  certificate: File;
}

function toFormData(input: DoctorApplicationSubmission): FormData {
  const form = new FormData();
  form.set("email", input.email);
  if (input.phone) form.set("phone", input.phone);
  form.set("fullName", input.fullName);
  if (input.displayName) form.set("displayName", input.displayName);
  form.set("nmrNumber", input.nmrNumber);
  if (input.qualifications) form.set("qualifications", input.qualifications);
  if (input.yearsOfExperience) form.set("yearsOfExperience", input.yearsOfExperience);
  form.set("certificate", input.certificate);
  return form;
}

export const doctorApplicationsApi = {
  async submit(input: DoctorApplicationSubmission): Promise<DoctorApplicationStatus> {
    const response = await fetch(`${baseUrl()}/api/doctor-applications`, {
      method: "POST",
      body: toFormData(input),
    });
    const body = await parse<{ application: DoctorApplicationStatus }>(response);
    return body.application;
  },

  async getStatus(applicationId: string): Promise<{ application: DoctorApplicationStatus; reason: string | null }> {
    const response = await fetch(
      `${baseUrl()}/api/doctor-applications/${encodeURIComponent(applicationId)}/status`,
    );
    return parse(response);
  },

  async resubmit(applicationId: string, certificate: File): Promise<DoctorApplicationStatus> {
    const form = new FormData();
    form.set("certificate", certificate);
    const response = await fetch(
      `${baseUrl()}/api/doctor-applications/${encodeURIComponent(applicationId)}/resubmit`,
      { method: "POST", body: form },
    );
    const body = await parse<{ application: DoctorApplicationStatus }>(response);
    return body.application;
  },
};
