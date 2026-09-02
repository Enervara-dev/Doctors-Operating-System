import type { ApiErrorCode, ValidationIssue } from "../domain/types";

/**
 * The only error type controllers and services are expected to throw.
 * Anything else reaching the error handler is treated as an unexpected fault.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: Record<string, string>;
  /** Ordered blocking problems, for callers that render a checklist. */
  readonly issues?: ValidationIssue[];

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: Record<string, string>,
    issues?: ValidationIssue[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.issues = issues;
  }

  static validation(message: string, details?: Record<string, string>): ApiError {
    return new ApiError(422, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(code: ApiErrorCode, message: string): ApiError {
    return new ApiError(401, code, message);
  }

  static notFound(code: ApiErrorCode, message: string): ApiError {
    return new ApiError(404, code, message);
  }

  static forbidden(code: ApiErrorCode, message: string): ApiError {
    return new ApiError(403, code, message);
  }
}
