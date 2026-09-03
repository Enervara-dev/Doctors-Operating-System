import type { TranscriptSnapshot } from "../domain/types";
import { transcriptRepository } from "../repositories/transcript.repository";

export const transcriptService = {
  /** `since` returns only what is newer, so a client can page forward cheaply. */
  async getSnapshot(consultationId: string, since = 0): Promise<TranscriptSnapshot> {
    const utterances = await transcriptRepository.list(consultationId, since);
    const all = since === 0 ? utterances : await transcriptRepository.list(consultationId);
    const cursor = all.reduce((max, entry) => Math.max(max, entry.sequence), 0);
    const latest = all[all.length - 1];

    return {
      consultationId,
      utterances,
      cursor,
      finalCount: await transcriptRepository.countFinal(consultationId),
      updatedAt: latest?.finalizedAt ?? latest?.startedAt ?? null,
    };
  },
};
