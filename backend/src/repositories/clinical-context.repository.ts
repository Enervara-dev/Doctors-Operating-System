import type { ClinicalFact } from "../domain/types";

/** Clinical facts extracted from the consultation, in extraction order. */
const contexts = new Map<string, ClinicalFact[]>();

export const clinicalContextRepository = {
  async append(consultationId: string, facts: ClinicalFact[]): Promise<ClinicalFact[]> {
    const existing = contexts.get(consultationId) ?? [];
    const next = [...existing, ...facts];
    contexts.set(consultationId, next);
    return next;
  },

  async list(consultationId: string): Promise<ClinicalFact[]> {
    return [...(contexts.get(consultationId) ?? [])];
  },
};
