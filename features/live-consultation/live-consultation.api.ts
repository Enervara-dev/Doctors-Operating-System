import { apiRequest, apiStream } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  ClinicalConsiderationsResponse,
  ClinicalContext,
  ClinicalEvidenceResponse,
  ClinicalIntelligenceEnvelope,
  ClinicalSafetyResponse,
  ConsultationEventPage,
  DoctorDecision,
  DoctorDecisionInput,
  InvestigationRecommendationsResponse,
  LiveSession,
  LiveUpdatesPage,
  MissingInformationResponse,
  TranscriptSnapshot,
} from "@/types";

/**
 * The single seam between the Doctor application and everything the Clinical
 * Intelligence Platform produces.
 *
 * Each clinical domain is fetched independently, so one slow or absent section
 * never blocks the rest of the workspace, and no surface pulls a combined
 * payload it does not need. No component calls any of this directly — the
 * stores do.
 */
export const liveConsultationApi = {
  /* ------------------------------------------------------------- session */
  getSession(consultationId: string, signal?: AbortSignal): Promise<LiveSession> {
    return apiRequest<LiveSession>(endpoints.consultations.live(consultationId), { signal });
  },

  start(consultationId: string): Promise<LiveSession> {
    return apiRequest<LiveSession>(endpoints.consultations.liveStart(consultationId), {
      method: "POST",
    });
  },

  pause(consultationId: string): Promise<LiveSession> {
    return apiRequest<LiveSession>(endpoints.consultations.livePause(consultationId), {
      method: "POST",
    });
  },

  resume(consultationId: string): Promise<LiveSession> {
    return apiRequest<LiveSession>(endpoints.consultations.liveResume(consultationId), {
      method: "POST",
    });
  },

  stop(consultationId: string): Promise<LiveSession> {
    return apiRequest<LiveSession>(endpoints.consultations.liveStop(consultationId), {
      method: "POST",
    });
  },

  /* ----------------------------------------------------------- transport */
  getUpdates(
    consultationId: string,
    cursors: { transcript: number; events: number },
    signal?: AbortSignal,
  ): Promise<LiveUpdatesPage> {
    const query = `?transcript=${cursors.transcript}&events=${cursors.events}`;
    return apiRequest<LiveUpdatesPage>(
      `${endpoints.consultations.liveUpdates(consultationId)}${query}`,
      { signal },
    );
  },

  openStream(consultationId: string, signal?: AbortSignal): Promise<Response> {
    return apiStream(endpoints.consultations.liveStream(consultationId), signal);
  },

  /* ----------------------------------------------------- clinical domains */
  getTranscript(
    consultationId: string,
    since = 0,
    signal?: AbortSignal,
  ): Promise<TranscriptSnapshot> {
    return apiRequest<TranscriptSnapshot>(
      `${endpoints.consultations.transcript(consultationId)}?since=${since}`,
      { signal },
    );
  },

  getClinicalContext(consultationId: string, signal?: AbortSignal): Promise<ClinicalContext> {
    return apiRequest<ClinicalContext>(endpoints.consultations.clinicalContext(consultationId), {
      signal,
    });
  },

  getIntelligence(
    consultationId: string,
    signal?: AbortSignal,
  ): Promise<ClinicalIntelligenceEnvelope> {
    return apiRequest<ClinicalIntelligenceEnvelope>(
      endpoints.consultations.clinicalIntelligence(consultationId),
      { signal },
    );
  },

  getConsiderations(
    consultationId: string,
    signal?: AbortSignal,
  ): Promise<ClinicalConsiderationsResponse> {
    return apiRequest<ClinicalConsiderationsResponse>(
      endpoints.consultations.considerations(consultationId),
      { signal },
    );
  },

  getInvestigationRecommendations(
    consultationId: string,
    signal?: AbortSignal,
  ): Promise<InvestigationRecommendationsResponse> {
    return apiRequest<InvestigationRecommendationsResponse>(
      endpoints.consultations.investigationRecommendations(consultationId),
      { signal },
    );
  },

  getMissingInformation(
    consultationId: string,
    signal?: AbortSignal,
  ): Promise<MissingInformationResponse> {
    return apiRequest<MissingInformationResponse>(
      endpoints.consultations.missingInformation(consultationId),
      { signal },
    );
  },

  getSafety(consultationId: string, signal?: AbortSignal): Promise<ClinicalSafetyResponse> {
    return apiRequest<ClinicalSafetyResponse>(
      endpoints.consultations.clinicalSafety(consultationId),
      { signal },
    );
  },

  getEvidence(consultationId: string, signal?: AbortSignal): Promise<ClinicalEvidenceResponse> {
    return apiRequest<ClinicalEvidenceResponse>(
      endpoints.consultations.clinicalEvidence(consultationId),
      { signal },
    );
  },

  getEvents(
    consultationId: string,
    since = 0,
    signal?: AbortSignal,
  ): Promise<ConsultationEventPage> {
    return apiRequest<ConsultationEventPage>(
      `${endpoints.consultations.events(consultationId)}?since=${since}`,
      { signal },
    );
  },

  /* ------------------------------------------------------ doctor decisions */
  listDecisions(consultationId: string, signal?: AbortSignal): Promise<DoctorDecision[]> {
    return apiRequest<DoctorDecision[]>(endpoints.consultations.decisions(consultationId), {
      signal,
    });
  },

  recordDecision(consultationId: string, input: DoctorDecisionInput): Promise<DoctorDecision[]> {
    return apiRequest<DoctorDecision[]>(endpoints.consultations.decisions(consultationId), {
      method: "POST",
      body: input,
    });
  },
};
