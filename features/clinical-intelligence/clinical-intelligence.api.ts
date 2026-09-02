import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ClinicalIntelligenceEnvelope } from "@/types";

/**
 * The single seam through which clinical intelligence enters the application.
 *
 * No component talks to this directly — the store does — and no component knows
 * anything about how intelligence is produced. Connecting a real service means
 * changing this file and nothing above it.
 */
export type IntelligencePreviewSource =
  | "service"
  | "fixture"
  | "fixture-partial"
  | "waiting"
  | "error";

export const clinicalIntelligenceApi = {
  getForConsultation(
    consultationId: string,
    source: IntelligencePreviewSource = "service",
    signal?: AbortSignal,
  ): Promise<ClinicalIntelligenceEnvelope> {
    const path = endpoints.consultations.clinicalIntelligence(consultationId);
    const query = source === "service" ? "" : `?source=${encodeURIComponent(source)}`;
    return apiRequest<ClinicalIntelligenceEnvelope>(`${path}${query}`, { signal });
  },
};
