import type { AuditEvent } from "../domain/types";
import { patientApi } from "../lib/patient-api";

/**
 * The consultation record's change history.
 *
 * Durable: rows in `consultation_audit_events`, append-only and immutable by
 * trigger. This used to be a JSON fixture plus an in-memory array, which meant
 * "who changed this record, and from what" survived exactly as long as the
 * process did.
 *
 * Kept separate from the platform's compliance trail on purpose — that one
 * answers who *accessed* a patient; this one answers what changed in a record.
 * Merging them would cost the before/after values that make this trail useful.
 */

interface RemoteAuditEvent {
  id: string;
  consultationId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: "DOCTOR" | "SYSTEM" | "CLINICAL_INTELLIGENCE";
  actorId: string | null;
  actorName: string | null;
  summary: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  timestamp: string | null;
}

function toAuditEvent(remote: RemoteAuditEvent): AuditEvent {
  return {
    id: remote.id,
    consultationId: remote.consultationId,
    entityType: remote.entityType as AuditEvent["entityType"],
    entityId: remote.entityId,
    action: remote.action as AuditEvent["action"],
    actorType: remote.actorType,
    actorId: remote.actorId ?? "",
    actorName: remote.actorName ?? "",
    timestamp: remote.timestamp ?? new Date().toISOString(),
    summary: remote.summary,
    previousValue: remote.previousValue as AuditEvent["previousValue"],
    newValue: remote.newValue as AuditEvent["newValue"],
    metadata: remote.metadata as AuditEvent["metadata"],
  };
}

const path = (consultationId: string) =>
  `/api/doctor/consultations/${encodeURIComponent(consultationId)}/audit`;

export const auditRepository = {
  async append(event: AuditEvent): Promise<AuditEvent> {
    await patientApi.post<{ event: RemoteAuditEvent | null }>(path(event.consultationId), {
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      actorType: event.actorType,
      actorId: event.actorId,
      actorName: event.actorName,
      summary: event.summary,
      previousValue: event.previousValue,
      newValue: event.newValue,
      metadata: event.metadata,
    });
    return event;
  },

  /** Newest first — the order the history is read in. */
  async findByConsultationId(consultationId: string): Promise<AuditEvent[]> {
    const { events } = await patientApi.get<{ events: RemoteAuditEvent[] }>(
      path(consultationId),
    );
    return events.map(toAuditEvent);
  },

  async existsForAction(consultationId: string, action: AuditEvent["action"]): Promise<boolean> {
    const events = await this.findByConsultationId(consultationId);
    return events.some((event) => event.action === action);
  },
};
