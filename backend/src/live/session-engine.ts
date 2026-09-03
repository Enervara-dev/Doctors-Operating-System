import type {
  ClinicalIntelligenceStatus,
  ConsultationEvent,
  ConsultationEventKind,
  ConsultationEventReference,
  Doctor,
  LiveSession,
  LiveUpdate,
} from "../domain/types";
import { env } from "../config/env";
import { createId } from "../lib/id";
import { clinicalContextRepository } from "../repositories/clinical-context.repository";
import { clinicalIntelligenceRepository } from "../repositories/clinical-intelligence.repository";
import { consultationEventRepository } from "../repositories/consultation-event.repository";
import { liveSessionRepository } from "../repositories/live-session.repository";
import { transcriptRepository } from "../repositories/transcript.repository";
import { createMockProvider } from "./mock-adapter";
import type { ClinicalIntelligenceProvider, PlatformEmission, ProviderSession } from "./provider";

/**
 * Owns live consultation sessions.
 *
 * The engine is the only place that knows a provider exists. It receives
 * platform emissions, persists them through the domain repositories, records
 * the clinical timeline, and fans updates out to subscribers. Everything above
 * it — services, controllers, the frontend — works from stored domain state,
 * so a dropped connection never loses clinical content.
 */

/**
 * Resolves the provider. A real platform is selected when configured;
 * otherwise the deterministic mock adapter runs and the session is reported as
 * fixture-backed. There is no third state in which the app pretends.
 */
function resolveProvider(): ClinicalIntelligenceProvider {
  // A real adapter is registered here once the platform contract is available.
  // Until then the mock is the only implementation, and it says so.
  return createMockProvider();
}

const provider = resolveProvider();

type Listener = (update: LiveUpdate) => void;

interface ActiveSession {
  providerSession: ProviderSession;
  listeners: Set<Listener>;
}

const active = new Map<string, ActiveSession>();
/** Listeners can attach before a session starts, so they live independently. */
const listenersByConsultation = new Map<string, Set<Listener>>();

function listenersFor(consultationId: string): Set<Listener> {
  const existing = listenersByConsultation.get(consultationId);
  if (existing) return existing;
  const created = new Set<Listener>();
  listenersByConsultation.set(consultationId, created);
  return created;
}

function publish(consultationId: string, update: LiveUpdate): void {
  for (const listener of listenersFor(consultationId)) {
    try {
      listener(update);
    } catch (error) {
      console.error("[live] listener failed", error);
    }
  }
}

function emptySession(consultationId: string): LiveSession {
  return {
    consultationId,
    state: "IDLE",
    startedAt: null,
    pausedAt: null,
    endedAt: null,
    elapsedSeconds: 0,
    transcriptCursor: 0,
    eventCursor: 0,
    clinicalContextVersion: 0,
    intelligenceVersion: null,
    intelligenceStatus: provider.isConfigured ? "CONNECTING" : "UNAVAILABLE",
    provenance: provider.provenance,
    adapter: provider.name,
  };
}

async function loadSession(consultationId: string): Promise<LiveSession> {
  return (
    (await liveSessionRepository.findByConsultationId(consultationId)) ??
    emptySession(consultationId)
  );
}

async function saveSession(session: LiveSession): Promise<LiveSession> {
  const saved = await liveSessionRepository.save(session);
  publish(saved.consultationId, { type: "session", session: saved });
  return saved;
}

/* -------------------------------------------------------------------------- */
/* Clinical timeline                                                           */
/* -------------------------------------------------------------------------- */

export async function recordEvent(input: {
  consultationId: string;
  kind: ConsultationEventKind;
  actor: ConsultationEvent["actor"];
  actorName?: string | null;
  summary: string;
  detail?: string | null;
  reference?: ConsultationEventReference | null;
}): Promise<ConsultationEvent> {
  const event: ConsultationEvent = {
    id: createId("evt"),
    consultationId: input.consultationId,
    sequence: await consultationEventRepository.nextSequence(input.consultationId),
    kind: input.kind,
    actor: input.actor,
    actorName: input.actorName ?? null,
    summary: input.summary,
    detail: input.detail ?? null,
    occurredAt: new Date().toISOString(),
    reference: input.reference ?? null,
  };

  await consultationEventRepository.append(event);
  publish(input.consultationId, {
    type: "events",
    page: { consultationId: input.consultationId, events: [event], cursor: event.sequence },
  });
  return event;
}

/* -------------------------------------------------------------------------- */
/* Emission handling                                                           */
/* -------------------------------------------------------------------------- */

async function handleEmission(
  consultationId: string,
  emission: PlatformEmission,
): Promise<void> {
  const session = await loadSession(consultationId);
  if (session.state !== "LIVE") return;

  if (emission.kind === "utterance") {
    const utterance = emission.utterance;
    await transcriptRepository.upsert(consultationId, utterance);

    const utterances = await transcriptRepository.list(consultationId);
    const cursor = utterances.reduce((max, entry) => Math.max(max, entry.sequence), 0);
    const finalCount = await transcriptRepository.countFinal(consultationId);

    publish(consultationId, {
      type: "transcript",
      snapshot: {
        consultationId,
        utterances: [utterance],
        cursor,
        finalCount,
        updatedAt: new Date().toISOString(),
      },
    });

    // Only settled speech is worth a timeline entry; partials churn.
    if (utterance.status === "FINAL") {
      await recordEvent({
        consultationId,
        kind: "TRANSCRIPT",
        actor: "SYSTEM",
        actorName: utterance.speakerLabel,
        summary: `${utterance.speakerLabel}: ${utterance.text}`,
        reference: { type: "UTTERANCE", id: utterance.id },
      });
      await saveSession({ ...session, transcriptCursor: cursor });
    }
    return;
  }

  if (emission.kind === "clinical-facts") {
    const facts = await clinicalContextRepository.append(consultationId, emission.facts);
    const version = session.clinicalContextVersion + 1;

    publish(consultationId, {
      type: "clinical-context",
      context: { consultationId, facts, version, updatedAt: new Date().toISOString() },
    });
    await recordEvent({
      consultationId,
      kind: "CLINICAL_CONTEXT",
      actor: "CLINICAL_INTELLIGENCE",
      summary:
        emission.facts.length === 1
          ? `Clinical fact extracted: ${emission.facts[0]?.label ?? ""}`
          : `${emission.facts.length} clinical facts extracted`,
      detail: emission.facts.map((fact) => fact.label).join(", "),
    });
    await saveSession({ ...session, clinicalContextVersion: version });
    return;
  }

  const intelligence = emission.intelligence;
  await clinicalIntelligenceRepository.publish(consultationId, intelligence);

  publish(consultationId, {
    type: "clinical-intelligence",
    envelope: {
      status: "AVAILABLE",
      intelligence,
      message: null,
      staleSince: null,
    },
  });

  await recordEvent({
    consultationId,
    kind: "CLINICAL_INTELLIGENCE",
    actor: "CLINICAL_INTELLIGENCE",
    summary: `Clinical Intelligence updated (version ${intelligence.version})`,
    detail: [
      intelligence.clinicalConsiderations?.length
        ? `${intelligence.clinicalConsiderations.length} considerations`
        : null,
      intelligence.investigationRecommendations?.length
        ? `${intelligence.investigationRecommendations.length} investigation recommendations`
        : null,
      intelligence.safetyAlerts?.length
        ? `${intelligence.safetyAlerts.length} safety alerts`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  });

  // Safety output gets its own timeline entry so it is never buried in a
  // general "intelligence updated" line.
  for (const alert of intelligence.safetyAlerts ?? []) {
    await recordEvent({
      consultationId,
      kind: "CLINICAL_SAFETY",
      actor: "CLINICAL_INTELLIGENCE",
      summary: `Clinical safety: ${alert.label}`,
      detail: alert.finding ?? null,
      reference: { type: "CLINICAL_SAFETY_ALERT", id: alert.id },
    });
  }

  await saveSession({
    ...session,
    intelligenceVersion: intelligence.version,
    intelligenceStatus: "AVAILABLE",
  });
}

/* -------------------------------------------------------------------------- */
/* Session control                                                             */
/* -------------------------------------------------------------------------- */

export const sessionEngine = {
  provider,

  async get(consultationId: string): Promise<LiveSession> {
    const session = await loadSession(consultationId);
    if (session.state !== "LIVE" || !session.startedAt) return session;

    // Elapsed time is derived on read rather than ticked, so it stays correct
    // regardless of how long the process has been running.
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(session.startedAt).getTime()) / 1000,
    );
    return { ...session, elapsedSeconds };
  },

  async start(consultationId: string, doctor: Doctor): Promise<LiveSession> {
    const current = await loadSession(consultationId);
    if (current.state === "LIVE") return this.get(consultationId);

    const resuming = current.state === "PAUSED";
    const existing = active.get(consultationId);

    if (resuming && existing) {
      existing.providerSession.resume();
    } else {
      existing?.providerSession.close();
      const providerSession = provider.open({
        consultationId,
        onEmit: (emission) => {
          void handleEmission(consultationId, emission).catch((error) =>
            console.error("[live] failed to handle emission", error),
          );
        },
      });
      active.set(consultationId, { providerSession, listeners: listenersFor(consultationId) });
    }

    await saveSession({
      ...current,
      state: "LIVE",
      startedAt: current.startedAt ?? new Date().toISOString(),
      pausedAt: null,
      endedAt: null,
      intelligenceStatus:
        current.intelligenceVersion === null ? "WAITING" : current.intelligenceStatus,
    });

    await recordEvent({
      consultationId,
      kind: "SESSION",
      actor: "DOCTOR",
      actorName: doctor.fullName,
      summary: resuming ? "Consultation resumed" : "Live consultation started",
      detail: `Adapter: ${provider.name}${provider.isConfigured ? "" : " (fixture)"}`,
    });

    return this.get(consultationId);
  },

  async pause(consultationId: string, doctor: Doctor): Promise<LiveSession> {
    const current = await loadSession(consultationId);
    if (current.state !== "LIVE") return current;

    active.get(consultationId)?.providerSession.pause();
    const session = await saveSession({
      ...current,
      state: "PAUSED",
      pausedAt: new Date().toISOString(),
    });

    await recordEvent({
      consultationId,
      kind: "SESSION",
      actor: "DOCTOR",
      actorName: doctor.fullName,
      summary: "Consultation paused",
    });
    return session;
  },

  async stop(consultationId: string, doctor: Doctor): Promise<LiveSession> {
    const current = await loadSession(consultationId);
    if (current.state === "ENDED") return current;

    active.get(consultationId)?.providerSession.close();
    active.delete(consultationId);

    const session = await saveSession({
      ...current,
      state: "ENDED",
      endedAt: new Date().toISOString(),
    });

    await recordEvent({
      consultationId,
      kind: "SESSION",
      actor: "DOCTOR",
      actorName: doctor.fullName,
      summary: "Live consultation ended",
    });
    return session;
  },

  /** Reports the current clinical availability without opening a session. */
  async intelligenceStatus(consultationId: string): Promise<ClinicalIntelligenceStatus> {
    const latest = await clinicalIntelligenceRepository.findLatest(consultationId);
    if (latest) return "AVAILABLE";

    const session = await loadSession(consultationId);
    if (session.state === "LIVE") return "WAITING";
    return provider.isConfigured ? "CONNECTING" : "UNAVAILABLE";
  },

  subscribe(consultationId: string, listener: Listener): () => void {
    const listeners = listenersFor(consultationId);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) listenersByConsultation.delete(consultationId);
    };
  },

  /** Heartbeat interval for stream transports, in milliseconds. */
  heartbeatMs: env.streamHeartbeatMs,
};
