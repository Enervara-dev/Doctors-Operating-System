import { Router } from "express";
import { auditController } from "../controllers/audit.controller";
import { clinicalIntelligenceController } from "../controllers/clinical-intelligence.controller";
import { consultationController } from "../controllers/consultation.controller";
import { requireDoctor } from "../middleware/auth.middleware";

export const consultationRoutes = Router();

consultationRoutes.use(requireDoctor);

consultationRoutes.post("/", consultationController.create);
consultationRoutes.get("/:id", consultationController.getById);
consultationRoutes.patch("/:id", consultationController.patch);

consultationRoutes.patch("/:id/context", consultationController.updateContext);
consultationRoutes.post("/:id/notes", consultationController.updateNotes);

consultationRoutes.post("/:id/differential-reviews", consultationController.reviewDifferential);
consultationRoutes.post("/:id/diagnosis", consultationController.setDiagnoses);

consultationRoutes.post("/:id/investigations", consultationController.addInvestigation);
consultationRoutes.patch(
  "/:id/investigations/:investigationId",
  consultationController.updateInvestigation,
);
consultationRoutes.delete(
  "/:id/investigations/:investigationId",
  consultationController.removeInvestigation,
);

consultationRoutes.post("/:id/medications", consultationController.addMedication);
consultationRoutes.patch("/:id/medications/:medicationId", consultationController.updateMedication);
consultationRoutes.delete(
  "/:id/medications/:medicationId",
  consultationController.removeMedication,
);

consultationRoutes.post("/:id/follow-up", consultationController.setFollowUp);
consultationRoutes.post("/:id/finalize", consultationController.finalize);
consultationRoutes.get("/:id/summary", consultationController.getSummary);
consultationRoutes.get("/:id/record", consultationController.getRecord);
consultationRoutes.get("/:id/audit", auditController.listForConsultation);

// Contract placeholder for the future clinical intelligence service.
consultationRoutes.get(
  "/:id/clinical-intelligence",
  clinicalIntelligenceController.getForConsultation,
);
