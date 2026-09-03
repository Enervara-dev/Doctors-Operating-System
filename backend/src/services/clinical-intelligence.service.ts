import type {
  ClinicalConsiderationsResponse,
  ClinicalEvidenceResponse,
  ClinicalIntelligence,
  ClinicalIntelligenceEnvelope,
  ClinicalIntelligenceStatus,
  ClinicalSafetyResponse,
  InvestigationRecommendationsResponse,
  MissingInformationResponse,
} from "../domain/types";
import { sessionEngine } from "../live/session-engine";
import { clinicalIntelligenceRepository } from "../repositories/clinical-intelligence.repository";
import { transcriptRepository } from "../repositories/transcript.repository";

/**
 * Reads Clinical Intelligence for a consultation.
 *
 * This service never reasons. It reports what the platform has published,
 * always with an explicit status, and says plainly when nothing is available.
 * A missing platform is a supported product state, not an error: the doctor
 * must be able to run the whole consultation without it.
 */

const UNAVAILABLE_MESSAGE =
  "No Clinical Intelligence Platform is connected. Clinical considerations, investigation recommendations and safety findings will appear here once it is.";

const WAITING_MESSAGE =
  "Clinical Intelligence is processing the consultation. The workspace remains fully usable.";

const STALE_MESSAGE =
  "Clinical Intelligence has not yet caught up with the latest conversation.";

function statusMessage(status: ClinicalIntelligenceStatus): string | null {
  switch (status) {
    case "UNAVAILABLE":
      return UNAVAILABLE_MESSAGE;
    case "CONNECTING":
      return "Connecting to the Clinical Intelligence Platform…";
    case "WAITING":
      return WAITING_MESSAGE;
    case "STALE":
      return STALE_MESSAGE;
    case "ERROR":
      return "Clinical Intelligence is temporarily unavailable. The consultation can continue.";
    default:
      return null;
  }
}

/**
 * Marks a published payload stale once meaningfully more has been said since it
 * was generated, so the doctor is never shown old output as if it were current.
 */
const STALE_AFTER_UTTERANCES = 4;

async function resolve(consultationId: string): Promise<{
  status: ClinicalIntelligenceStatus;
  intelligence: ClinicalIntelligence | null;
  staleSince: string | null;
}> {
  const latest = await clinicalIntelligenceRepository.findLatest(consultationId);
  if (!latest) {
    return {
      status: await sessionEngine.intelligenceStatus(consultationId),
      intelligence: null,
      staleSince: null,
    };
  }

  const finalUtterances = await transcriptRepository.countFinal(consultationId);
  const utterancesAtPublication = (
    await transcriptRepository.list(consultationId)
  ).filter(
    (utterance) =>
      utterance.status === "FINAL" &&
      utterance.finalizedAt !== null &&
      utterance.finalizedAt <= latest.generatedAt,
  ).length;

  const isStale = finalUtterances - utterancesAtPublication >= STALE_AFTER_UTTERANCES;

  return {
    status: isStale ? "STALE" : "AVAILABLE",
    intelligence: latest,
    staleSince: isStale ? latest.generatedAt : null,
  };
}

export const clinicalIntelligenceService = {
  async getEnvelope(consultationId: string): Promise<ClinicalIntelligenceEnvelope> {
    const { status, intelligence, staleSince } = await resolve(consultationId);
    return { status, intelligence, message: statusMessage(status), staleSince };
  },

  async getConsiderations(consultationId: string): Promise<ClinicalConsiderationsResponse> {
    const { status, intelligence } = await resolve(consultationId);
    return {
      status,
      message: statusMessage(status),
      version: intelligence?.version ?? null,
      generatedAt: intelligence?.generatedAt ?? null,
      considerations: intelligence?.clinicalConsiderations ?? [],
    };
  },

  async getInvestigationRecommendations(
    consultationId: string,
  ): Promise<InvestigationRecommendationsResponse> {
    const { status, intelligence } = await resolve(consultationId);
    return {
      status,
      message: statusMessage(status),
      version: intelligence?.version ?? null,
      generatedAt: intelligence?.generatedAt ?? null,
      recommendations: intelligence?.investigationRecommendations ?? [],
    };
  },

  async getMissingInformation(consultationId: string): Promise<MissingInformationResponse> {
    const { status, intelligence } = await resolve(consultationId);
    return {
      status,
      message: statusMessage(status),
      items: intelligence?.missingInformation ?? [],
    };
  },

  async getSafety(consultationId: string): Promise<ClinicalSafetyResponse> {
    const { status, intelligence } = await resolve(consultationId);
    return {
      status,
      message: statusMessage(status),
      alerts: intelligence?.safetyAlerts ?? [],
    };
  },

  async getEvidence(consultationId: string): Promise<ClinicalEvidenceResponse> {
    const { status, intelligence } = await resolve(consultationId);
    return {
      status,
      message: statusMessage(status),
      evidence: intelligence?.evidence ?? [],
    };
  },

  /** Every published revision, retained so audit can show what was reviewed. */
  async listVersions(consultationId: string): Promise<ClinicalIntelligence[]> {
    return clinicalIntelligenceRepository.listVersions(consultationId);
  },
};
