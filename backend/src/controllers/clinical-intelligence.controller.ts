import type { Request, Response } from "express";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { clinicalIntelligenceService } from "../services/clinical-intelligence.service";

export const clinicalIntelligenceController = {
  /**
   * Contract placeholder. Returns an explicit availability envelope; the default
   * response is UNAVAILABLE. `?source=` opts into synthetic fixtures used to
   * exercise the UI's available/partial/waiting/error states.
   */
  async getForConsultation(req: Request, res: Response): Promise<void> {
    const id = requireParam(req, "id", "A consultation id is required.");
    sendSuccess(res, await clinicalIntelligenceService.getForConsultation(id, req.query.source));
  },
};
