import type { Doctor, LiveSession, LiveUpdate, LiveUpdatesPage } from "../domain/types";
import { sessionEngine } from "../live/session-engine";
import { clinicalIntelligenceService } from "./clinical-intelligence.service";
import { clinicalContextService } from "./clinical-context.service";
import { consultationEventService } from "./consultation-event.service";
import { consultationService } from "./consultation.service";
import { transcriptService } from "./transcript.service";

/**
 * Live consultation control and catch-up.
 *
 * Session control and the clinical lifecycle move together: starting the
 * session puts the consultation LIVE, pausing it PAUSES it, ending it moves to
 * REVIEW. The backend remains the source of truth for both.
 */
export const liveSessionService = {
  async get(consultationId: string): Promise<LiveSession> {
    await consultationService.getById(consultationId);
    return sessionEngine.get(consultationId);
  },

  async start(consultationId: string, doctor: Doctor): Promise<LiveSession> {
    const consultation = await consultationService.getById(consultationId);
    await consultationService.setStatus(consultation.id, "LIVE", doctor);
    return sessionEngine.start(consultationId, doctor);
  },

  async pause(consultationId: string, doctor: Doctor): Promise<LiveSession> {
    const consultation = await consultationService.getById(consultationId);
    await consultationService.setStatus(consultation.id, "PAUSED", doctor);
    return sessionEngine.pause(consultationId, doctor);
  },

  async resume(consultationId: string, doctor: Doctor): Promise<LiveSession> {
    return this.start(consultationId, doctor);
  },

  async stop(consultationId: string, doctor: Doctor): Promise<LiveSession> {
    const consultation = await consultationService.getById(consultationId);
    await consultationService.setStatus(consultation.id, "REVIEW", doctor);
    return sessionEngine.stop(consultationId, doctor);
  },

  /**
   * Everything a client needs to catch up from a set of cursors. Used by the
   * polling transport and on reconnect, so no update is lost when a stream
   * drops mid-consultation.
   */
  async getUpdates(
    consultationId: string,
    cursors: { transcript?: number; events?: number },
  ): Promise<LiveUpdatesPage> {
    await consultationService.getById(consultationId);

    return {
      session: await sessionEngine.get(consultationId),
      transcript: await transcriptService.getSnapshot(consultationId, cursors.transcript ?? 0),
      clinicalContext: await clinicalContextService.get(consultationId),
      clinicalIntelligence: await clinicalIntelligenceService.getEnvelope(consultationId),
      events: await consultationEventService.list(consultationId, cursors.events ?? 0),
    };
  },

  subscribe(consultationId: string, listener: (update: LiveUpdate) => void): () => void {
    return sessionEngine.subscribe(consultationId, listener);
  },

  heartbeatMs: sessionEngine.heartbeatMs,
};
