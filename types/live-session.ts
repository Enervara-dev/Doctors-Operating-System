import type { ClinicalIntelligenceStatus } from "./clinical-intelligence";
import type { ContentProvenance } from "./transcript";

/**
 * The live consultation session: the doctor-facing view of whether the
 * platform is listening, and how far it has got.
 *
 * Distinct from `ConsultationStatus`, which is the clinical lifecycle of the
 * record. A session can disconnect without the consultation changing state.
 */

export type LiveSessionState = "IDLE" | "LIVE" | "PAUSED" | "ENDED";

/** Transport health, reported separately from clinical availability. */
export type LiveConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "UNAVAILABLE";

/** Which transport is carrying updates; surfaced for diagnostics only. */
export type LiveTransportKind = "STREAM" | "POLL" | "NONE";

export interface LiveSession {
  consultationId: string;
  state: LiveSessionState;
  startedAt: string | null;
  pausedAt: string | null;
  endedAt: string | null;
  /** Wall-clock seconds the session has been live, excluding paused time. */
  elapsedSeconds: number;
  transcriptCursor: number;
  eventCursor: number;
  clinicalContextVersion: number;
  intelligenceVersion: number | null;
  intelligenceStatus: ClinicalIntelligenceStatus;
  /**
   * `FIXTURE` when the session is driven by the deterministic mock adapter
   * rather than a connected platform. Surfaced prominently in the UI.
   */
  provenance: ContentProvenance;
  /** Names the adapter serving this session, e.g. "mock" or a provider name. */
  adapter: string;
}

/**
 * One multiplexed update from the live transport. Each carries the domain
 * payload that changed, so a consumer subscribes once and fans out internally.
 */
export type LiveUpdate =
  | { type: "session"; session: LiveSession }
  | { type: "transcript"; snapshot: import("./transcript").TranscriptSnapshot }
  | { type: "clinical-context"; context: import("./clinical-context").ClinicalContext }
  | {
      type: "clinical-intelligence";
      envelope: import("./clinical-intelligence").ClinicalIntelligenceEnvelope;
    }
  | { type: "events"; page: import("./consultation-event").ConsultationEventPage };

/** Cursor-based catch-up, used by the polling transport and on reconnect. */
export interface LiveUpdatesPage {
  session: LiveSession;
  transcript: import("./transcript").TranscriptSnapshot;
  clinicalContext: import("./clinical-context").ClinicalContext | null;
  clinicalIntelligence: import("./clinical-intelligence").ClinicalIntelligenceEnvelope;
  events: import("./consultation-event").ConsultationEventPage;
}
