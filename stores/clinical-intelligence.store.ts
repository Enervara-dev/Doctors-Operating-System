"use client";

import { create } from "zustand";
import {
  clinicalIntelligenceApi,
  type IntelligencePreviewSource,
} from "@/features/clinical-intelligence/clinical-intelligence.api";
import { toRequestFailure } from "@/lib/api/failure";
import type { ClinicalIntelligence, IntelligenceAvailability } from "@/types";

interface ClinicalIntelligenceState {
  availability: IntelligenceAvailability;
  intelligence: ClinicalIntelligence | null;
  message: string | null;
  /**
   * Which source the panel is currently reading. `service` is the real path and
   * the only one used by default; the others render synthetic fixtures so the
   * availability states can be inspected before a provider exists.
   */
  source: IntelligencePreviewSource;

  load: (consultationId: string, source?: IntelligencePreviewSource) => Promise<void>;
  reset: () => void;
}

/**
 * Holds clinical intelligence entirely separately from the consultation record.
 *
 * Nothing in this store can reach a doctor decision: what the doctor does with a
 * suggestion is written to the consultation store as a `DifferentialReview`, a
 * `SelectedInvestigation` or a `Diagnosis`. Suggestions never mutate the record.
 */
export const useClinicalIntelligenceStore = create<ClinicalIntelligenceState>()((set) => ({
  availability: "UNAVAILABLE",
  intelligence: null,
  message: null,
  source: "service",

  async load(consultationId, source = "service") {
    set({ availability: "WAITING", message: null, source });
    try {
      const envelope = await clinicalIntelligenceApi.getForConsultation(consultationId, source);
      set({
        availability: envelope.availability,
        intelligence: envelope.intelligence,
        message: envelope.message,
      });
    } catch (error) {
      set({
        availability: "ERROR",
        intelligence: null,
        message: toRequestFailure(error).message,
      });
    }
  },

  reset() {
    set({
      availability: "UNAVAILABLE",
      intelligence: null,
      message: null,
      source: "service",
    });
  },
}));

/** True when the displayed payload is synthetic test data, not service output. */
export const selectIsFixtureData = (state: ClinicalIntelligenceState): boolean =>
  state.intelligence?.provenance === "FIXTURE";
