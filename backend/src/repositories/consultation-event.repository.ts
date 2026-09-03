import type { ConsultationEvent } from "../domain/types";

/** The clinical timeline. Append-only, like the audit trail. */
const events = new Map<string, ConsultationEvent[]>();

export const consultationEventRepository = {
  async append(event: ConsultationEvent): Promise<ConsultationEvent> {
    const existing = events.get(event.consultationId) ?? [];
    events.set(event.consultationId, [...existing, event]);
    return event;
  },

  /** Oldest first, so the timeline reads as the session unfolded. */
  async list(consultationId: string, since = 0): Promise<ConsultationEvent[]> {
    return (events.get(consultationId) ?? [])
      .filter((event) => event.sequence > since)
      .sort((a, b) => a.sequence - b.sequence);
  },

  async nextSequence(consultationId: string): Promise<number> {
    return (events.get(consultationId) ?? []).length + 1;
  },
};
