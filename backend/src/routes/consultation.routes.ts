import { Router } from "express";
import { auditController } from "../controllers/audit.controller";
import { clinicalIntelligenceController } from "../controllers/clinical-intelligence.controller";
import { consultationController } from "../controllers/consultation.controller";
import { liveController } from "../controllers/live.controller";
import { requireDoctor } from "../middleware/auth.middleware";

export const consultationRoutes = Router();

consultationRoutes.use(requireDoctor);

consultationRoutes.post("/", consultationController.create);
consultationRoutes.get("/:id", consultationController.getById);
consultationRoutes.patch("/:id", consultationController.patch);

consultationRoutes.patch("/:id/context", consultationController.updateContext);
consultationRoutes.post("/:id/notes", consultationController.updateNotes);

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

/* ---------------------------------------------------------------- live session */
consultationRoutes.get("/:id/live", liveController.getSession);
consultationRoutes.post("/:id/live/start", liveController.start);
consultationRoutes.post("/:id/live/pause", liveController.pause);
consultationRoutes.post("/:id/live/resume", liveController.resume);
consultationRoutes.post("/:id/live/stop", liveController.stop);
/** Cursor catch-up; backs the polling transport and stream reconnects. */
consultationRoutes.get("/:id/live/updates", liveController.getUpdates);
/** Server-sent events; the preferred transport when the client can hold it open. */
consultationRoutes.get("/:id/live/stream", liveController.stream);

/* ------------------------------------------------- clinical domains (separate) */
consultationRoutes.get("/:id/transcript", clinicalIntelligenceController.getTranscript);
consultationRoutes.get("/:id/clinical-context", clinicalIntelligenceController.getClinicalContext);
consultationRoutes.get("/:id/clinical-intelligence", clinicalIntelligenceController.getEnvelope);
consultationRoutes.get(
  "/:id/clinical-intelligence/considerations",
  clinicalIntelligenceController.getConsiderations,
);
consultationRoutes.get(
  "/:id/clinical-intelligence/investigations",
  clinicalIntelligenceController.getInvestigations,
);
consultationRoutes.get(
  "/:id/clinical-intelligence/missing-information",
  clinicalIntelligenceController.getMissingInformation,
);
consultationRoutes.get(
  "/:id/clinical-intelligence/safety",
  clinicalIntelligenceController.getSafety,
);
consultationRoutes.get(
  "/:id/clinical-intelligence/evidence",
  clinicalIntelligenceController.getEvidence,
);
consultationRoutes.get("/:id/events", clinicalIntelligenceController.getEvents);

/* ------------------------------------------------------------- doctor decisions */
consultationRoutes.get("/:id/decisions", clinicalIntelligenceController.listDecisions);
consultationRoutes.post("/:id/decisions", clinicalIntelligenceController.recordDecision);
