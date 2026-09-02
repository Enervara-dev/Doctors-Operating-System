import { Router } from "express";
import { appointmentController } from "../controllers/appointment.controller";
import { requireDoctor } from "../middleware/auth.middleware";

export const appointmentRoutes = Router();

appointmentRoutes.use(requireDoctor);
appointmentRoutes.get("/", appointmentController.list);
appointmentRoutes.get("/:id", appointmentController.getById);
