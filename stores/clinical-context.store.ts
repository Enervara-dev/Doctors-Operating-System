"use client";

import { create } from "zustand";
import { liveConsultationApi } from "@/features/live-consultation/live-consultation.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { ClinicalContext, ClinicalFact } from "@/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface ClinicalContextState {
  context: ClinicalContext | null;
  status: LoadStatus;
  failure: RequestFailure | null;

  load: (consultationId: string) => Promise<void>;
  apply: (context: ClinicalContext) => void;
  reset: () => void;
}

/**
 * The clinical picture extracted from this consultation.
 *
 * Deliberately separate from `patient-context.store`, which holds what was
 * known before the visit, and from the consultation record, which holds what
 * the doctor decided.
 */
export const useClinicalContextStore = create<ClinicalContextState>()((set) => ({
  context: null,
  status: "idle",
  failure: null,

  async load(consultationId) {
    set({ status: "loading", failure: null });
    try {
      set({
        context: await liveConsultationApi.getClinicalContext(consultationId),
        status: "ready",
        failure: null,
      });
    } catch (error) {
      set({ status: "error", failure: toRequestFailure(error) });
    }
  },

  apply(context) {
    set({ context, status: "ready", failure: null });
  },

  reset() {
    set({ context: null, status: "idle", failure: null });
  },
}));

const NO_FACTS: ClinicalFact[] = [];

export const selectFacts = (state: ClinicalContextState): ClinicalFact[] =>
  state.context?.facts ?? NO_FACTS;
