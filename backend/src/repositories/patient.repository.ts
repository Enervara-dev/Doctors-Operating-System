import type { Patient } from "../domain/types";
import { patientContextRepository } from "./patient-context.repository";

/**
 * Patients.
 *
 * There is exactly one way to read a patient — through the brief, behind the
 * platform's access check — so this delegates rather than opening a second
 * path that could return a record without one.
 */
export const patientRepository = {
  async findById(id: string): Promise<Patient | null> {
    return patientContextRepository.findPatient(id);
  },
};
