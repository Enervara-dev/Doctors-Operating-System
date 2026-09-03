"use client";

import { create } from "zustand";
import { liveConsultationApi } from "@/features/live-consultation/live-consultation.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { ConsultationEvent, ConsultationEventPage } from "@/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface ConsultationEventState {
  events: ConsultationEvent[];
  cursor: number;
  status: LoadStatus;
  failure: RequestFailure | null;

  load: (consultationId: string) => Promise<void>;
  applyPage: (page: ConsultationEventPage) => void;
  reset: () => void;
}

/** The clinical timeline for the consultation currently open. */
export const useConsultationEventStore = create<ConsultationEventState>()((set, get) => ({
  events: [],
  cursor: 0,
  status: "idle",
  failure: null,

  async load(consultationId) {
    set({ status: "loading", failure: null });
    try {
      get().applyPage(await liveConsultationApi.getEvents(consultationId));
      set({ status: "ready", failure: null });
    } catch (error) {
      set({ status: "error", failure: toRequestFailure(error) });
    }
  },

  /** Merges by id, so a reconnect that re-sends events cannot duplicate them. */
  applyPage(page) {
    set((state) => {
      const seen = new Set(state.events.map((event) => event.id));
      const merged = [...state.events, ...page.events.filter((event) => !seen.has(event.id))];
      merged.sort((a, b) => a.sequence - b.sequence);
      return {
        events: merged,
        cursor: Math.max(state.cursor, page.cursor),
        status: "ready",
        failure: null,
      };
    });
  },

  reset() {
    set({ events: [], cursor: 0, status: "idle", failure: null });
  },
}));
