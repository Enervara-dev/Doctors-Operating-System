import { Router } from "express";
import { recordController } from "../controllers/record.controller";
import { requireDoctor } from "../middleware/auth.middleware";

export const recordRoutes = Router();

recordRoutes.use(requireDoctor);

recordRoutes.get("/", recordController.list);
recordRoutes.get("/:id", recordController.getById);
recordRoutes.get("/:id/audit", recordController.getAudit);
recordRoutes.get("/:id/patient-communication", recordController.getPatientCommunication);
