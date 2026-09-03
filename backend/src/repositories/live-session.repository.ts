import type { LiveSession } from "../domain/types";

/**
 * Live session state, one row per consultation.
 *
 * Session state is process-local by nature — it describes a connection that is
 * happening now. The clinical consequences of a session (transcript, context,
 * intelligence, events) are persisted through their own repositories.
 */
const sessions = new Map<string, LiveSession>();

export const liveSessionRepository = {
  async findByConsultationId(consultationId: string): Promise<LiveSession | null> {
    return sessions.get(consultationId) ?? null;
  },

  async save(session: LiveSession): Promise<LiveSession> {
    sessions.set(session.consultationId, session);
    return session;
  },
};
