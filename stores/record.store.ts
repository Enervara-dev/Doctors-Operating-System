"use client";

import { create } from "zustand";
import { recordsApi } from "@/features/records/records.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { ConsultationRecord, ConsultationRecordSummary, RecordListFilters } from "@/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface RecordState {
  /** The archive listing. */
  records: ConsultationRecordSummary[];
  listStatus: LoadStatus;
  listFailure: RequestFailure | null;
  filters: RecordListFilters;

  /** The record currently open in the viewer. */
  record: ConsultationRecord | null;
  recordStatus: LoadStatus;
  recordFailure: RequestFailure | null;

  loadRecords: (filters?: RecordListFilters) => Promise<void>;
  setFilters: (filters: RecordListFilters) => Promise<void>;
  loadRecord: (recordId: string, options?: { force?: boolean }) => Promise<void>;
  reset: () => void;
}

/**
 * Monotonic token for list requests. Filters can be re-submitted faster than a
 * response returns, so only the newest request is allowed to write results —
 * otherwise a slower earlier load overwrites the filtered list.
 */
let listRequestId = 0;

export const useRecordStore = create<RecordState>()((set, get) => ({
  records: [],
  listStatus: "idle",
  listFailure: null,
  filters: {},

  record: null,
  recordStatus: "idle",
  recordFailure: null,

  async loadRecords(filters) {
    const next = filters ?? get().filters;
    listRequestId += 1;
    const requestId = listRequestId;

    set({ listStatus: "loading", listFailure: null, filters: next });
    try {
      const records = await recordsApi.list(next);
      if (requestId !== listRequestId) return;
      set({ records, listStatus: "ready", listFailure: null });
    } catch (error) {
      if (requestId !== listRequestId) return;
      set({ listStatus: "error", listFailure: toRequestFailure(error) });
    }
  },

  async setFilters(filters) {
    await get().loadRecords(filters);
  },

  async loadRecord(recordId, options) {
    const { record, recordStatus } = get();
    if (recordStatus === "loading") return;
    if (!options?.force && record?.id === recordId && recordStatus === "ready") return;

    set({ recordStatus: "loading", recordFailure: null });
    try {
      set({
        record: await recordsApi.getById(recordId),
        recordStatus: "ready",
        recordFailure: null,
      });
    } catch (error) {
      set({ recordStatus: "error", recordFailure: toRequestFailure(error) });
    }
  },

  reset() {
    set({
      records: [],
      listStatus: "idle",
      listFailure: null,
      filters: {},
      record: null,
      recordStatus: "idle",
      recordFailure: null,
    });
  },
}));
