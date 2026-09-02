import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  AuditEvent,
  ConsultationRecord,
  ConsultationRecordSummary,
  PatientCommunicationPayload,
  RecordListFilters,
} from "@/types";

function toQuery(filters: RecordListFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "string" && value.trim().length > 0) params.set(key, value.trim());
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const recordsApi = {
  list(filters: RecordListFilters, signal?: AbortSignal): Promise<ConsultationRecordSummary[]> {
    return apiRequest<ConsultationRecordSummary[]>(
      `${endpoints.records.list}${toQuery(filters)}`,
      { signal },
    );
  },

  getById(recordId: string, signal?: AbortSignal): Promise<ConsultationRecord> {
    return apiRequest<ConsultationRecord>(endpoints.records.byId(recordId), { signal });
  },

  getAudit(recordId: string, signal?: AbortSignal): Promise<AuditEvent[]> {
    return apiRequest<AuditEvent[]>(endpoints.records.audit(recordId), { signal });
  },

  /**
   * The doctor-side preview of the patient-facing projection. Reading it sends
   * nothing anywhere — the patient application is not integrated.
   */
  getPatientCommunication(
    recordId: string,
    signal?: AbortSignal,
  ): Promise<PatientCommunicationPayload> {
    return apiRequest<PatientCommunicationPayload>(
      endpoints.records.patientCommunication(recordId),
      { signal },
    );
  },
};
