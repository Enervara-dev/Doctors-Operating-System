import { Router } from "express";
import { patientContextController } from "../controllers/patient-context.controller";
import { patientController } from "../controllers/patient.controller";
import { requireDoctor } from "../middleware/auth.middleware";

export const patientRoutes = Router();

patientRoutes.use(requireDoctor);
patientRoutes.get("/:id", patientController.getById);
patientRoutes.get("/:id/context", patientContextController.getByPatientId);
