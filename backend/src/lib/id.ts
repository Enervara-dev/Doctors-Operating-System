import { randomUUID } from "node:crypto";

/** Prefixed identifiers keep mock records readable in logs and fixtures. */
export function createId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}
