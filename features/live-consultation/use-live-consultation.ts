"use client";

import { useCallback, useEffect, useRef } from "react";
import { createResilientTransport, type LiveTransport } from "./transport";
import { useClinicalContextStore } from "@/stores/clinical-context.store";
import { useClinicalIntelligenceStore } from "@/stores/clinical-intelligence.store";
import { useConsultationEventStore } from "@/stores/consultation-event.store";
import { useDoctorDecisionStore } from "@/stores/doctor-decision.store";
import { useLiveSessionStore } from "@/stores/live-session.store";
import { useTranscriptStore } from "@/stores/transcript.store";

/**
 * Subscribes the workspace to one consultation and fans every update out to the
 * domain store that owns it.
 *
 * This is the only place that knows a transport exists. Components read from
 * stores; the stores never know whether their data arrived over a stream, a
 * poll or an initial fetch.
 */
export function useLiveConsultation(consultationId: string | null): void {
  const applyTranscript = useTranscriptStore((state) => state.applySnapshot);
  const applyContext = useClinicalContextStore((state) => state.apply);
  const applyIntelligence = useClinicalIntelligenceStore((state) => state.apply);
  const applyEvents = useConsultationEventStore((state) => state.applyPage);
  const applySession = useLiveSessionStore((state) => state.apply);
  const setConnection = useLiveSessionStore((state) => state.setConnection);
  const setTransport = useLiveSessionStore((state) => state.setTransport);
  const loadDecisions = useDoctorDecisionStore((state) => state.load);

  const transportRef = useRef<LiveTransport | null>(null);
  if (transportRef.current === null) transportRef.current = createResilientTransport();

  // Cursors are read at subscribe time rather than captured, so a reconnect
  // resumes from what the client actually holds.
  const getCursors = useCallback(
    () => ({
      transcript: useTranscriptStore.getState().cursor,
      events: useConsultationEventStore.getState().cursor,
    }),
    [],
  );

  useEffect(() => {
    if (!consultationId) return;

    void loadDecisions(consultationId);

    const dispose = transportRef.current?.connect(consultationId, {
      getCursors,
      onConnectionChange: setConnection,
      onTransportChange: setTransport,
      onSnapshot: (page) => {
        applySession(page.session);
        applyTranscript(page.transcript);
        if (page.clinicalContext) applyContext(page.clinicalContext);
        applyIntelligence(page.clinicalIntelligence);
        applyEvents(page.events);
      },
      onUpdate: (update) => {
        switch (update.type) {
          case "session":
            applySession(update.session);
            break;
          case "transcript":
            applyTranscript(update.snapshot);
            break;
          case "clinical-context":
            applyContext(update.context);
            break;
          case "clinical-intelligence":
            applyIntelligence(update.envelope);
            break;
          case "events":
            applyEvents(update.page);
            break;
        }
      },
    });

    return () => {
      dispose?.();
      setConnection("DISCONNECTED");
    };
  }, [
    consultationId,
    getCursors,
    setConnection,
    setTransport,
    applySession,
    applyTranscript,
    applyContext,
    applyIntelligence,
    applyEvents,
    loadDecisions,
  ]);
}

/** Clears every live-domain store; used when the workspace changes patient. */
export function resetLiveConsultationStores(): void {
  useTranscriptStore.getState().reset();
  useClinicalContextStore.getState().reset();
  useClinicalIntelligenceStore.getState().reset();
  useConsultationEventStore.getState().reset();
  useDoctorDecisionStore.getState().reset();
  useLiveSessionStore.getState().reset();
}
