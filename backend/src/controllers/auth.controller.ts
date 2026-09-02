import type { Request, Response } from "express";
import { sendSuccess } from "../lib/respond";
import { authService } from "../services/auth.service";

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body ?? {};
    const session = await authService.login({ email, password });
    sendSuccess(res, session);
  },
};
