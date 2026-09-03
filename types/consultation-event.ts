/**
 * The clinical timeline: an ordered account of what happened during the
 * consultation, spanning the session, the transcript, platform output and the
 * doctor's own actions.
 *
 * Complements the audit trail rather than replacing it. The audit trail records
 * changes to the record; this records the shape of the session itself.
 */

export type ConsultationEventKind =
  | "SESSION"
  | "TRANSCRIPT"
  | "CLINICAL_CONTEXT"
  | "CLINICAL_INTELLIGENCE"
  | "CLINICAL_SAFETY"
  | "DOCTOR_DECISION"
  | "DOCTOR_ENTRY";

export type ConsultationEventActor = "DOCTOR" | "CLINICAL_INTELLIGENCE" | "SYSTEM";

/** Points back at the thing an event concerns, for navigation and audit. */
export interface ConsultationEventReference {
  type:
    | "UTTERANCE"
    | "CLINICAL_FACT"
    | "CLINICAL_CONSIDERATION"
    | "INVESTIGATION_RECOMMENDATION"
    | "CLINICAL_SAFETY_ALERT"
    | "DOCTOR_DECISION";
  id: string;
}

export interface ConsultationEvent {
  id: string;
  consultationId: string;
  /** Monotonic ordering, independent of wall-clock collisions. */
  sequence: number;
  kind: ConsultationEventKind;
  actor: ConsultationEventActor;
  actorName: string | null;
  summary: string;
  detail: string | null;
  occurredAt: string;
  reference: ConsultationEventReference | null;
}

export interface ConsultationEventPage {
  consultationId: string;
  events: ConsultationEvent[];
  cursor: number;
}
