import type { PatientContext } from "../domain/types";
import { patientContextRepository } from "../repositories/patient-context.repository";

/**
 * The patient's pre-visit picture.
 *
 * Assembled upstream in a single read — demographics, allergies, history,
 * medications, previous consultations, recent labs and prior prescriptions —
 * and behind the platform's per-patient access check, so a doctor without a
 * live grant gets a 403 rather than a thin record.
 *
 * There is no demographics-only fallback any more. A patient who has recorded
 * nothing yields empty sections and an availability of UNAVAILABLE, which the
 * brief says out loud; a missing patient is a genuine 404 from upstream.
 */
export const patientContextService = {
  async getByPatientId(patientId: string): Promise<PatientContext> {
    return patientContextRepository.findByPatientId(patientId);
  },
};
