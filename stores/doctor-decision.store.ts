"use client";

import { create } from "zustand";
import { liveConsultationApi } from "@/features/live-consultation/live-consultation.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { DoctorDecision, DoctorDecisionInput } from "@/types";

interface DoctorDecisionState {
  decisions: DoctorDecision[];
  /** Subject currently being written, so a card can show its own progress. */
  pendingSubjectId: string | null;
  failure: RequestFailure | null;

  load: (consultationId: string) => Promise<void>;
  record: (consultationId: string, input: DoctorDecisionInput) => Promise<boolean>;
  reset: () => void;
}

/**
 * What the doctor decided about Clinical Intelligence output.
 *
 * Held apart from the intelligence store on purpose: recording a decision never
 * mutates what the platform published, and the two are read back separately so
 * an auditor can tell them apart.
 */
export const useDoctorDecisionStore = create<DoctorDecisionState>()((set) => ({
  decisions: [],
  pendingSubjectId: null,
  failure: null,

  async load(consultationId) {
    try {
      set({ decisions: await liveConsultationApi.listDecisions(consultationId), failure: null });
    } catch (error) {
      set({ failure: toRequestFailure(error) });
    }
  },

  async record(consultationId, input) {
    set({ pendingSubjectId: input.subjectId, failure: null });
    try {
      const decisions = await liveConsultationApi.recordDecision(consultationId, input);
      set({ decisions, pendingSubjectId: null, failure: null });
      return true;
    } catch (error) {
      set({ pendingSubjectId: null, failure: toRequestFailure(error) });
      return false;
    }
  },

  reset() {
    set({ decisions: [], pendingSubjectId: null, failure: null });
  },
}));

export function selectDecisionFor(
  decisions: readonly DoctorDecision[],
  subjectId: string,
): DoctorDecision | undefined {
  return decisions.find((decision) => decision.subjectId === subjectId);
}
