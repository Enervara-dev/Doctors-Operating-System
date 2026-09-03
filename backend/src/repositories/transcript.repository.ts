import type { TranscriptUtterance } from "../domain/types";

/**
 * Speaker-labelled transcript, keyed by consultation and then by utterance id.
 *
 * Keying by id is what makes a partial utterance settle in place rather than
 * appending a duplicate when its final version arrives.
 */
const transcripts = new Map<string, Map<string, TranscriptUtterance>>();

function bucket(consultationId: string): Map<string, TranscriptUtterance> {
  const existing = transcripts.get(consultationId);
  if (existing) return existing;
  const created = new Map<string, TranscriptUtterance>();
  transcripts.set(consultationId, created);
  return created;
}

export const transcriptRepository = {
  /** Inserts a new utterance or replaces the partial with the same id. */
  async upsert(
    consultationId: string,
    utterance: TranscriptUtterance,
  ): Promise<TranscriptUtterance> {
    bucket(consultationId).set(utterance.id, utterance);
    return utterance;
  },

  /** Ordered by sequence, optionally only what is newer than `since`. */
  async list(consultationId: string, since = 0): Promise<TranscriptUtterance[]> {
    return [...bucket(consultationId).values()]
      .filter((utterance) => utterance.sequence > since)
      .sort((a, b) => a.sequence - b.sequence);
  },

  async countFinal(consultationId: string): Promise<number> {
    return [...bucket(consultationId).values()].filter(
      (utterance) => utterance.status === "FINAL",
    ).length;
  },
};
