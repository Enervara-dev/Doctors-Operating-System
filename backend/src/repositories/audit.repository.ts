import type { AuditEvent } from "../domain/types";
import { db } from "../mock/db";

/**
 * Append-only audit log. Seeded from JSON and extended in memory for the life
 * of the process. There is deliberately no update or delete: the SQL-backed
 * implementation replaces this file and keeps the same three methods.
 */
const events: AuditEvent[] = [...db.auditEventSeed];

export const auditRepository = {
  async append(event: AuditEvent): Promise<AuditEvent> {
    events.push(event);
    return event;
  },

  /** Newest first — the order the history is read in. */
  async findByConsultationId(consultationId: string): Promise<AuditEvent[]> {
    return events
      .filter((event) => event.consultationId === consultationId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async existsForAction(consultationId: string, action: AuditEvent["action"]): Promise<boolean> {
    return events.some(
      (event) => event.consultationId === consultationId && event.action === action,
    );
  },
};
