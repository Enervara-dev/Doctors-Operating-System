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
  /**
   * Artificial latency on mock reads. Keeps loading states honest in Phase 1;
   * set to 0 for tests.
   */
  mockLatencyMs: readNumber("MOCK_LATENCY_MS", 220),
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
} as const;
