import type { Request, Response } from "express";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { patientContextService } from "../services/patient-context.service";

export const patientContextController = {
  async getByPatientId(req: Request, res: Response): Promise<void> {
    const id = requireParam(req, "id", "A patient id is required.");
    sendSuccess(res, await patientContextService.getByPatientId(id));
  },
};
