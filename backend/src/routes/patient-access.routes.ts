import { Router } from "express";
import { patientAccessController } from "../controllers/patient-access.controller";
import { requireDoctor } from "../middleware/auth.middleware";

export const patientAccessRoutes = Router();

patientAccessRoutes.use(requireDoctor);
patientAccessRoutes.post("/code/validate", patientAccessController.validateCode);
patientAccessRoutes.post("/link/validate", patientAccessController.validateLink);
patientAccessRoutes.post("/appointment/grant", patientAccessController.grantFromAppointment);
