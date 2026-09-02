"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { stepHref } from "@/lib/constants/consultation";
import { useClinicalIntelligenceStore } from "@/stores/clinical-intelligence.store";
import { useConsultationStore } from "@/stores/consultation.store";
import { usePatientContextStore } from "@/stores/patient-context.store";
import type { PatientAccessGrant } from "@/types";

/**
 * Opens (or resumes) the consultation for an authorised patient and moves the
 * doctor into the workspace. Feature stores are cleared first so nothing from a
 * previous patient can bleed into the new session.
 */
export function useStartConsultation() {
  const router = useRouter();
  const start = useConsultationStore((state) => state.start);
  const resetConsultation = useConsultationStore((state) => state.reset);
  const failure = useConsultationStore((state) => state.failure);
  const resetContext = usePatientContextStore((state) => state.reset);
  const resetIntelligence = useClinicalIntelligenceStore((state) => state.reset);

  const [isStarting, setIsStarting] = useState(false);

  const startConsultation = useCallback(
    async (grant: PatientAccessGrant) => {
      setIsStarting(true);
      resetConsultation();
      resetContext();
      resetIntelligence();

      const created = await start({
        patientId: grant.patient.id,
        appointmentId: grant.appointment?.id ?? null,
        // The API resolves authorization from the grant id it issued; the
        // client never asserts that it is authorised.
        accessGrantId: grant.id,
        ...(grant.appointment ? { consultationType: grant.appointment.appointmentType } : {}),
      });

      setIsStarting(false);
      if (created) router.push(stepHref(created.id, created.currentStep));
    },
    [start, resetConsultation, resetContext, resetIntelligence, router],
  );

  return { startConsultation, isStarting, failure };
}
