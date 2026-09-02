"use client";

import { create } from "zustand";
import { consultationAuditApi } from "@/features/consultations/audit.api";
import { recordsApi } from "@/features/records/records.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { AuditEvent } from "@/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface AuditState {
  events: AuditEvent[];
  status: LoadStatus;
  failure: RequestFailure | null;
  /** Which entity the loaded events belong to, so repeat loads are cheap. */
  loadedFor: string | null;

  loadForConsultation: (consultationId: string, options?: { force?: boolean }) => Promise<void>;
  loadForRecord: (recordId: string, options?: { force?: boolean }) => Promise<void>;
  reset: () => void;
}

export const useAuditStore = create<AuditState>()((set, get) => {
  async function load(key: string, fetcher: () => Promise<AuditEvent[]>, force?: boolean) {
    const { status, loadedFor } = get();
    if (status === "loading") return;
    if (!force && loadedFor === key && status === "ready") return;

    set({ status: "loading", failure: null });
    try {
      set({ events: await fetcher(), status: "ready", failure: null, loadedFor: key });
    } catch (error) {
      set({ status: "error", failure: toRequestFailure(error), loadedFor: key });
    }
  }

  return {
    events: [],
    status: "idle",
    failure: null,
    loadedFor: null,

    loadForConsultation(consultationId, options) {
      return load(
        `consultation:${consultationId}`,
        () => consultationAuditApi.listForConsultation(consultationId),
        options?.force,
      );
    },

    loadForRecord(recordId, options) {
      return load(`record:${recordId}`, () => recordsApi.getAudit(recordId), options?.force);
    },

    reset() {
      set({ events: [], status: "idle", failure: null, loadedFor: null });
    },
  };
});
