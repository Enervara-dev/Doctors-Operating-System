import type { Request, Response } from "express";
import { ApiError } from "../lib/api-error";
import { sendSuccess } from "../lib/respond";
import { patientAccessService } from "../services/patient-access.service";

export const patientAccessController = {
  async validateCode(req: Request, res: Response): Promise<void> {
    const grant = await patientAccessService.validateAccessCode(req.body?.code);
    sendSuccess(res, grant);
  },

  async validateLink(req: Request, res: Response): Promise<void> {
    const grant = await patientAccessService.validateSharingLink();
    sendSuccess(res, grant);
  },

  async grantFromAppointment(req: Request, res: Response): Promise<void> {
    const appointmentId = req.body?.appointmentId;
    if (typeof appointmentId !== "string" || appointmentId.trim().length === 0) {
      throw ApiError.validation("Please correct the highlighted fields.", {
        appointmentId: "An appointment must be selected.",
      });
    }
    sendSuccess(res, await patientAccessService.grantFromAppointment(appointmentId.trim()));
  },
};
