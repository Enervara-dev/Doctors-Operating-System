import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "../domain/types";
import { ApiError } from "../lib/api-error";

/** Terminal error middleware. Every failure leaves the API in the same shape. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        ...(error.issues ? { issues: error.issues } : {}),
      },
    };
    res.status(error.status).json(body);
    return;
  }

  console.error("[api] unhandled error", error);
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again.",
    },
  };
  res.status(500).json(body);
}
