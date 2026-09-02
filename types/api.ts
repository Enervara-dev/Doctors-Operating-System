/**
 * Transport-level contract shared by the Express API and the frontend client.
 * Every endpoint answers with exactly one of these two shapes.
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "PATIENT_NOT_FOUND"
  | "APPOINTMENT_NOT_FOUND"
  | "DOCTOR_NOT_FOUND"
  | "ACCESS_CODE_INVALID"
  | "ACCESS_LINK_INVALID"
  | "ACCESS_LINK_EXPIRED"
  | "ACCESS_LINK_REVOKED"
  | "CONSULTATION_NOT_FOUND"
  | "CONSULTATION_FINALIZED"
  | "INVALID_STATE_TRANSITION"
  | "INVESTIGATION_NOT_FOUND"
  | "MEDICATION_NOT_FOUND"
  | "PATIENT_CONTEXT_NOT_FOUND"
  | "CONSULTATION_NOT_READY"
  | "CONSULTATION_ALREADY_FINALIZED"
  | "RECORD_NOT_FOUND"
  | "AUDIT_UNAVAILABLE"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

/** One blocking problem, addressed to the workflow section that owns it. */
export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  /** Field-level messages, keyed by field name. Present on VALIDATION_ERROR. */
  details?: Record<string, string>;
  /**
   * Ordered list of blocking problems. Used where the caller needs to render a
   * checklist rather than annotate individual inputs — the finalization guard.
   */
  issues?: ValidationIssue[];
}

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;
