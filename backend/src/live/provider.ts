import type {
  ClinicalFact,
  ClinicalIntelligence,
  ContentProvenance,
  TranscriptUtterance,
} from "../domain/types";

/**
 * The integration boundary to the Clinical Intelligence Platform.
 *
 * Everything to do with audio capture, speech-to-text, diarization, clinical
 * extraction and reasoning lives behind this interface, outside the Doctor
 * application. A real provider implements it against the platform's transport;
 * the mock adapter implements it from a deterministic script.
 *
 * Nothing above this file knows the provider's name, protocol or credentials.
 */

/** One piece of output the platform publishes as the consultation progresses. */
export type PlatformEmission =
  | { kind: "utterance"; utterance: TranscriptUtterance }
  | { kind: "clinical-facts"; facts: ClinicalFact[] }
  | { kind: "clinical-intelligence"; intelligence: ClinicalIntelligence };

export interface ProviderSession {
  pause(): void;
  resume(): void;
  close(): void;
}

export interface OpenSessionInput {
  consultationId: string;
  /** Called for every emission. The engine owns persistence and fan-out. */
  onEmit: (emission: PlatformEmission) => void;
}

export interface ClinicalIntelligenceProvider {
  /** Identifies the adapter in diagnostics and in the session payload. */
  readonly name: string;
  /** `FIXTURE` marks synthetic output so the UI can label it as test data. */
  readonly provenance: ContentProvenance;
  /** False when no platform is reachable; the workspace stays fully usable. */
  readonly isConfigured: boolean;
  open(input: OpenSessionInput): ProviderSession;
}
