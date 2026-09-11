import type { Patient } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { patientRepository } from "../repositories/patient.repository";

export const patientService = {
  async getById(patientId: string): Promise<Patient> {
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw ApiError.notFound("PATIENT_NOT_FOUND", "Patient could not be found.");
    }
    return patient;
  },
};
