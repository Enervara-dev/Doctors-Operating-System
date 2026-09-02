import type { NextFunction, Request, Response } from "express";
import type { Doctor } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { authService } from "../services/auth.service";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      doctor?: Doctor;
    }
  }
}

/**
 * Resolves the bearer token into a doctor. Phase 1 tokens are unsigned mocks;
 * the middleware boundary is what matters — swapping in real verification
 * touches this file and `auth.service` only.
 */
export async function requireDoctor(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    next(ApiError.unauthorized("UNAUTHORIZED", "Sign in to continue."));
    return;
  }

  try {
    req.doctor = await authService.resolveDoctorFromToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

/** Narrows `req.doctor` for handlers mounted behind `requireDoctor`. */
export function getAuthenticatedDoctor(req: Request): Doctor {
  if (!req.doctor) {
    throw ApiError.unauthorized("UNAUTHORIZED", "Sign in to continue.");
  }
  return req.doctor;
}
