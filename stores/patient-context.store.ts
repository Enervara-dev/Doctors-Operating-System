"use client";

import { create } from "zustand";
import { patientsApi } from "@/features/patients/patients.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { Allergy, PatientContext } from "@/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface PatientContextState {
  context: PatientContext | null;
  status: LoadStatus;
  failure: RequestFailure | null;

  load: (patientId: string, options?: { force?: boolean }) => Promise<void>;
  reset: () => void;
}

/**
 * Owns the patient's pre-visit picture for the whole workspace. Components read
 * from here rather than re-fetching or re-deriving patient facts for themselves.
 */
export const usePatientContextStore = create<PatientContextState>()((set, get) => ({
  context: null,
  status: "idle",
  failure: null,

  async load(patientId, options) {
    const { context, status } = get();
    if (status === "loading") return;
    if (!options?.force && context?.patientId === patientId && status === "ready") return;

    set({ status: "loading", failure: null });
    try {
      set({ context: await patientsApi.getContext(patientId), status: "ready", failure: null });
    } catch (error) {
      set({ status: "error", failure: toRequestFailure(error) });
    }
  },

  reset() {
    set({ context: null, status: "idle", failure: null });
  },
}));

const CRITICAL_SEVERITIES = new Set<Allergy["severity"]>(["SEVERE", "CRITICAL"]);

/**
 * A frozen empty array so the selector below returns a stable reference when no
 * context is loaded. Store selectors must never allocate: Zustand compares by
 * reference, and a fresh value each render is an infinite update loop.
 */
const NO_ALLERGIES: Allergy[] = [];

export const selectAllergies = (state: PatientContextState): Allergy[] =>
  state.context?.allergies ?? NO_ALLERGIES;

/** Allergies serious enough to stay on screen throughout the consultation. */
export function filterCriticalAllergies(allergies: readonly Allergy[]): Allergy[] {
  return allergies.filter((allergy) => CRITICAL_SEVERITIES.has(allergy.severity));
}
