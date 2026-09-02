import { env } from "../config/env";

/** Simulates network/database latency so client loading states are exercised. */
export function simulateLatency(multiplier = 1): Promise<void> {
  const ms = env.mockLatencyMs * multiplier;
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
