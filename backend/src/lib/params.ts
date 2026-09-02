import type { Request } from "express";
import { ApiError } from "./api-error";

/**
 * Express 5 types route params as `string | string[]`. Route paths here declare
 * single-segment params only, so anything else is a programming error.
 */
export function requireParam(req: Request, name: string, message: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw ApiError.validation(message, { [name]: message });
  }
  return value.trim();
}
