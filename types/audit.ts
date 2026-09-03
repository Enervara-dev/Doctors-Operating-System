/**
 * Append-only activity trail.
 *
 * Events are written by the service layer at the moment a change is applied, so
 * the trail reflects what actually happened rather than what a client claimed.
 * Nothing in the system updates or deletes an event.
 */

export type AuditEntityType =
  | "CONSULTATION"
  | "CONSULTATION_RECORD"
  | "DIAGNOSIS"
  | "INVESTIGATION"
  | "MEDICATION"
  | "FOLLOW_UP"
  | "DOCTOR_DECISION";

export type AuditActorType = "DOCTOR" | "SYSTEM" | "CLINICAL_INTELLIGENCE";

export type AuditAction =
  | "CONSULTATION_CREATED"
  | "CONSULTATION_STARTED"
  | "CONSULTATION_UPDATED"
  | "CONSULTATION_NOTES_UPDATED"
  | "DOCTOR_DECISION_RECORDED"
  | "DIAGNOSIS_SELECTED"
  | "INVESTIGATION_ADDED"
  | "INVESTIGATION_UPDATED"
  | "INVESTIGATION_REMOVED"
  | "MEDICATION_ADDED"
  | "MEDICATION_UPDATED"
  | "MEDICATION_REMOVED"
  | "TREATMENT_UPDATED"
  | "FOLLOW_UP_CREATED"
  | "CONSULTATION_READY_FOR_REVIEW"
  | "LIVE_SESSION_STARTED"
  | "LIVE_SESSION_ENDED"
  | "CONSULTATION_FINALIZED"
  | "RECORD_CREATED";

export interface AuditEvent {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  /** Every event belongs to a consultation, so the trail can be read per visit. */
  consultationId: string;
  action: AuditAction;

  actorType: AuditActorType;
  actorId: string | null;
  actorName: string | null;

  timestamp: string;

  /**
   * Plain-language line rendered in the history. Composed where the change is
   * made, so no presentation code has to interpret the payloads below.
   */
  summary: string;

  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}
