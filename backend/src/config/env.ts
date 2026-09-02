function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  port: readNumber("PORT", 4000),
  /** Comma-separated list, or `*` to allow any origin during local development. */
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  /**
   * Artificial latency on mock reads. Keeps loading states honest in Phase 1;
   * set to 0 for tests.
   */
  mockLatencyMs: readNumber("MOCK_LATENCY_MS", 220),
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
