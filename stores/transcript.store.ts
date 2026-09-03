"use client";

import { create } from "zustand";
import { liveConsultationApi } from "@/features/live-consultation/live-consultation.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { TranscriptSnapshot, TranscriptUtterance } from "@/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface TranscriptState {
  /** Keyed by utterance id so a partial settles in place instead of duplicating. */
  byId: Record<string, TranscriptUtterance>;
  order: string[];
  cursor: number;
  finalCount: number;
  status: LoadStatus;
  failure: RequestFailure | null;

  load: (consultationId: string) => Promise<void>;
  applySnapshot: (snapshot: TranscriptSnapshot) => void;
  reset: () => void;
}

const EMPTY: TranscriptUtterance[] = [];

export const useTranscriptStore = create<TranscriptState>()((set, get) => ({
  byId: {},
  order: [],
  cursor: 0,
  finalCount: 0,
  status: "idle",
  failure: null,

  async load(consultationId) {
    set({ status: "loading", failure: null });
    try {
      get().applySnapshot(await liveConsultationApi.getTranscript(consultationId));
      set({ status: "ready", failure: null });
    } catch (error) {
      set({ status: "error", failure: toRequestFailure(error) });
    }
  },

  /**
   * Merges an incremental snapshot. Ordering comes from the sequence the
   * platform assigned, never from arrival time, so a delayed or re-sent
   * utterance still lands in the right place and a partial is replaced by its
   * final version rather than appended alongside it.
   */
  applySnapshot(snapshot) {
    set((state) => {
      const byId = { ...state.byId };
      for (const utterance of snapshot.utterances) byId[utterance.id] = utterance;

      const order = Object.values(byId)
        .sort((a, b) => a.sequence - b.sequence)
        .map((utterance) => utterance.id);

      return {
        byId,
        order,
        cursor: Math.max(state.cursor, snapshot.cursor),
        finalCount: snapshot.finalCount,
        status: "ready",
        failure: null,
      };
    });
  },

  reset() {
    set({ byId: {}, order: [], cursor: 0, finalCount: 0, status: "idle", failure: null });
  },
}));

/**
 * Utterances in sequence order, memoised against the id list so the selector
 * returns a stable reference between unrelated updates. Store selectors must
 * never allocate on every call: Zustand compares by reference.
 */
let cachedOrder: string[] = [];
let cachedList: TranscriptUtterance[] = EMPTY;

export function selectUtterances(state: TranscriptState): TranscriptUtterance[] {
  if (state.order === cachedOrder) return cachedList;
  cachedOrder = state.order;
  cachedList = state.order
    .map((id) => state.byId[id])
    .filter((utterance): utterance is TranscriptUtterance => Boolean(utterance));
  return cachedList;
}
