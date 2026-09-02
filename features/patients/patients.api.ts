import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { PatientContext } from "@/types";

export const patientsApi = {
  /** The patient's pre-visit clinical picture, assembled server-side. */
  getContext(patientId: string, signal?: AbortSignal): Promise<PatientContext> {
    return apiRequest<PatientContext>(endpoints.patients.context(patientId), { signal });
  },
};
