import { Router } from "express";
import { appointmentRoutes } from "./appointment.routes";
import { authRoutes } from "./auth.routes";
import { consultationRoutes } from "./consultation.routes";
import { patientAccessRoutes } from "./patient-access.routes";
import { patientRoutes } from "./patient.routes";
import { recordRoutes } from "./record.routes";

export const apiRoutes = Router();

apiRoutes.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", uptime: process.uptime() } });
});

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/appointments", appointmentRoutes);
apiRoutes.use("/patients", patientRoutes);
apiRoutes.use("/consultations", consultationRoutes);
apiRoutes.use("/records", recordRoutes);
apiRoutes.use("/patient-access", patientAccessRoutes);
