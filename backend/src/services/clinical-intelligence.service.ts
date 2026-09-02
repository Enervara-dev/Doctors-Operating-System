import type { ClinicalIntelligenceEnvelope } from "../domain/types";
import { simulateLatency } from "../lib/delay";
import { clinicalIntelligenceRepository } from "../repositories/clinical-intelligence.repository";

/**
 * Contract placeholder for the future clinical intelligence service.
 *
 * No AI, model, retrieval layer or rule engine exists in Phase 2. The default
 * answer is an explicit UNAVAILABLE envelope — never fabricated content.
 *
 * `source` lets a caller request synthetic fixtures instead, purely to exercise
 * the AVAILABLE / PARTIAL / ERROR states of the UI. Those payloads carry
 * `provenance: "FIXTURE"` so every surface can label them as test data.
 */
export type IntelligenceSource = "service" | "fixture" | "fixture-partial" | "waiting" | "error";

function parseSource(value: unknown): IntelligenceSource {
  switch (value) {
    case "fixture":
    case "fixture-partial":
    case "waiting":
    case "error":
      return value;
    default:
      return "service";
  }
}

/**
 * What was last served for each consultation, so the finalization snapshot can
 * record the intelligence the doctor actually saw. Process-local, like every
 * other Phase 2/3 store.
 */
const lastServed = new Map<string, ClinicalIntelligenceEnvelope>();

export const clinicalIntelligenceService = {
  getLastServed(consultationId: string): ClinicalIntelligenceEnvelope | null {
    return lastServed.get(consultationId) ?? null;
  },

  async getForConsultation(
    consultationId: string,
    rawSource: unknown,
  ): Promise<ClinicalIntelligenceEnvelope> {
    const source = parseSource(rawSource);
    await simulateLatency();

    const envelope = await buildEnvelope(consultationId, source);
    lastServed.set(consultationId, envelope);
    return envelope;
  },
};

async function buildEnvelope(
  consultationId: string,
  source: IntelligenceSource,
): Promise<ClinicalIntelligenceEnvelope> {
  if (source === "service") {
    return {
      availability: "UNAVAILABLE",
      intelligence: null,
      message:
        "No clinical intelligence service is connected. Clinical considerations, differentials and investigation mappings will appear here once it is.",
    };
  }

  if (source === "waiting") {
    return {
      availability: "WAITING",
      intelligence: null,
      message: "Waiting for clinical intelligence…",
    };
  }

  if (source === "error") {
    return {
      availability: "ERROR",
      intelligence: null,
      message: "Clinical intelligence could not be loaded.",
    };
  }

  const fixtures = await clinicalIntelligenceRepository.findFixtures();
  const payload = source === "fixture" ? fixtures.full : fixtures.partial;

  return {
    availability: source === "fixture" ? "AVAILABLE" : "PARTIAL",
    intelligence: {
      consultationId,
      generatedAt: new Date().toISOString(),
      provenance: "FIXTURE",
      ...payload,
    },
    message: null,
  };
}
