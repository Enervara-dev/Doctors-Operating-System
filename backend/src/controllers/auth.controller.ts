import type { Request, Response } from "express";
import { sendSuccess } from "../lib/respond";
import { getAuthenticatedDoctor } from "../middleware/auth.middleware";
import { authService } from "../services/auth.service";

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body ?? {};
    const session = await authService.login({ email, password });
    sendSuccess(res, session);
  },

  /**
   * The signed-in doctor.
   *
   * Resolving the token is the middleware's job, so by the time this runs the
   * profile has already been read from the patient platform — this hands it
   * back. Its value is that a client holding a stored token can confirm the
   * session is still good without guessing from a 401 on some other call.
   */
  async me(req: Request, res: Response): Promise<void> {
    sendSuccess(res, getAuthenticatedDoctor(req));
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    await authService.changePassword(req.body ?? {});
    sendSuccess(res, { changed: true });
  },
};
