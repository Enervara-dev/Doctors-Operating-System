function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  /**
   * `API_PORT` wins over `PORT` so a single-container deployment can hand
   * `PORT` to the web process without this service racing it for the socket.
   */
  port: readNumber("API_PORT", readNumber("PORT", 4000)),
  /**
   * Interface to bind. A single-container deployment sets `127.0.0.1`, which
   * keeps Express off every public interface: the platform's proxy cannot see
   * or route to a loopback listener, and the Next.js rewrite reaches it over
   * loopback anyway. Standalone deployments leave this unset and get `0.0.0.0`.
   */
  apiHost: process.env.API_HOST ?? "0.0.0.0",
  /** Comma-separated list, or `*` to allow any origin during local development. */
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  nodeEnv: process.env.NODE_ENV ?? "development",

  /**
   * Base URL of the Clinical Intelligence Platform. When unset the Doctor
   * backend falls back to the deterministic mock adapter and reports the
   * session as fixture-backed — never as real platform output.
   */
  clinicalIntelligenceUrl: process.env.CLINICAL_INTELLIGENCE_URL ?? "",

  /**
   * Speeds up or slows down the mock adapter's scripted timeline. 1 is real
   * time; tests use a small value to run a whole consultation in seconds.
   */
  liveTickScale: Math.max(0.01, readNumber("LIVE_TICK_SCALE", 1)),

  /** Heartbeat interval for the live event stream, in milliseconds. */
  streamHeartbeatMs: readNumber("STREAM_HEARTBEAT_MS", 15000),

  /**
   * Base URL of the patient platform's API — the system of record for
   * patients, appointments, health profiles, labs, prescriptions and
   * consultations. This service holds no clinical database of its own and
   * reads everything through that API, forwarding the clinician's own token.
   */
  patientApiUrl: (process.env.PATIENT_API_URL ?? "http://localhost:5000").replace(/\/+$/, ""),

  /**
   * Upstream timeout. Below the browser's patience and well below any proxy
   * idle timeout, so a stalled dependency surfaces as a clear message on the
   * screen rather than a spinner that never resolves.
   */
  patientApiTimeoutMs: readNumber("PATIENT_API_TIMEOUT_MS", 10000),
} as const;
