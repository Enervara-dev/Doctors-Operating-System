import type { Request, Response } from "express";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { clinicalContextService } from "../services/clinical-context.service";
import { clinicalIntelligenceService } from "../services/clinical-intelligence.service";
import { consultationEventService } from "../services/consultation-event.service";
import { doctorDecisionService } from "../services/doctor-decision.service";
import { transcriptService } from "../services/transcript.service";
import { getAuthenticatedDoctor } from "../middleware/auth.middleware";

function consultationId(req: Request): string {
  return requireParam(req, "id", "A consultation id is required.");
}

function since(req: Request): number {
  const raw = req.query.since;
  const parsed = typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Domain-scoped reads. Each surface fetches only what it renders rather than
 * pulling one combined payload, so a slow or absent section never blocks the
 * rest of the workspace.
 */
export const clinicalIntelligenceController = {
  async getTranscript(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await transcriptService.getSnapshot(consultationId(req), since(req)));
  },

  async getClinicalContext(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await clinicalContextService.get(consultationId(req)));
  },

  async getEnvelope(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await clinicalIntelligenceService.getEnvelope(consultationId(req)));
  },

  async getConsiderations(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await clinicalIntelligenceService.getConsiderations(consultationId(req)));
  },

  async getInvestigations(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await clinicalIntelligenceService.getInvestigationRecommendations(consultationId(req)),
    );
  },

  async getMissingInformation(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await clinicalIntelligenceService.getMissingInformation(consultationId(req)),
    );
  },

  async getSafety(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await clinicalIntelligenceService.getSafety(consultationId(req)));
  },

  async getEvidence(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await clinicalIntelligenceService.getEvidence(consultationId(req)));
  },

  async getEvents(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await consultationEventService.list(consultationId(req), since(req)));
  },

  async listDecisions(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await doctorDecisionService.list(consultationId(req)));
  },

  async recordDecision(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await doctorDecisionService.record(
        consultationId(req),
        (req.body ?? {}) as Record<string, never>,
        getAuthenticatedDoctor(req),
      ),
      201,
    );
  },
};
