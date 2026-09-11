import type { NextFunction, Request, Response } from "express";
import type { Doctor } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { authService } from "../services/auth.service";
import { withSession } from "../lib/patient-api";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      doctor?: Doctor;
    }
  }
}

/**
 * Resolves the bearer token into a doctor, and binds it to the async context
 * for the rest of the request.
 *
 * The binding is what lets repositories reach the patient platform as the
 * clinician who made the request, without every service signature carrying a
 * token it does not otherwise care about. `next()` is called inside the bound
 * scope, so every downstream handler — and everything it awaits — runs with
 * the session attached.
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

  let doctor: Doctor;
  try {
    doctor = await authService.resolveDoctorFromToken(token);
  } catch (error) {
    next(error);
    return;
  }

  req.doctor = doctor;
  withSession(token, async () => {
    next();
  });
}

/** Narrows `req.doctor` for handlers mounted behind `requireDoctor`. */
export function getAuthenticatedDoctor(req: Request): Doctor {
  if (!req.doctor) {
    throw ApiError.unauthorized("UNAUTHORIZED", "Sign in to continue.");
  }
  return req.doctor;
}
