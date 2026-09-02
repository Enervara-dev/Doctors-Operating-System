import type { ApiErrorCode } from "@/types";
import { ApiClientError } from "./client";

/** Normalised failure shape stores expose to the UI. */
export interface RequestFailure {
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function toRequestFailure(error: unknown): RequestFailure {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details ? { fieldErrors: error.details } : {}),
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
  };
}
