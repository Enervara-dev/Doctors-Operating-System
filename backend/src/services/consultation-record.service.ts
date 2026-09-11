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
import { consultationRecordRepository } from "../repositories/consultation-record.repository";
import { consultationRepository } from "../repositories/consultation.repository";
import { doctorRepository } from "../repositories/doctor.repository";
import { patientRepository } from "../repositories/patient.repository";
import { auditService } from "./audit.service";
import { clinicalIntelligenceService } from "./clinical-intelligence.service";
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
    // A finalized consultation IS the record: same id, same rows, immutable
    // once closed. Minting a separate record id would create a second identity
    // for one clinical event.
    id: consultation.id,
    consultationId: consultation.id,
    reference: consultation.reference,

    patientId: consultation.patientId,
    patientName: patientContext.demographics.fullName,
    doctorId: doctor.id,
    doctorName: doctor.fullName,

    authorization: consultation.authorization,

    consultationType: consultation.consultationType,
    consultationDateTime: consultation.startedAt,
    finalizedAt: consultation.finalizedAt ?? now,

    // READ LIVE, not snapshotted. A stored copy of allergies, history and
    // medications would be a second health record — the one thing this
    // architecture will not keep. The consequence is real and deliberate: a
    // record opened next year shows the patient's context as it is then, not
    // as it was at the visit. Everything the DOCTOR authored is durable and
    // unchanged; only the borrowed patient context is current.
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
    const consultation = await consultationRepository.findById(consultationId);
    if (!consultation) {
      throw ApiError.notFound(
        "CONSULTATION_NOT_FOUND",
        "This consultation could not be found. It may have ended with the previous session.",
      );
    }

    if (consultation.status === "FINALIZED") {
      // The record cannot be missing any more: it is this consultation. A
      // repeat call projects the same closed record rather than erroring.
      const doctorOfRecord = (await doctorRepository.findById(consultation.doctorId)) ?? doctor;
      return {
        record: await buildRecord(consultation, doctorOfRecord),
        alreadyFinalized: true,
      };
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

    // Closing the record is one upstream transaction: the pending clinical
    // state is written, a follow-up task is raised into the care journey when
    // the doctor recorded one, and only then does the status move. A partially
    // finalized consultation is not a state this can produce.
    const { consultation: finalizedConsultation } = await consultationRepository.finalize(
      {
        ...consultation,
        status: "FINALIZED",
        currentStep: "SUMMARY",
        furthestStep: "SUMMARY",
        completedSteps: [...new Set([...consultation.completedSteps, "SUMMARY" as const])],
      },
      // The closing line the archive shows. Taken from the doctor's primary
      // assessment, which is what the product already treats as the outcome.
      consultation.diagnoses.find((d) => d.isPrimary)?.condition ??
        consultation.diagnoses[0]?.condition ??
        "",
    );

    // Nothing to store: the record is the consultation that was just closed.
    const record = await buildRecord(finalizedConsultation, doctor);

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

  /**
   * A record id and its consultation id are the same value, so both read
   * paths resolve the same way: fetch the consultation, refuse it if it is not
   * closed, and project.
   */
  async getById(recordId: string): Promise<ConsultationRecord> {
    return this.getByConsultationId(recordId);
  },

  async getByConsultationId(consultationId: string): Promise<ConsultationRecord> {
    const consultation = await consultationRepository.findById(consultationId);
    if (!consultation || consultation.status !== "FINALIZED") {
      throw ApiError.notFound(
        "RECORD_NOT_FOUND",
        "This consultation has not been finalized, so it has no record yet.",
      );
    }

    const doctor = await doctorRepository.findById(consultation.doctorId);
    if (!doctor) {
      throw ApiError.notFound("DOCTOR_NOT_FOUND", "The doctor for this record could not be identified.");
    }

    return buildRecord(consultation, doctor);
  },

  async list(
    doctorId: string,
    filters: RecordListFilters,
  ): Promise<ConsultationRecordSummary[]> {
    const query = filters.query?.trim().toLowerCase();

    return (await consultationRecordRepository.listSummariesByDoctorId(doctorId))
      .filter((record) => !filters.patientId || record.patientId === filters.patientId)
      .filter((record) => !filters.status || record.status === filters.status)
      .filter(
        (record) => !filters.consultationType || record.consultationType === filters.consultationType,
      )
      .filter((record) => !filters.from || record.consultationDateTime >= filters.from)
      .filter((record) => !filters.to || record.consultationDateTime <= `${filters.to}T23:59:59Z`)
      .filter((record) => {
        if (!query) return true;
        return [record.patientName, record.reference, record.consultationType, record.primaryAssessment ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  },
};
