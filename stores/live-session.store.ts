"use client";

import { create } from "zustand";
import { liveConsultationApi } from "@/features/live-consultation/live-consultation.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { LiveConnectionState, LiveSession, LiveTransportKind } from "@/types";

interface LiveSessionState {
  session: LiveSession | null;
  /** Transport health. Reported separately from clinical availability. */
  connection: LiveConnectionState;
  transport: LiveTransportKind;
  /** True while a control (start/pause/stop) is in flight. */
  isControlling: boolean;
  failure: RequestFailure | null;

  load: (consultationId: string) => Promise<void>;
  apply: (session: LiveSession) => void;
  setConnection: (connection: LiveConnectionState) => void;
  setTransport: (transport: LiveTransportKind) => void;

  start: (consultationId: string) => Promise<boolean>;
  pause: (consultationId: string) => Promise<boolean>;
  resume: (consultationId: string) => Promise<boolean>;
  stop: (consultationId: string) => Promise<boolean>;

  reset: () => void;
}

/**
 * The live session: whether the platform is listening, and how the workspace
 * is connected to it.
 *
 * Deliberately distinct from the consultation's clinical status. A dropped
 * connection changes this store and nothing clinical: the doctor keeps working
 * and no recorded content is lost.
 */
export const useLiveSessionStore = create<LiveSessionState>()((set, get) => {
  async function control(
    consultationId: string,
    action: (id: string) => Promise<LiveSession>,
  ): Promise<boolean> {
    set({ isControlling: true, failure: null });
    try {
      set({ session: await action(consultationId), isControlling: false, failure: null });
      return true;
    } catch (error) {
      set({ isControlling: false, failure: toRequestFailure(error) });
      return false;
    }
  }

  return {
    session: null,
    connection: "DISCONNECTED",
    transport: "NONE",
    isControlling: false,
    failure: null,

    async load(consultationId) {
      try {
        set({ session: await liveConsultationApi.getSession(consultationId), failure: null });
      } catch (error) {
        set({ failure: toRequestFailure(error) });
      }
    },

    apply(session) {
      set({ session });
    },

    setConnection(connection) {
      if (get().connection !== connection) set({ connection });
    },

    setTransport(transport) {
      if (get().transport !== transport) set({ transport });
    },

    start(consultationId) {
      return control(consultationId, liveConsultationApi.start);
    },

    pause(consultationId) {
      return control(consultationId, liveConsultationApi.pause);
    },

    resume(consultationId) {
      return control(consultationId, liveConsultationApi.resume);
    },

    stop(consultationId) {
      return control(consultationId, liveConsultationApi.stop);
    },

    reset() {
      set({
        session: null,
        connection: "DISCONNECTED",
        transport: "NONE",
        isControlling: false,
        failure: null,
      });
    },
  };
});

/** True when the platform driving this session is the deterministic fixture. */
export const selectIsFixtureSession = (state: LiveSessionState): boolean =>
  state.session?.provenance === "FIXTURE";
