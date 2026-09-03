import type { Request, Response } from "express";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { getAuthenticatedDoctor } from "../middleware/auth.middleware";
import { liveSessionService } from "../services/live-session.service";

function consultationId(req: Request): string {
  return requireParam(req, "id", "A consultation id is required.");
}

function cursor(req: Request, key: string): number {
  const raw = req.query[key];
  const parsed = typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export const liveController = {
  async getSession(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await liveSessionService.get(consultationId(req)));
  },

  async start(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await liveSessionService.start(consultationId(req), getAuthenticatedDoctor(req)),
    );
  },

  async pause(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await liveSessionService.pause(consultationId(req), getAuthenticatedDoctor(req)),
    );
  },

  async resume(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await liveSessionService.resume(consultationId(req), getAuthenticatedDoctor(req)),
    );
  },

  async stop(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await liveSessionService.stop(consultationId(req), getAuthenticatedDoctor(req)),
    );
  },

  /** Cursor-based catch-up. Backs the polling transport and stream reconnects. */
  async getUpdates(req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      await liveSessionService.getUpdates(consultationId(req), {
        transcript: cursor(req, "transcript"),
        events: cursor(req, "events"),
      }),
    );
  },

  /**
   * Server-sent events carrying every live update for one consultation.
   *
   * The transport is an implementation detail: the same updates are available
   * from `getUpdates`, so a client that cannot hold a stream open loses
   * nothing. Buffering is disabled explicitly because a proxy that batches
   * would defeat the point.
   */
  async stream(req: Request, res: Response): Promise<void> {
    const id = consultationId(req);
    // Verifies the consultation exists (and 404s cleanly) before streaming.
    await liveSessionService.get(id);

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");

    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // An immediate snapshot means a subscriber never waits for the next change
    // to learn where the consultation currently stands.
    send("snapshot", await liveSessionService.getUpdates(id, {}));

    const unsubscribe = liveSessionService.subscribe(id, (update) => {
      send(update.type, update);
    });

    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, liveSessionService.heartbeatMs);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  },
};
