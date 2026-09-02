import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AuditEvent } from "@/types";

export const consultationAuditApi = {
  /** Activity for a consultation that has not been finalized yet. */
  listForConsultation(consultationId: string, signal?: AbortSignal): Promise<AuditEvent[]> {
    return apiRequest<AuditEvent[]>(endpoints.consultations.audit(consultationId), { signal });
  },
};
