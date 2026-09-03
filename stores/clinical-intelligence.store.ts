"use client";

import { create } from "zustand";
import { liveConsultationApi } from "@/features/live-consultation/live-consultation.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type {
  ClinicalConsideration,
  ClinicalEvidence,
  ClinicalIntelligence,
  ClinicalIntelligenceEnvelope,
  ClinicalIntelligenceStatus,
  ClinicalSafetyAlert,
  InvestigationRecommendation,
  MissingInformation,
} from "@/types";

interface ClinicalIntelligenceState {
  status: ClinicalIntelligenceStatus;
  intelligence: ClinicalIntelligence | null;
  message: string | null;
  staleSince: string | null;
  failure: RequestFailure | null;

  load: (consultationId: string) => Promise<void>;
  apply: (envelope: ClinicalIntelligenceEnvelope) => void;
  reset: () => void;
}

/**
 * Clinical Intelligence, held entirely separately from the consultation record.
 *
 * Nothing in this store can reach a doctor decision. What the doctor does with
 * an output is written to `doctor-decision.store`, and the outcomes they own —
 * assessment, investigations, prescription, treatment, follow-up — live on the
 * consultation itself.
 */
export const useClinicalIntelligenceStore = create<ClinicalIntelligenceState>()((set) => ({
  status: "UNAVAILABLE",
  intelligence: null,
  message: null,
  staleSince: null,
  failure: null,

  async load(consultationId) {
    try {
      const envelope = await liveConsultationApi.getIntelligence(consultationId);
      set({
        status: envelope.status,
        intelligence: envelope.intelligence,
        message: envelope.message,
        staleSince: envelope.staleSince,
        failure: null,
      });
    } catch (error) {
      const failure = toRequestFailure(error);
      // A platform failure is reported as a clinical availability state, not as
      // a broken screen: the consultation must continue regardless.
      set({
        status: "ERROR",
        intelligence: null,
        message: failure.message,
        staleSince: null,
        failure,
      });
    }
  },

  apply(envelope) {
    set({
      status: envelope.status,
      intelligence: envelope.intelligence,
      message: envelope.message,
      staleSince: envelope.staleSince,
      failure: null,
    });
  },

  reset() {
    set({
      status: "UNAVAILABLE",
      intelligence: null,
      message: null,
      staleSince: null,
      failure: null,
    });
  },
}));

/* Stable empty references: a selector must never allocate on every call. */
const NO_CONSIDERATIONS: ClinicalConsideration[] = [];
const NO_RECOMMENDATIONS: InvestigationRecommendation[] = [];
const NO_MISSING: MissingInformation[] = [];
const NO_ALERTS: ClinicalSafetyAlert[] = [];
const NO_EVIDENCE: ClinicalEvidence[] = [];

export const selectConsiderations = (state: ClinicalIntelligenceState): ClinicalConsideration[] =>
  state.intelligence?.clinicalConsiderations ?? NO_CONSIDERATIONS;

export const selectRecommendations = (
  state: ClinicalIntelligenceState,
): InvestigationRecommendation[] =>
  state.intelligence?.investigationRecommendations ?? NO_RECOMMENDATIONS;

export const selectMissingInformation = (
  state: ClinicalIntelligenceState,
): MissingInformation[] => state.intelligence?.missingInformation ?? NO_MISSING;

export const selectSafetyAlerts = (state: ClinicalIntelligenceState): ClinicalSafetyAlert[] =>
  state.intelligence?.safetyAlerts ?? NO_ALERTS;

export const selectEvidence = (state: ClinicalIntelligenceState): ClinicalEvidence[] =>
  state.intelligence?.evidence ?? NO_EVIDENCE;

/** True when the displayed payload is synthetic fixture output, not a service. */
export const selectIsFixtureIntelligence = (state: ClinicalIntelligenceState): boolean =>
  state.intelligence?.provenance === "FIXTURE";
