import type { PatientContext, PatientDemographics } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { simulateLatency } from "../lib/delay";
import { patientContextRepository } from "../repositories/patient-context.repository";
import { patientRepository } from "../repositories/patient.repository";

export const patientContextService = {
  /**
   * Assembles the patient's pre-visit picture. Demographics always come from
   * the patient record; clinical history is layered on when a fixture exists,
   * so every patient yields a usable context rather than a hard failure.
   */
  async getByPatientId(patientId: string): Promise<PatientContext> {
    await simulateLatency();

    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw ApiError.notFound("PATIENT_NOT_FOUND", "Patient could not be found.");
    }

    const demographics: PatientDemographics = {
      patientId: patient.id,
      fullName: patient.fullName,
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      city: patient.city,
      phoneMasked: patient.phoneMasked,
      avatarInitials: patient.avatarInitials,
    };

    const record = await patientContextRepository.findByPatientId(patientId);

    return {
      patientId: patient.id,
      demographics,
      allergies: record?.allergies ?? [],
      medicalHistory: record?.medicalHistory ?? [],
      currentMedications: record?.currentMedications ?? [],
      previousConsultations: record?.previousConsultations ?? [],
      relevantHealthInformation: record?.relevantHealthInformation ?? [],
      lastUpdatedAt: new Date().toISOString(),
    };
  },
};
