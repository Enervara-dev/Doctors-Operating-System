import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { requestLogger } from "./middleware/request-logger";
import { apiRoutes } from "./routes";

/**
 * Builds the Express application. Kept separate from `server.ts` so the app can
 * be mounted in tests without binding a port.
 */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",") }));
  app.use(express.json({ limit: "128kb" }));

  if (env.nodeEnv !== "test") {
    app.use(requestLogger);
  }

  app.use("/api", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
