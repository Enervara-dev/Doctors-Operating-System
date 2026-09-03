import type {
  Consultation,
  ConsultationRecord,
  ConsultationRecordSummary,
  Doctor,
  FinalizationReadiness,
  FinalizationResult,
  RecordListFilters,
  ValidationIssue,
} from "../domain/types";
import { ApiError } from "../lib/api-error";
import { simulateLatency } from "../lib/delay";
import { createId } from "../lib/id";
import { consultationRecordRepository } from "../repositories/consultation-record.repository";
import { consultationRepository } from "../repositories/consultation.repository";
import { doctorRepository } from "../repositories/doctor.repository";
import { patientRepository } from "../repositories/patient.repository";
import { auditService } from "./audit.service";
import { clinicalIntelligenceService } from "./clinical-intelligence.service";
import { patientCommunicationService } from "./patient-communication.service";
import { patientContextService } from "./patient-context.service";
import { transcriptService } from "./transcript.service";

/* -------------------------------------------------------------------------- */
/* Finalization guard                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Server-authoritative readiness assessment.
 *
 * The frontend renders these issues, but never decides them: a client cannot
 * assert that a consultation is complete. Only checks the existing workflow
 * already requires are enforced here — no new mandatory clinical fields are
 * invented at the finalization boundary.
 */
async function assessReadiness(consultation: Consultation): Promise<FinalizationReadiness> {
  const issues: ValidationIssue[] = [];

  const patient = await patientRepository.findById(consultation.patientId);
  if (!patient) {
    issues.push({
      field: "patient",
      message: "The patient record for this consultation could not be found.",
    });
  }

  const doctor = await doctorRepository.findById(consultation.doctorId);
  if (!doctor) {
    issues.push({
      field: "doctor",
      message: "The doctor for this consultation could not be identified.",
    });
  }

  const authorization = consultation.authorization;
  if (!authorization) {
    issues.push({
      field: "authorization",
      message: "Patient authorization for this consultation could not be verified.",
    });
  } else if (authorization.status !== "AUTHORIZED") {
    issues.push({
      field: "authorization",
      message: "The patient has not authorised access to this record.",
    });
  }

  if (consultation.status === "NOT_STARTED") {
    issues.push({
      field: "workflow",
      message: "This consultation has not been started.",
    });
  } else if (consultation.status !== "REVIEW" && consultation.status !== "FINALIZING") {
    issues.push({
      field: "workflow",
      message:
        "End the live consultation and move it to review before finalizing.",
    });
  }

  if (consultation.diagnoses.length === 0) {
    issues.push({
      field: "diagnosis",
      message: "Doctor assessment is required.",
    });
  }

  return { ready: issues.length === 0, issues };
}

/* -------------------------------------------------------------------------- */
/* Snapshot                                                                    */
/* -------------------------------------------------------------------------- */

async function buildRecord(
  consultation: Consultation,
  doctor: Doctor,
): Promise<ConsultationRecord> {
  const patientContext = await patientContextService.getByPatientId(consultation.patientId);
  const intelligence = await clinicalIntelligenceService.getEnvelope(consultation.id);
  const transcript = await transcriptService.getSnapshot(consultation.id);
  const now = new Date().toISOString();

  const { clinicalFindings, ...narrative } = consultation.caseContext;
  const primary =
    consultation.diagnoses.find((diagnosis) => diagnosis.isPrimary) ??
    consultation.diagnoses[0] ??
    null;

  return {
    id: createId("rec"),
    consultationId: consultation.id,
    reference: consultation.reference,

    patientId: consultation.patientId,
    patientName: patientContext.demographics.fullName,
    doctorId: doctor.id,
    doctorName: doctor.fullName,

    authorization: consultation.authorization,

    consultationType: consultation.consultationType,
    consultationDateTime: consultation.startedAt,
    finalizedAt: now,

    // Copied, not referenced: the record must stay historically meaningful
    // after the live patient context changes.
    patientContext: {
      patientId: patientContext.patientId,
      demographics: patientContext.demographics,
      allergies: patientContext.allergies,
      medicalHistory: patientContext.medicalHistory,
      currentMedications: patientContext.currentMedications,
      previousConsultations: patientContext.previousConsultations,
      relevantHealthInformation: patientContext.relevantHealthInformation,
      capturedAt: now,
    },
    consultationContext: narrative,
    clinicalFindings,

    transcript: transcript.utterances,

    clinicalIntelligence: {
      status: intelligence.status,
      provenance: intelligence.intelligence?.provenance ?? null,
      intelligence: intelligence.intelligence,
      capturedAt: now,
    },
    doctorDecisions: consultation.doctorDecisions,

    finalAssessment: {
      primary,
      additional: consultation.diagnoses.filter((diagnosis) => diagnosis.id !== primary?.id),
      notes: consultation.assessmentNotes,
      decidedBy: "DOCTOR",
      decidedAt: primary?.decidedAt ?? now,
    },
    investigations: consultation.investigations,
    medications: consultation.medications,
    treatmentPlan: consultation.treatmentPlan,
    followUpPlan: consultation.followUp,
    additionalNotes: consultation.additionalNotes,

    status: "FINALIZED",
    version: 1,
    amendedFromRecordId: null,
    supersededByRecordId: null,
  };
}

function toSummary(record: ConsultationRecord): ConsultationRecordSummary {
  return {
    id: record.id,
    consultationId: record.consultationId,
    reference: record.reference,
    patientId: record.patientId,
    patientName: record.patientName,
    doctorId: record.doctorId,
    doctorName: record.doctorName,
    consultationType: record.consultationType,
    consultationDateTime: record.consultationDateTime,
    finalizedAt: record.finalizedAt,
    primaryAssessment: record.finalAssessment.primary?.condition ?? null,
    status: record.status,
    version: record.version,
  };
}

/* -------------------------------------------------------------------------- */
/* Service                                                                     */
/* -------------------------------------------------------------------------- */

export const consultationRecordService = {
  assessReadiness,

  /**
   * The finalization transaction.
   *
   * Validate → snapshot → persist record → generate patient payload →
   * mark the consultation finalized → write the audit event.
   *
   * Idempotent: calling it again on a finalized consultation returns the
   * existing record and writes neither a second record nor a second event.
   */
  async finalize(consultationId: string, doctor: Doctor): Promise<FinalizationResult> {
    await simulateLatency();

    const consultation = await consultationRepository.findById(consultationId);
    if (!consultation) {
      throw ApiError.notFound(
        "CONSULTATION_NOT_FOUND",
        "This consultation could not be found. It may have ended with the previous session.",
      );
    }

    if (consultation.status === "FINALIZED") {
      const existing = await consultationRecordRepository.findByConsultationId(consultation.id);
      if (existing) return { record: existing, alreadyFinalized: true };

      // A finalized consultation with no record is a data fault, not a state
      // the doctor can resolve; surface it rather than silently re-finalizing.
      throw new ApiError(
        409,
        "CONSULTATION_ALREADY_FINALIZED",
        "This consultation is marked finalized but its record is unavailable.",
      );
    }

    const readiness = await assessReadiness(consultation);
    if (!readiness.ready) {
      throw new ApiError(
        422,
        "CONSULTATION_NOT_READY",
        "Consultation cannot be finalized.",
        undefined,
        readiness.issues,
      );
    }

    const record = await consultationRecordRepository.create(
      await buildRecord(consultation, doctor),
    );
    await patientCommunicationService.generateForRecord(record);

    const finalizedAt = record.finalizedAt;
    await consultationRepository.save({
      ...consultation,
      status: "FINALIZED",
      currentStep: "SUMMARY",
      furthestStep: "SUMMARY",
      completedSteps: [...new Set([...consultation.completedSteps, "SUMMARY" as const])],
      finalizedAt,
      updatedAt: finalizedAt,
      recordId: record.id,
    });

    await auditService.record({
      consultationId: consultation.id,
      entityType: "CONSULTATION_RECORD",
      entityId: record.id,
      action: "RECORD_CREATED",
      summary: `Consultation record ${record.reference} created (version ${record.version})`,
      doctor,
      metadata: { recordId: record.id, version: record.version },
    });
    await auditService.record({
      consultationId: consultation.id,
      entityType: "CONSULTATION",
      entityId: consultation.id,
      action: "CONSULTATION_FINALIZED",
      summary: "Consultation finalized",
      doctor,
      previousValue: { status: consultation.status },
      newValue: { status: "FINALIZED", recordId: record.id },
    });

    return { record, alreadyFinalized: false };
  },

  async getById(recordId: string): Promise<ConsultationRecord> {
    await simulateLatency();
    const record = await consultationRecordRepository.findById(recordId);
    if (!record) {
      throw ApiError.notFound("RECORD_NOT_FOUND", "This consultation record could not be found.");
    }
    return record;
  },

  async getByConsultationId(consultationId: string): Promise<ConsultationRecord> {
    await simulateLatency();
    const record = await consultationRecordRepository.findByConsultationId(consultationId);
    if (!record) {
      throw ApiError.notFound(
        "RECORD_NOT_FOUND",
        "This consultation has not been finalized, so it has no record yet.",
      );
    }
    return record;
  },

  async list(
    doctorId: string,
    filters: RecordListFilters,
  ): Promise<ConsultationRecordSummary[]> {
    await simulateLatency();

    const query = filters.query?.trim().toLowerCase();
    return (await consultationRecordRepository.listByDoctorId(doctorId))
      .filter((record) => !filters.patientId || record.patientId === filters.patientId)
      .filter((record) => !filters.status || record.status === filters.status)
      .filter(
        (record) => !filters.consultationType || record.consultationType === filters.consultationType,
      )
      .filter((record) => !filters.from || record.consultationDateTime >= filters.from)
      .filter((record) => !filters.to || record.consultationDateTime <= `${filters.to}T23:59:59Z`)
      .filter((record) => {
        if (!query) return true;
        const haystack = [
          record.patientName,
          record.reference,
          record.consultationType,
          record.finalAssessment.primary?.condition ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .map(toSummary);
  },
};
