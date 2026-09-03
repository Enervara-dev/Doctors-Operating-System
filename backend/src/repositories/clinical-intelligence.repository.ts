import type { ClinicalIntelligence } from "../domain/types";

/**
 * Published Clinical Intelligence, retained per version.
 *
 * Earlier publications are never discarded: the record must be able to show
 * what was on screen when a decision was taken, and a later revision must not
 * silently overwrite the output the doctor actually reviewed.
 */
const publications = new Map<string, ClinicalIntelligence[]>();

export const clinicalIntelligenceRepository = {
  async publish(
    consultationId: string,
    intelligence: ClinicalIntelligence,
  ): Promise<ClinicalIntelligence> {
    const history = publications.get(consultationId) ?? [];
    publications.set(consultationId, [...history, intelligence]);
    return intelligence;
  },

  async findLatest(consultationId: string): Promise<ClinicalIntelligence | null> {
    const history = publications.get(consultationId);
    return history && history.length > 0 ? (history[history.length - 1] ?? null) : null;
  },

  async listVersions(consultationId: string): Promise<ClinicalIntelligence[]> {
    return [...(publications.get(consultationId) ?? [])];
  },
};
