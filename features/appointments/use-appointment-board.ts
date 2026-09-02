"use client";

import { useCallback, useEffect } from "react";
import { useAppointmentStore } from "@/stores/appointment.store";

/**
 * Subscribes a page to the appointment board and triggers the initial load.
 * The store de-duplicates concurrent and repeat loads, so several mounted
 * consumers stay cheap.
 */
export function useAppointmentBoard() {
  const board = useAppointmentStore((state) => state.board);
  const status = useAppointmentStore((state) => state.status);
  const failure = useAppointmentStore((state) => state.failure);
  const loadBoard = useAppointmentStore((state) => state.loadBoard);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const reload = useCallback(() => {
    void loadBoard({ force: true });
  }, [loadBoard]);

  return { board, status, failure, reload };
}
