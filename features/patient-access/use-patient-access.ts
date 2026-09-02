"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppointmentStore } from "@/stores/appointment.store";
import { usePatientStore } from "@/stores/patient.store";

/**
 * Establishes an access grant from a scheduled appointment and routes to the
 * confirmation screen. The pending id lets a list show progress on the exact
 * row the doctor clicked rather than blocking the whole page.
 */
export function useAppointmentAccess() {
  const router = useRouter();
  const accessByAppointment = usePatientStore((state) => state.accessByAppointment);
  const selectAppointment = useAppointmentStore((state) => state.selectAppointment);
  const [pendingAppointmentId, setPendingAppointmentId] = useState<string | null>(null);

  const openAppointment = useCallback(
    async (appointmentId: string) => {
      setPendingAppointmentId(appointmentId);
      const grant = await accessByAppointment(appointmentId);
      setPendingAppointmentId(null);
      if (grant) {
        selectAppointment(appointmentId);
        router.push(`/patients/${grant.patient.id}/confirm`);
      }
    },
    [accessByAppointment, selectAppointment, router],
  );

  return { openAppointment, pendingAppointmentId };
}
