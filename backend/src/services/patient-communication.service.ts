import type {
  ConsultationRecord,
  PatientCommunicationPayload,
  PatientReminder,
  PatientVisibleFollowUp,
  PatientVisibleInvestigation,
  PatientVisibleMedication,
} from "../domain/types";
import { ApiError } from "../lib/api-error";
import { simulateLatency } from "../lib/delay";
import { createId } from "../lib/id";
import { consultationRecordRepository } from "../repositories/consultation-record.repository";
import { patientCommunicationRepository } from "../repositories/patient-communication.repository";

/**
 * Projects a finalized record into the patient-facing payload.
 *
 * This is a whitelist, field by field. The record is never serialised and
 * filtered afterwards, because that approach leaks whatever is added later.
 * Anything not named here cannot reach the patient application:
 * AI differentials and reasoning, differential reviews, clinical findings,
 * doctor notes and assessment reasoning, patient context, authorization
 * snapshots and audit metadata all stay on the internal record.
 */
function project(record: ConsultationRecord): PatientCommunicationPayload {
  const primary = record.finalAssessment.primary;

  const investigations: PatientVisibleInvestigation[] = record.investigations.map(
    (investigation) => ({
      id: investigation.id,
      name: investigation.name,
      purpose: investigation.purpose,
      // The clinical question behind a test is reasoning, not instruction.
      instructions: investigation.notes,
      urgency: investigation.urgency,
    }),
  );

  const medications: PatientVisibleMedication[] = record.medications.map((medication) => ({
    id: medication.id,
    name: medication.name,
    dosage: medication.dosage,
    frequency: medication.frequency,
    duration: medication.duration,
    route: medication.route,
    instructions: medication.instructions,
  }));

  const plan = record.followUpPlan;
  const hasFollowUp = Boolean(plan && (plan.date || plan.interval || plan.reason));
  const followUp: PatientVisibleFollowUp | null =
    plan && hasFollowUp
      ? {
          date: plan.date,
          interval: plan.interval,
          reason: plan.reason,
          bringOrComplete: plan.requiredInvestigations,
          symptomsToMonitor: plan.symptomMonitoring,
          whenToSeekHelp: plan.escalationInstructions,
          // `medicationReview` is a note to the next clinician, not to the patient.
        }
      : null;

  // Reminders are derived only from what the doctor recorded — no scheduling is
  // invented here, and a missing date stays null for the patient app to resolve.
  const reminders: PatientReminder[] = [];
  if (followUp?.date || followUp?.interval) {
    reminders.push({
      id: createId("rem"),
      type: "FOLLOW_UP",
      label: followUp.reason
        ? `Follow-up appointment — ${followUp.reason}`
        : "Follow-up appointment",
      dueDate: followUp.date,
    });
  }
  for (const investigation of investigations) {
    reminders.push({
      id: createId("rem"),
      type: "INVESTIGATION",
      label: `Complete ${investigation.name}`,
      dueDate: null,
    });
  }
  for (const medication of medications) {
    reminders.push({
      id: createId("rem"),
      type: "MEDICATION",
      label: `${medication.name} — ${medication.frequency} for ${medication.duration}`,
      dueDate: null,
    });
  }

  return {
    consultationId: record.consultationId,
    recordId: record.id,
    patientId: record.patientId,
    finalizedAt: record.finalizedAt,
    assessment: primary
      ? {
          condition: primary.condition,
          certainty: primary.certainty,
          additionalConditions: record.finalAssessment.additional.map(
            (diagnosis) => diagnosis.condition,
          ),
        }
      : null,
    investigations,
    medications,
    treatmentInstructions: record.treatmentPlan.advice.trim() || null,
    treatmentMeasures: [
      ...record.treatmentPlan.nonPharmacological,
      ...record.treatmentPlan.procedures,
    ],
    followUp,
    reminders,
  };
}

export const patientCommunicationService = {
  /** Called inside the finalization transaction. */
  async generateForRecord(record: ConsultationRecord): Promise<PatientCommunicationPayload> {
    return patientCommunicationRepository.save(project(record));
  },

  async getForRecord(recordId: string): Promise<PatientCommunicationPayload> {
    await simulateLatency();

    const stored = await patientCommunicationRepository.findByRecordId(recordId);
    if (stored) return stored;

    // Seeded records predate this process, so project on demand. The result is
    // identical — the payload is a pure function of the record.
    const record = await consultationRecordRepository.findById(recordId);
    if (!record) {
      throw ApiError.notFound("RECORD_NOT_FOUND", "This consultation record could not be found.");
    }
    return patientCommunicationRepository.save(project(record));
  },

  /** Exposed for tests that assert the boundary directly. */
  project,
};
