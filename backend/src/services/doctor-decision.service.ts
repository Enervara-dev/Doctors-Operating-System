import type { Doctor, DoctorDecision, DoctorDecisionInput } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { createId } from "../lib/id";
import { doctorDecisionRepository } from "../repositories/doctor-decision.repository";
import { recordEvent } from "../live/session-engine";
import { auditService } from "./audit.service";

const SUBJECTS = new Set<DoctorDecision["subject"]>([
  "CLINICAL_CONSIDERATION",
  "INVESTIGATION_RECOMMENDATION",
  "CLINICAL_SAFETY_ALERT",
  "SUGGESTED_QUESTION",
]);

const OUTCOMES = new Set<DoctorDecision["outcome"]>([
  "ACCEPTED_FOR_CONSIDERATION",
  "REJECTED",
  "ACKNOWLEDGED",
  "DEFERRED",
  "ACTIONED",
]);

const OUTCOME_WORDING: Record<DoctorDecision["outcome"], string> = {
  ACCEPTED_FOR_CONSIDERATION: "accepted for consideration",
  REJECTED: "rejected",
  ACKNOWLEDGED: "acknowledged",
  DEFERRED: "deferred",
  ACTIONED: "carried into the record",
};

function text(value: unknown, field: string, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw ApiError.validation("Please correct the highlighted fields.", { [field]: message });
  }
  return value.trim();
}

/**
 * Records what the doctor decided about Clinical Intelligence output.
 *
 * A decision is deliberately inert: it never creates an assessment, orders an
 * investigation or writes a prescription. Those remain separate, explicit
 * actions on the consultation itself.
 */
export const doctorDecisionService = {
  async record(
    consultationId: string,
    body: Partial<DoctorDecisionInput>,
    doctor: Doctor,
  ): Promise<DoctorDecision[]> {
    const subject = body.subject as DoctorDecision["subject"];
    const outcome = body.outcome as DoctorDecision["outcome"];

    if (!SUBJECTS.has(subject)) {
      throw ApiError.validation("Unknown decision subject.", {
        subject: "Unknown decision subject.",
      });
    }
    if (!OUTCOMES.has(outcome)) {
      throw ApiError.validation("Unknown decision outcome.", {
        outcome: "Unknown decision outcome.",
      });
    }

    const decision: DoctorDecision = {
      id: createId("dec"),
      consultationId,
      subject,
      subjectId: text(body.subjectId, "subjectId", "A subject is required."),
      subjectLabel: text(body.subjectLabel, "subjectLabel", "A subject label is required."),
      outcome,
      note:
        typeof body.note === "string" && body.note.trim().length > 0 ? body.note.trim() : null,
      decidedBy: "DOCTOR",
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      decidedAt: new Date().toISOString(),
    };

    const previous = await doctorDecisionRepository.findForSubject(
      consultationId,
      decision.subjectId,
    );
    const decisions = await doctorDecisionRepository.record(decision);

    const summary = `"${decision.subjectLabel}" ${OUTCOME_WORDING[decision.outcome]}`;

    await recordEvent({
      consultationId,
      kind: "DOCTOR_DECISION",
      actor: "DOCTOR",
      actorName: doctor.fullName,
      summary,
      detail: decision.note,
      reference: { type: "DOCTOR_DECISION", id: decision.id },
    });

    // The clinical timeline shows the session as it unfolded; the audit trail
    // records the change to the record. A decision belongs in both.
    await auditService.record({
      consultationId,
      entityType: "DOCTOR_DECISION",
      entityId: decision.id,
      action: "DOCTOR_DECISION_RECORDED",
      summary,
      doctor,
      previousValue: previous ?? undefined,
      newValue: decision,
    });

    return decisions;
  },

  async list(consultationId: string): Promise<DoctorDecision[]> {
    return doctorDecisionRepository.list(consultationId);
  },
};
