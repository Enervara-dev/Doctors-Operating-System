import type { Request, Response } from "express";
import type { Doctor } from "../domain/types";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { getAuthenticatedDoctor } from "../middleware/auth.middleware";
import { consultationRecordService } from "../services/consultation-record.service";
import { consultationService } from "../services/consultation.service";

function body(req: Request): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

function consultationId(req: Request): string {
  return requireParam(req, "id", "A consultation id is required.");
}

/** Every mutation is attributed to the authenticated doctor, for the audit trail. */
function actor(req: Request): Doctor {
  return getAuthenticatedDoctor(req);
}

export const consultationController = {
  async create(req: Request, res: Response): Promise<void> {
    const input = body(req);
    const created = await consultationService.create({
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      consultationType: input.consultationType,
      accessGrantId: input.accessGrantId,
      doctor: actor(req),
    });
    sendSuccess(res, created, 201);
  },

  async getById(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await consultationService.getById(consultationId(req)));
  },

  async patch(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await consultationService.patch(consultationId(req), body(req), actor(req)));
  },

  async updateContext(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await consultationService.updateContext(consultationId(req), body(req), actor(req)),
    );
  },

  async updateNotes(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await consultationService.updateNotes(consultationId(req), body(req), actor(req)),
    );
  },

  async reviewDifferential(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await consultationService.reviewDifferential(consultationId(req), body(req), actor(req)),
    );
  },

  async setDiagnoses(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await consultationService.setDiagnoses(consultationId(req), body(req), actor(req)),
    );
  },

  async addInvestigation(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await consultationService.addInvestigation(consultationId(req), body(req), actor(req)),
      201,
    );
  },

  async updateInvestigation(req: Request, res: Response): Promise<void> {
    const investigationId = requireParam(
      req,
      "investigationId",
      "An investigation id is required.",
    );
    sendSuccess(
      res,
      await consultationService.updateInvestigation(
        consultationId(req),
        investigationId,
        body(req),
        actor(req),
      ),
    );
  },

  async removeInvestigation(req: Request, res: Response): Promise<void> {
    const investigationId = requireParam(
      req,
      "investigationId",
      "An investigation id is required.",
    );
    sendSuccess(
      res,
      await consultationService.removeInvestigation(
        consultationId(req),
        investigationId,
        actor(req),
      ),
    );
  },

  async addMedication(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await consultationService.addMedication(consultationId(req), body(req), actor(req)),
      201,
    );
  },

  async updateMedication(req: Request, res: Response): Promise<void> {
    const medicationId = requireParam(req, "medicationId", "A medication id is required.");
    sendSuccess(
      res,
      await consultationService.updateMedication(
        consultationId(req),
        medicationId,
        body(req),
        actor(req),
      ),
    );
  },

  async removeMedication(req: Request, res: Response): Promise<void> {
    const medicationId = requireParam(req, "medicationId", "A medication id is required.");
    sendSuccess(
      res,
      await consultationService.removeMedication(consultationId(req), medicationId, actor(req)),
    );
  },

  async setFollowUp(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await consultationService.setFollowUp(consultationId(req), body(req), actor(req)),
    );
  },

  /**
   * Finalization is a controlled service operation; the controller only
   * authenticates and translates. Idempotent by design — a repeat call returns
   * the existing record rather than creating a second one.
   */
  async finalize(req: Request, res: Response): Promise<void> {
    const result = await consultationRecordService.finalize(consultationId(req), actor(req));
    sendSuccess(res, result, result.alreadyFinalized ? 200 : 201);
  },

  async getSummary(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await consultationService.getSummary(consultationId(req)));
  },

  async getRecord(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await consultationRecordService.getByConsultationId(consultationId(req)));
  },
};
