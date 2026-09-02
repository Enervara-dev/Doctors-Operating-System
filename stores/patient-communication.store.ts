"use client";

import { create } from "zustand";
import { recordsApi } from "@/features/records/records.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { PatientCommunicationPayload } from "@/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface PatientCommunicationState {
  payload: PatientCommunicationPayload | null;
  status: LoadStatus;
  failure: RequestFailure | null;

  load: (recordId: string, options?: { force?: boolean }) => Promise<void>;
  reset: () => void;
}

/**
 * Holds the doctor-side preview of the patient-facing projection. Loading it is
 * a read: nothing is transmitted to the patient application, which is not
 * integrated in any phase of this build.
 */
export const usePatientCommunicationStore = create<PatientCommunicationState>()((set, get) => ({
  payload: null,
  status: "idle",
  failure: null,

  async load(recordId, options) {
    const { payload, status } = get();
    if (status === "loading") return;
    if (!options?.force && payload?.recordId === recordId && status === "ready") return;

    set({ status: "loading", failure: null });
    try {
      set({
        payload: await recordsApi.getPatientCommunication(recordId),
        status: "ready",
        failure: null,
      });
    } catch (error) {
      set({ status: "error", failure: toRequestFailure(error) });
    }
  },

  reset() {
    set({ payload: null, status: "idle", failure: null });
  },
}));
