import { createApp } from "./app";
import { env } from "./config/env";

/**
 * This service is a session-forwarding layer over the patient platform and has
 * no database of its own, so a deployment without `PATIENT_API_URL` is not a
 * degraded deployment — it is a broken one. The default only makes sense on a
 * developer's machine, and left in place in production it produces a container
 * that starts, passes its health check, and then fails every single clinical
 * request with a connection error.
 *
 * Fail at boot instead, where the platform will show it as a failed deploy.
 */
if (env.nodeEnv === "production" && !process.env.PATIENT_API_URL) {
  console.error(
    "[api] PATIENT_API_URL is not set. This service reads every patient, " +
      "appointment and consultation from the patient platform's API; without " +
      "it there is nothing to serve. Set it to that backend's origin (no " +
      "trailing /api) and redeploy.",
  );
  process.exit(1);
}

const app = createApp();

app.listen(env.port, env.apiHost, () => {
  console.log(`[api] Enervara Doctor API listening on http://${env.apiHost}:${env.port}`);
});
