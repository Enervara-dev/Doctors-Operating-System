import type {
  ClinicalFact,
  ClinicalIntelligence,
  TranscriptUtterance,
} from "../domain/types";
import { env } from "../config/env";
import { createId } from "../lib/id";
import type {
  ClinicalIntelligenceProvider,
  OpenSessionInput,
  PlatformEmission,
  ProviderSession,
} from "./provider";
import { FACTS, INTELLIGENCE, SCRIPT_DURATION_MS, UTTERANCES } from "./session-script";

/**
 * Deterministic mock adapter standing in for the Clinical Intelligence Platform.
 *
 * It replays a fixed script on a timer: the same session always produces the
 * same utterances, facts and publications in the same order. Nothing is
 * generated, randomised or inferred, and every emission is marked
 * `provenance: "FIXTURE"` so the workspace can label it as test data.
 *
 * Its only purpose is to let the Doctor application be built and validated
 * against a real transport shape before a platform is connected. Swapping in a
 * real provider means implementing `ClinicalIntelligenceProvider` and nothing
 * else changes.
 */
function scaled(ms: number): number {
  return Math.max(0, Math.round(ms * env.liveTickScale));
}

class MockProviderSession implements ProviderSession {
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly pending: { atMs: number; emit: () => void }[] = [];
  private startedAt = Date.now();
  private consumedMs = 0;
  private paused = false;
  private closed = false;

  constructor(private readonly input: OpenSessionInput) {
    this.pending = this.buildSchedule();
    this.arm();
  }

  /** Flattens the script into one ordered, absolute-time schedule. */
  private buildSchedule(): { atMs: number; emit: () => void }[] {
    const { consultationId, onEmit } = this.input;
    const schedule: { atMs: number; emit: () => void }[] = [];

    UTTERANCES.forEach((scripted, index) => {
      const id = `utterance-${index + 1}`;
      const sequence = index + 1;

      const base: Omit<TranscriptUtterance, "text" | "status" | "finalizedAt"> = {
        id,
        sequence,
        speaker: scripted.speaker,
        speakerLabel: scripted.speakerLabel,
        startedAt: "",
        confidence: scripted.confidence,
        provenance: "FIXTURE",
      };

      schedule.push({
        atMs: scripted.atMs,
        emit: () =>
          onEmit({
            kind: "utterance",
            utterance: {
              ...base,
              startedAt: new Date().toISOString(),
              text: scripted.partialText,
              status: "PARTIAL",
              finalizedAt: null,
            },
          }),
      });

      schedule.push({
        atMs: scripted.atMs + scripted.finalAfterMs,
        emit: () =>
          onEmit({
            kind: "utterance",
            utterance: {
              ...base,
              startedAt: new Date().toISOString(),
              text: scripted.text,
              status: "FINAL",
              finalizedAt: new Date().toISOString(),
            },
          }),
      });
    });

    FACTS.forEach((step) => {
      schedule.push({
        atMs: step.atMs,
        emit: () => {
          const facts: ClinicalFact[] = step.facts.map((fact) => ({
            ...fact,
            id: createId("fact"),
            sourceUtteranceId: `utterance-${step.fromUtterance + 1}`,
            recordedAt: new Date().toISOString(),
            provenance: "FIXTURE",
          }));
          onEmit({ kind: "clinical-facts", facts });
        },
      });
    });

    INTELLIGENCE.forEach((publication, index) => {
      const { atMs, ...payload } = publication;
      schedule.push({
        atMs,
        emit: () => {
          const intelligence: ClinicalIntelligence = {
            ...payload,
            consultationId,
            generatedAt: new Date().toISOString(),
            version: index + 1,
            provenance: "FIXTURE",
          };
          onEmit({ kind: "clinical-intelligence", intelligence });
        },
      });
    });

    return schedule.sort((a, b) => a.atMs - b.atMs);
  }

  /** Schedules everything still ahead of the current playback position. */
  private arm(): void {
    if (this.closed || this.paused) return;
    this.startedAt = Date.now();

    for (const step of this.pending) {
      if (step.atMs < this.consumedMs) continue;
      const delay = scaled(step.atMs - this.consumedMs);
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        if (!this.closed && !this.paused) step.emit();
      }, delay);
      this.timers.add(timer);
    }
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }

  pause(): void {
    if (this.closed || this.paused) return;
    // Remember how far the script has played so resuming does not replay it.
    this.consumedMs += (Date.now() - this.startedAt) / env.liveTickScale;
    this.paused = true;
    this.clearTimers();
  }

  resume(): void {
    if (this.closed || !this.paused) return;
    this.paused = false;
    this.arm();
  }

  close(): void {
    this.closed = true;
    this.clearTimers();
  }
}

export function createMockProvider(): ClinicalIntelligenceProvider {
  return {
    name: "mock",
    provenance: "FIXTURE",
    isConfigured: false,
    open(input: OpenSessionInput): ProviderSession {
      return new MockProviderSession(input);
    },
  };
}

/** Exposed so the engine can decide when a scripted session has finished. */
export const MOCK_SCRIPT_DURATION_MS = SCRIPT_DURATION_MS;

export type { PlatformEmission };
