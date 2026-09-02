import type { Request, Response } from "express";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { patientService } from "../services/patient.service";

export const patientController = {
  async getById(req: Request, res: Response): Promise<void> {
    const id = requireParam(req, "id", "A patient id is required.");
    sendSuccess(res, await patientService.getById(id));
  },
};
