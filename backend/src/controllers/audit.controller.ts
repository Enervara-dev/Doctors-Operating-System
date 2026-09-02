import type { Request, Response } from "express";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { auditService } from "../services/audit.service";

export const auditController = {
  async listForConsultation(req: Request, res: Response): Promise<void> {
    const id = requireParam(req, "id", "A consultation id is required.");
    sendSuccess(res, await auditService.listForConsultation(id));
  },
};
