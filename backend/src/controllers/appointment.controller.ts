import type { Request, Response } from "express";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { getAuthenticatedDoctor } from "../middleware/auth.middleware";
import { appointmentService } from "../services/appointment.service";

export const appointmentController = {
  async list(req: Request, res: Response): Promise<void> {
    // Asserts the session before reading. The board itself is scoped upstream
    // to the authenticated clinician, so no doctor id is passed down — a
    // caller cannot ask for someone else's schedule by supplying one.
    getAuthenticatedDoctor(req);
    sendSuccess(res, await appointmentService.getBoard());
  },

  async getById(req: Request, res: Response): Promise<void> {
    const id = requireParam(req, "id", "An appointment id is required.");
    sendSuccess(res, await appointmentService.getById(id));
  },

  /**
   * Accepts a patient's booking request.
   *
   * Deliberately not a general "set any status" endpoint: this service exposes
   * the one transition the dashboard actually offers, so a malformed or
   * unexpected state can never be forwarded upstream.
   */
  async confirm(req: Request, res: Response): Promise<void> {
    getAuthenticatedDoctor(req);
    const id = requireParam(req, "id", "An appointment id is required.");
    sendSuccess(res, await appointmentService.confirm(id));
  },
};
