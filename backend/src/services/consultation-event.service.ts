import type { ConsultationEventPage } from "../domain/types";
import { consultationEventRepository } from "../repositories/consultation-event.repository";

export const consultationEventService = {
  /** The clinical timeline for a consultation, oldest first. */
  async list(consultationId: string, since = 0): Promise<ConsultationEventPage> {
    const events = await consultationEventRepository.list(consultationId, since);
    const all = since === 0 ? events : await consultationEventRepository.list(consultationId);
    const cursor = all.reduce((max, event) => Math.max(max, event.sequence), 0);
    return { consultationId, events, cursor };
  },
};
