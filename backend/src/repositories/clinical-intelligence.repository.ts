import { db } from "../mock/db";
import type { ClinicalIntelligenceFixtures } from "../mock/types";

/**
 * Stands in for the future clinical intelligence service.
 *
 * There is no intelligence provider in Phase 2, so the only real answer this
 * repository can give is "nothing available". The fixtures it also exposes are
 * synthetic placeholders used to exercise the UI contract; the service layer
 * returns them only when a caller explicitly opts in.
 */
export const clinicalIntelligenceRepository = {
  async findFixtures(): Promise<ClinicalIntelligenceFixtures> {
    return db.clinicalIntelligenceFixtures;
  },
};
