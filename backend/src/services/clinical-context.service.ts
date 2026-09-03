import type { ClinicalContext } from "../domain/types";
import { clinicalContextRepository } from "../repositories/clinical-context.repository";
import { liveSessionRepository } from "../repositories/live-session.repository";

export const clinicalContextService = {
  /**
   * The clinical picture extracted from this consultation so far. Distinct
   * from the patient's pre-visit context, and from the doctor's own record.
   */
  async get(consultationId: string): Promise<ClinicalContext> {
    const facts = await clinicalContextRepository.list(consultationId);
    const session = await liveSessionRepository.findByConsultationId(consultationId);
    const latest = facts[facts.length - 1];

    return {
      consultationId,
      facts,
      version: session?.clinicalContextVersion ?? 0,
      updatedAt: latest?.recordedAt ?? null,
    };
  },
};
