import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireDoctor } from "../middleware/auth.middleware";

export const authRoutes = Router();

authRoutes.post("/login", authController.login);
// Declared in the client's endpoint map and in the README, but never routed —
// a stored token could not be checked without provoking a 401 elsewhere.
authRoutes.get("/me", requireDoctor, authController.me);
// Reachable even while must_change_password is true on the patient platform —
// see requirePasswordChange.middleware.ts there, which allows exactly this
// route and /auth/me through before every other doctor route.
authRoutes.post("/change-password", requireDoctor, authController.changePassword);
