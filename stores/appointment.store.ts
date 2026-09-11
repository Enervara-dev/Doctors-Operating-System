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
  confirmAppointment: (appointmentId: string) => Promise<boolean>;
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

  /**
   * Accepts a patient's booking request.
   *
   * Reloads the board rather than patching the row in place: confirming can
   * move an appointment between the today / upcoming buckets and changes the
   * section counts, so a local edit would leave the page subtly wrong.
   */
  async confirmAppointment(appointmentId) {
    set({ failure: null });
    try {
      await appointmentsApi.confirm(appointmentId);
      await get().loadBoard({ force: true });
      return true;
    } catch (error) {
      set({ failure: toRequestFailure(error) });
      return false;
    }
  },

  selectAppointment(appointmentId) {
    set({ selectedAppointmentId: appointmentId });
  },

  reset() {
    set({ board: null, status: "idle", failure: null, selectedAppointmentId: null });
  },
}));
