import type { DoctorDecision } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { consultationRepository } from "./consultation.repository";

/**
 * Doctor decisions about Clinical Intelligence output.
 *
 * Durable, and part of the consultation's clinical record — they are rows in
 * `consultation_doctor_decisions`, written through the same aggregate save as
 * every other post-brief field. What the doctor did with an alert is as much
 * of the record as what they prescribed because of it.
 *
 * One decision per subject: a later decision on the same item replaces the
 * earlier one here, and the change it replaced is recorded separately in the
 * audit trail rather than by keeping duplicates.
 */
export const doctorDecisionRepository = {
  async record(decision: DoctorDecision): Promise<DoctorDecision[]> {
    const consultation = await consultationRepository.findById(decision.consultationId);
    if (!consultation) {
      throw ApiError.notFound("CONSULTATION_NOT_FOUND", "This consultation could not be found.");
    }

    const next = [
      ...consultation.doctorDecisions.filter(
        (entry) =>
          !(entry.subject === decision.subject && entry.subjectId === decision.subjectId),
      ),
      decision,
    ];

    const saved = await consultationRepository.save({ ...consultation, doctorDecisions: next });
    return saved.doctorDecisions;
  },

  async list(consultationId: string): Promise<DoctorDecision[]> {
    const consultation = await consultationRepository.findById(consultationId);
    return consultation ? consultation.doctorDecisions : [];
  },

  async findForSubject(
    consultationId: string,
    subjectId: string,
  ): Promise<DoctorDecision | null> {
    const decisions = await this.list(consultationId);
    return decisions.find((entry) => entry.subjectId === subjectId) ?? null;
  },
};
