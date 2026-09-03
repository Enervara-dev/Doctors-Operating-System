import type { DoctorDecision } from "../domain/types";

/**
 * Doctor decisions about Clinical Intelligence output.
 *
 * One decision per subject: a later decision on the same item replaces the
 * earlier one, and the change is recorded separately in the audit trail rather
 * than by keeping duplicates here.
 */
const decisions = new Map<string, DoctorDecision[]>();

export const doctorDecisionRepository = {
  async record(decision: DoctorDecision): Promise<DoctorDecision[]> {
    const existing = decisions.get(decision.consultationId) ?? [];
    const next = [
      ...existing.filter(
        (entry) =>
          !(entry.subject === decision.subject && entry.subjectId === decision.subjectId),
      ),
      decision,
    ];
    decisions.set(decision.consultationId, next);
    return next;
  },

  async list(consultationId: string): Promise<DoctorDecision[]> {
    return [...(decisions.get(consultationId) ?? [])];
  },

  async findForSubject(
    consultationId: string,
    subjectId: string,
  ): Promise<DoctorDecision | null> {
    return (
      (decisions.get(consultationId) ?? []).find((entry) => entry.subjectId === subjectId) ??
      null
    );
  },
};
