/**
 * Speaker-labelled consultation transcript.
 *
 * The Doctor application never touches audio, speech-to-text or diarization.
 * It consumes utterances the Clinical Intelligence Platform has already
 * transcribed and attributed, normalised by the Doctor backend into this shape.
 * Changing provider must not change anything above this contract.
 */

/** Resolved role. Raw diarization identifiers never reach the frontend. */
export type SpeakerRole = "DOCTOR" | "PATIENT" | "ATTENDER" | "UNKNOWN";

/**
 * `PARTIAL` utterances are still being spoken and may be replaced in place;
 * `FINAL` utterances are settled. Both share an id so an update replaces
 * rather than appends.
 */
export type UtteranceStatus = "PARTIAL" | "FINAL";

/** Distinguishes a synthetic session from real platform output. */
export type ContentProvenance = "FIXTURE" | "SERVICE";

export interface TranscriptUtterance {
  id: string;
  /** Monotonic ordering; the client sorts by this, never by arrival time. */
  sequence: number;
  speaker: SpeakerRole;
  /** Display label the backend resolved, e.g. "Doctor" or "Attender (son)". */
  speakerLabel: string;
  text: string;
  startedAt: string;
  /** Null while the utterance is still partial. */
  finalizedAt: string | null;
  status: UtteranceStatus;
  /** 0–1 where the platform reports it. */
  confidence: number | null;
  provenance: ContentProvenance;
}

export interface TranscriptSnapshot {
  consultationId: string;
  utterances: TranscriptUtterance[];
  /** Highest sequence included; pass back as `since` to fetch only what is new. */
  cursor: number;
  /** Total settled utterances, so a client can show progress without the list. */
  finalCount: number;
  updatedAt: string | null;
}
