"use client";

import { create } from "zustand";
import { appointmentsApi } from "@/features/appointments/appointments.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { AppointmentBoard } from "@/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface AppointmentState {
  board: AppointmentBoard | null;
  status: LoadStatus;
  failure: RequestFailure | null;
  selectedAppointmentId: string | null;

  loadBoard: (options?: { force?: boolean }) => Promise<void>;
  selectAppointment: (appointmentId: string | null) => void;
  reset: () => void;
}

export const useAppointmentStore = create<AppointmentState>()((set, get) => ({
  board: null,
  status: "idle",
  failure: null,
  selectedAppointmentId: null,

  async loadBoard(options) {
    const { status, board } = get();
    if (status === "loading") return;
    // Re-entering the dashboard should not re-flash a skeleton over good data.
    if (!options?.force && board && status === "ready") return;

    set({ status: "loading", failure: null });
    try {
      set({ board: await appointmentsApi.getBoard(), status: "ready", failure: null });
    } catch (error) {
      set({ status: "error", failure: toRequestFailure(error) });
    }
  },

  selectAppointment(appointmentId) {
    set({ selectedAppointmentId: appointmentId });
  },

  reset() {
    set({ board: null, status: "idle", failure: null, selectedAppointmentId: null });
  },
}));
