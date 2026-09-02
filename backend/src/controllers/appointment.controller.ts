import type { Request, Response } from "express";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { getAuthenticatedDoctor } from "../middleware/auth.middleware";
import { appointmentService } from "../services/appointment.service";

export const appointmentController = {
  async list(req: Request, res: Response): Promise<void> {
    const doctor = getAuthenticatedDoctor(req);
    sendSuccess(res, await appointmentService.getBoard(doctor.id));
  },

  async getById(req: Request, res: Response): Promise<void> {
    const id = requireParam(req, "id", "An appointment id is required.");
    sendSuccess(res, await appointmentService.getById(id));
  },
};
