/**
 * A decision the doctor made about something the platform surfaced.
 *
 * This is the boundary that keeps Clinical Intelligence output and doctor
 * judgement in separate domains: platform output is never mutated by a
 * decision, and a decision never becomes a clinical outcome on its own. The
 * doctor's actual outcomes — assessment, investigations, prescription,
 * treatment, follow-up — live on the consultation itself.
 */

export type DecisionSubject =
  | "CLINICAL_CONSIDERATION"
  | "INVESTIGATION_RECOMMENDATION"
  | "CLINICAL_SAFETY_ALERT"
  | "SUGGESTED_QUESTION";

/**
 * Deliberately none of these confirm a diagnosis or order anything.
 * `ACTIONED` records that the doctor carried the item into their own record;
 * the record entry itself is created separately and explicitly.
 */
export type DecisionOutcome =
  | "ACCEPTED_FOR_CONSIDERATION"
  | "REJECTED"
  | "ACKNOWLEDGED"
  | "DEFERRED"
  | "ACTIONED";

export interface DoctorDecision {
  id: string;
  consultationId: string;
  subject: DecisionSubject;
  /** Identifier of the platform output this decision concerns. */
  subjectId: string;
  /** Human label captured at decision time, so the record stays readable. */
  subjectLabel: string;
  outcome: DecisionOutcome;
  note: string | null;
  decidedBy: "DOCTOR";
  doctorId: string;
  doctorName: string;
  decidedAt: string;
}

export interface DoctorDecisionInput {
  subject: DecisionSubject;
  subjectId: string;
  subjectLabel: string;
  outcome: DecisionOutcome;
  note?: string | null;
}
