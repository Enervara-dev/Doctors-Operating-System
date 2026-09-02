import type {
  AuthorizationSnapshot,
  Consultation,
  ConsultationStatus,
  ConsultationStep,
  ConsultationSummary,
  CurrentCaseContext,
  Diagnosis,
  DifferentialDisposition,
  DifferentialReview,
  Doctor,
  FollowUpPlan,
  Medication,
  SelectedInvestigation,
  TreatmentPlan,
} from "../domain/types";
import { ApiError } from "../lib/api-error";
import { furthestOf, isStep, stepIndex } from "../lib/consultation-steps";
import { simulateLatency } from "../lib/delay";
import { createId } from "../lib/id";
import { accessGrantRepository } from "../repositories/access-grant.repository";
import { appointmentRepository } from "../repositories/appointment.repository";
import { caseIntakeRepository } from "../repositories/case-intake.repository";
import { consultationRepository } from "../repositories/consultation.repository";
import { patientRepository } from "../repositories/patient.repository";
import { auditService } from "./audit.service";
import { consultationRecordService } from "./consultation-record.service";
import { patientContextService } from "./patient-context.service";

/* -------------------------------------------------------------------------- */
/* Guards                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A finalized consultation is a closed clinical record. Every mutating path
 * runs through here so no endpoint can quietly reopen one; amendments are a
 * Phase 3 concern with their own audit requirements.
 */
function assertMutable(consultation: Consultation): Consultation {
  if (consultation.status === "FINALIZED") {
    throw new ApiError(
      409,
      "CONSULTATION_FINALIZED",
      "This consultation has been finalized and can no longer be edited.",
    );
  }
  return consultation;
}

const ALLOWED_TRANSITIONS: Record<ConsultationStatus, readonly ConsultationStatus[]> = {
  NOT_STARTED: ["ACTIVE"],
  ACTIVE: ["ACTIVE", "DRAFT", "READY_FOR_REVIEW"],
  DRAFT: ["DRAFT", "ACTIVE", "READY_FOR_REVIEW"],
  READY_FOR_REVIEW: ["READY_FOR_REVIEW", "DRAFT", "ACTIVE", "FINALIZED"],
  FINALIZED: [],
};

function assertTransition(from: ConsultationStatus, to: ConsultationStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new ApiError(
      409,
      "INVALID_STATE_TRANSITION",
      `A consultation cannot move from ${from} to ${to}.`,
    );
  }
}

function requireText(value: unknown, field: string, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw ApiError.validation("Please correct the highlighted fields.", { [field]: message });
  }
  return value.trim();
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function touch(consultation: Consultation): Consultation {
  return { ...consultation, updatedAt: new Date().toISOString() };
}

/**
 * Applied to every change that alters clinical content. Editing a consultation
 * that was marked ready for review returns it to DRAFT — the doctor has to
 * re-declare it ready, so review always covers what is actually recorded.
 */
function touchContent(consultation: Consultation): Consultation {
  return {
    ...consultation,
    status: consultation.status === "READY_FOR_REVIEW" ? "DRAFT" : consultation.status,
    updatedAt: new Date().toISOString(),
  };
}

const DISPOSITION_WORDING: Record<DifferentialDisposition, string> = {
  PENDING: "not reviewed",
  ACCEPTED_FOR_CONSIDERATION: "accepted for consideration",
  REJECTED: "rejected",
  IGNORED: "ignored",
};

/**
 * Resolves the authorization snapshot from a server-issued grant id.
 *
 * The client sends an id, never an authorization claim: a request cannot assert
 * that it is authorised. A grant that does not exist, or belongs to a different
 * patient, is rejected outright.
 */
async function resolveAuthorization(
  rawGrantId: unknown,
  patientId: string,
): Promise<AuthorizationSnapshot | null> {
  const grantId = optionalText(rawGrantId);
  if (!grantId) return null;

  const grant = await accessGrantRepository.findById(grantId);
  if (!grant || grant.patient.id !== patientId) {
    throw ApiError.forbidden(
      "UNAUTHORIZED",
      "The access grant for this patient is no longer valid. Open the patient again to continue.",
    );
  }

  return {
    grantId: grant.id,
    method: grant.method,
    status: grant.authorizationStatus,
    grantedAt: grant.grantedAt,
    expiresAt: grant.expiresAt,
    appointmentId: grant.appointment?.id ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Factories                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_TREATMENT: TreatmentPlan = {
  nonPharmacological: [],
  procedures: [],
  advice: "",
};

const EMPTY_FOLLOW_UP: FollowUpPlan = {
  date: null,
  interval: "",
  reason: "",
  requiredInvestigations: [],
  medicationReview: "",
  symptomMonitoring: [],
  escalationInstructions: "",
};

async function buildInitialCaseContext(
  patientId: string,
  appointmentId: string | null,
): Promise<CurrentCaseContext> {
  const intake = appointmentId
    ? await caseIntakeRepository.findByAppointmentId(appointmentId)
    : await caseIntakeRepository.findLatestByPatientId(patientId);

  if (intake) {
    return {
      chiefComplaint: intake.chiefComplaint,
      historyOfPresentIllness: intake.historyOfPresentIllness,
      symptoms: intake.symptoms,
      symptomTimeline: intake.symptomTimeline,
      clinicalFindings: [],
      doctorNotes: "",
      additionalObservations: "",
    };
  }

  // No patient-reported intake: fall back to the booking reason so the doctor
  // starts from something rather than an empty form.
  const appointment = appointmentId ? await appointmentRepository.findById(appointmentId) : null;

  return {
    chiefComplaint: appointment?.reason ?? "",
    historyOfPresentIllness: "",
    symptoms: [],
    symptomTimeline: [],
    clinicalFindings: [],
    doctorNotes: "",
    additionalObservations: "",
  };
}

/* -------------------------------------------------------------------------- */
/* Service                                                                     */
/* -------------------------------------------------------------------------- */

export const consultationService = {
  async getById(consultationId: string): Promise<Consultation> {
    await simulateLatency();
    const consultation = await consultationRepository.findById(consultationId);
    if (!consultation) {
      throw ApiError.notFound(
        "CONSULTATION_NOT_FOUND",
        "This consultation could not be found. It may have ended with the previous session.",
      );
    }
    return consultation;
  },

  /**
   * Opens a consultation for a patient. If an unfinalized consultation already
   * exists for the same patient and appointment it is resumed instead of
   * duplicated — a doctor returning to a visit must land on the same record.
   */
  async create(input: {
    patientId: unknown;
    appointmentId?: unknown;
    consultationType?: unknown;
    accessGrantId?: unknown;
    doctor: Doctor;
  }): Promise<Consultation> {
    const patientId = requireText(input.patientId, "patientId", "A patient is required.");
    const appointmentId = optionalText(input.appointmentId);

    await simulateLatency();

    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw ApiError.notFound("PATIENT_NOT_FOUND", "Patient could not be found.");
    }

    const existing = await consultationRepository.findOpenForPatient(patientId, appointmentId);
    if (existing) return existing;

    const authorization = await resolveAuthorization(input.accessGrantId, patientId);

    const appointment = appointmentId
      ? await appointmentRepository.findById(appointmentId)
      : null;

    const now = new Date().toISOString();
    const consultation: Consultation = {
      id: createId("cons"),
      reference: await consultationRepository.nextReference(),
      patientId,
      doctorId: input.doctor.id,
      appointmentId,
      consultationType:
        optionalText(input.consultationType) ??
        appointment?.appointmentType ??
        "General Consultation",
      authorization,
      status: "ACTIVE",
      currentStep: "BRIEF",
      furthestStep: "BRIEF",
      completedSteps: [],
      caseContext: await buildInitialCaseContext(patientId, appointmentId),
      differentialReviews: [],
      diagnoses: [],
      assessmentNotes: "",
      investigations: [],
      medications: [],
      treatmentPlan: EMPTY_TREATMENT,
      followUp: EMPTY_FOLLOW_UP,
      additionalNotes: "",
      startedAt: now,
      updatedAt: now,
      finalizedAt: null,
      recordId: null,
    };

    const created = await consultationRepository.save(consultation);
    await auditService.record({
      consultationId: created.id,
      entityType: "CONSULTATION",
      entityId: created.id,
      action: "CONSULTATION_CREATED",
      summary: "Consultation " + created.reference + " opened for " + patient.fullName,
      doctor: input.doctor,
      newValue: {
        consultationType: created.consultationType,
        accessMethod: authorization?.method ?? null,
      },
    });
    return created;
  },

  /** Partial update of consultation metadata, treatment plan and free notes. */
  async patch(
    consultationId: string,
    body: Record<string, unknown>,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));
    let next: Consultation = { ...current };

    if (body.status !== undefined) {
      const status = body.status as ConsultationStatus;
      assertTransition(current.status, status);
      next.status = status;
    }

    if (body.currentStep !== undefined) {
      if (!isStep(body.currentStep)) {
        throw ApiError.validation("Unknown consultation step.", {
          currentStep: "Unknown consultation step.",
        });
      }
      next.currentStep = body.currentStep;
      next.furthestStep = furthestOf(current.furthestStep, body.currentStep);
    }

    if (body.completedStep !== undefined) {
      if (!isStep(body.completedStep)) {
        throw ApiError.validation("Unknown consultation step.", {
          completedStep: "Unknown consultation step.",
        });
      }
      const completed = new Set<ConsultationStep>(current.completedSteps);
      completed.add(body.completedStep);
      next.completedSteps = [...completed];
    }

    if (body.assessmentNotes !== undefined) {
      next.assessmentNotes = String(body.assessmentNotes ?? "");
    }

    if (body.additionalNotes !== undefined) {
      next.additionalNotes = String(body.additionalNotes ?? "");
    }

    if (body.treatmentPlan !== undefined) {
      const plan = (body.treatmentPlan ?? {}) as Partial<TreatmentPlan>;
      next.treatmentPlan = {
        nonPharmacological: stringList(plan.nonPharmacological),
        procedures: stringList(plan.procedures),
        advice: String(plan.advice ?? ""),
      };
    }

    next = touch(next);
    const saved = await consultationRepository.save(next);

    if (body.status === "READY_FOR_REVIEW" && current.status !== "READY_FOR_REVIEW") {
      await auditService.record({
        consultationId: saved.id,
        entityType: "CONSULTATION",
        entityId: saved.id,
        action: "CONSULTATION_READY_FOR_REVIEW",
        summary: "Consultation marked ready for review",
        doctor: actor,
        previousValue: { status: current.status },
        newValue: { status: saved.status },
      });
    }

    if (body.treatmentPlan !== undefined) {
      await auditService.record({
        consultationId: saved.id,
        entityType: "CONSULTATION",
        entityId: saved.id,
        action: "TREATMENT_UPDATED",
        summary: "Treatment plan updated",
        doctor: actor,
        previousValue: current.treatmentPlan,
        newValue: saved.treatmentPlan,
      });
    }

    return saved;
  },

  /** Structured case context — the fields a future intelligence layer reads. */
  async updateContext(
    consultationId: string,
    body: Partial<CurrentCaseContext>,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));

    const caseContext: CurrentCaseContext = {
      ...current.caseContext,
      ...(body.chiefComplaint !== undefined
        ? { chiefComplaint: String(body.chiefComplaint) }
        : {}),
      ...(body.historyOfPresentIllness !== undefined
        ? { historyOfPresentIllness: String(body.historyOfPresentIllness) }
        : {}),
      ...(Array.isArray(body.symptoms) ? { symptoms: body.symptoms } : {}),
      ...(Array.isArray(body.symptomTimeline)
        ? { symptomTimeline: body.symptomTimeline }
        : {}),
      ...(Array.isArray(body.clinicalFindings)
        ? { clinicalFindings: body.clinicalFindings }
        : {}),
    };

    const saved = await consultationRepository.save(touchContent({ ...current, caseContext }));
    await auditService.record({
      consultationId: saved.id,
      entityType: "CONSULTATION",
      entityId: saved.id,
      action: "CONSULTATION_UPDATED",
      summary: "Case context updated",
      doctor: actor,
    });
    return saved;
  },

  /** The doctor's narrative notes for this visit. */
  async updateNotes(
    consultationId: string,
    body: { doctorNotes?: unknown; additionalObservations?: unknown },
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));

    const caseContext: CurrentCaseContext = {
      ...current.caseContext,
      ...(body.doctorNotes !== undefined ? { doctorNotes: String(body.doctorNotes) } : {}),
      ...(body.additionalObservations !== undefined
        ? { additionalObservations: String(body.additionalObservations) }
        : {}),
    };

    const saved = await consultationRepository.save(touchContent({ ...current, caseContext }));
    await auditService.record({
      consultationId: saved.id,
      entityType: "CONSULTATION",
      entityId: saved.id,
      action: "CONSULTATION_NOTES_UPDATED",
      summary: "Consultation notes updated",
      doctor: actor,
    });
    return saved;
  },

  /**
   * Records how the doctor dispositioned suggested differentials. This lives on
   * the consultation because it is a doctor decision, not intelligence output.
   */
  async reviewDifferential(
    consultationId: string,
    body: Record<string, unknown>,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));

    const differentialId = requireText(
      body.differentialId,
      "differentialId",
      "A differential is required.",
    );
    const condition = requireText(body.condition, "condition", "A condition is required.");
    const disposition = body.disposition as DifferentialReview["disposition"];

    if (
      disposition !== "PENDING" &&
      disposition !== "ACCEPTED_FOR_CONSIDERATION" &&
      disposition !== "REJECTED" &&
      disposition !== "IGNORED"
    ) {
      throw ApiError.validation("Unknown disposition.", {
        disposition: "Unknown disposition.",
      });
    }

    const review: DifferentialReview = {
      differentialId,
      condition,
      disposition,
      doctorNote: optionalText(body.doctorNote),
      reviewedAt: new Date().toISOString(),
    };

    const differentialReviews = [
      ...current.differentialReviews.filter((entry) => entry.differentialId !== differentialId),
      review,
    ];

    const saved = await consultationRepository.save(
      touchContent({ ...current, differentialReviews }),
    );
    await auditService.record({
      consultationId: saved.id,
      entityType: "DIFFERENTIAL",
      entityId: differentialId,
      action: "DIFFERENTIAL_REVIEWED",
      summary: "Differential \"" + condition + "\" marked " + DISPOSITION_WORDING[disposition],
      doctor: actor,
      previousValue: current.differentialReviews.find(
        (entry) => entry.differentialId === differentialId,
      ),
      newValue: review,
    });
    return saved;
  },

  /** Replaces the doctor's assessment. Always authored by the doctor. */
  async setDiagnoses(
    consultationId: string,
    body: Record<string, unknown>,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));
    const input = Array.isArray(body.diagnoses) ? body.diagnoses : [];

    const diagnoses: Diagnosis[] = input.map((raw, index) => {
      const entry = (raw ?? {}) as Record<string, unknown>;
      const condition = requireText(
        entry.condition,
        "condition",
        "Each assessment needs a condition.",
      );
      const certainty = entry.certainty as Diagnosis["certainty"];

      return {
        id: optionalText(entry.id) ?? createId("dx"),
        condition,
        certainty:
          certainty === "PROVISIONAL" || certainty === "WORKING" || certainty === "CONFIRMED"
            ? certainty
            : "PROVISIONAL",
        isPrimary: entry.isPrimary === true || (index === 0 && input.length === 1),
        notes: optionalText(entry.notes),
        decidedBy: "DOCTOR",
        decidedAt: optionalText(entry.decidedAt) ?? new Date().toISOString(),
        derivedFromDifferentialId: optionalText(entry.derivedFromDifferentialId),
      };
    });

    // Exactly one primary assessment, defaulting to the first entry.
    const hasPrimary = diagnoses.some((diagnosis) => diagnosis.isPrimary);
    const normalized = diagnoses.map((diagnosis, index) => ({
      ...diagnosis,
      isPrimary: hasPrimary ? diagnosis.isPrimary : index === 0,
    }));

    const assessmentNotes =
      body.assessmentNotes !== undefined
        ? String(body.assessmentNotes)
        : current.assessmentNotes;

    const saved = await consultationRepository.save(
      touchContent({ ...current, diagnoses: normalized, assessmentNotes }),
    );
    await auditService.record({
      consultationId: saved.id,
      entityType: "DIAGNOSIS",
      entityId: saved.id,
      action: "DIAGNOSIS_SELECTED",
      summary: normalized.length
        ? "Assessment recorded: " + normalized.map((entry) => entry.condition).join(", ")
        : "Assessment cleared",
      doctor: actor,
      previousValue: current.diagnoses,
      newValue: normalized,
    });
    return saved;
  },

  async addInvestigation(
    consultationId: string,
    body: Record<string, unknown>,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));
    const name = requireText(body.name, "name", "An investigation name is required.");
    const urgency = body.urgency as SelectedInvestigation["urgency"];

    const investigation: SelectedInvestigation = {
      id: createId("inv"),
      name,
      purpose: optionalText(body.purpose),
      clinicalQuestion: optionalText(body.clinicalQuestion),
      notes: optionalText(body.notes),
      urgency: urgency === "URGENT" || urgency === "STAT" ? urgency : "ROUTINE",
      selectedBy: "DOCTOR",
      selectedAt: new Date().toISOString(),
      fromSuggestionId: optionalText(body.fromSuggestionId),
    };

    const saved = await consultationRepository.save(
      touchContent({ ...current, investigations: [...current.investigations, investigation] }),
    );
    await auditService.record({
      consultationId: saved.id,
      entityType: "INVESTIGATION",
      entityId: investigation.id,
      action: "INVESTIGATION_ADDED",
      summary: "Investigation added: " + investigation.name,
      doctor: actor,
      newValue: investigation,
      metadata: { fromSuggestion: Boolean(investigation.fromSuggestionId) },
    });
    return saved;
  },

  async updateInvestigation(
    consultationId: string,
    investigationId: string,
    body: Record<string, unknown>,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));
    const existing = current.investigations.find((entry) => entry.id === investigationId);
    if (!existing) {
      throw ApiError.notFound("INVESTIGATION_NOT_FOUND", "This investigation is no longer listed.");
    }

    const urgency = body.urgency as SelectedInvestigation["urgency"];
    const updated: SelectedInvestigation = {
      ...existing,
      ...(body.name !== undefined
        ? { name: requireText(body.name, "name", "An investigation name is required.") }
        : {}),
      ...(body.purpose !== undefined ? { purpose: optionalText(body.purpose) } : {}),
      ...(body.clinicalQuestion !== undefined
        ? { clinicalQuestion: optionalText(body.clinicalQuestion) }
        : {}),
      ...(body.notes !== undefined ? { notes: optionalText(body.notes) } : {}),
      ...(urgency === "ROUTINE" || urgency === "URGENT" || urgency === "STAT"
        ? { urgency }
        : {}),
    };

    const saved = await consultationRepository.save(
      touchContent({
        ...current,
        investigations: current.investigations.map((entry) =>
          entry.id === investigationId ? updated : entry,
        ),
      }),
    );
    await auditService.record({
      consultationId: saved.id,
      entityType: "INVESTIGATION",
      entityId: investigationId,
      action: "INVESTIGATION_UPDATED",
      summary: "Investigation updated: " + updated.name,
      doctor: actor,
      previousValue: existing,
      newValue: updated,
    });
    return saved;
  },

  async removeInvestigation(
    consultationId: string,
    investigationId: string,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));
    if (!current.investigations.some((entry) => entry.id === investigationId)) {
      throw ApiError.notFound("INVESTIGATION_NOT_FOUND", "This investigation is no longer listed.");
    }

    const removed = current.investigations.find((entry) => entry.id === investigationId);
    const saved = await consultationRepository.save(
      touchContent({
        ...current,
        investigations: current.investigations.filter((entry) => entry.id !== investigationId),
      }),
    );
    await auditService.record({
      consultationId: saved.id,
      entityType: "INVESTIGATION",
      entityId: investigationId,
      action: "INVESTIGATION_REMOVED",
      summary: "Investigation removed: " + (removed?.name ?? investigationId),
      doctor: actor,
      previousValue: removed,
    });
    return saved;
  },

  async addMedication(
    consultationId: string,
    body: Record<string, unknown>,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));

    const medication: Medication = {
      id: createId("med"),
      name: requireText(body.name, "name", "A medication name is required."),
      dosage: requireText(body.dosage, "dosage", "A dosage is required."),
      frequency: requireText(body.frequency, "frequency", "A frequency is required."),
      duration: requireText(body.duration, "duration", "A duration is required."),
      route: optionalText(body.route),
      instructions: optionalText(body.instructions),
      prescribedBy: "DOCTOR",
      addedAt: new Date().toISOString(),
    };

    const saved = await consultationRepository.save(
      touchContent({ ...current, medications: [...current.medications, medication] }),
    );
    await auditService.record({
      consultationId: saved.id,
      entityType: "MEDICATION",
      entityId: medication.id,
      action: "MEDICATION_ADDED",
      summary: "Medication added: " + medication.name + " " + medication.dosage,
      doctor: actor,
      newValue: medication,
    });
    return saved;
  },

  async updateMedication(
    consultationId: string,
    medicationId: string,
    body: Record<string, unknown>,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));
    const existing = current.medications.find((entry) => entry.id === medicationId);
    if (!existing) {
      throw ApiError.notFound("MEDICATION_NOT_FOUND", "This medication is no longer listed.");
    }

    const updated: Medication = {
      ...existing,
      ...(body.name !== undefined
        ? { name: requireText(body.name, "name", "A medication name is required.") }
        : {}),
      ...(body.dosage !== undefined
        ? { dosage: requireText(body.dosage, "dosage", "A dosage is required.") }
        : {}),
      ...(body.frequency !== undefined
        ? { frequency: requireText(body.frequency, "frequency", "A frequency is required.") }
        : {}),
      ...(body.duration !== undefined
        ? { duration: requireText(body.duration, "duration", "A duration is required.") }
        : {}),
      ...(body.route !== undefined ? { route: optionalText(body.route) } : {}),
      ...(body.instructions !== undefined
        ? { instructions: optionalText(body.instructions) }
        : {}),
    };

    const saved = await consultationRepository.save(
      touchContent({
        ...current,
        medications: current.medications.map((entry) =>
          entry.id === medicationId ? updated : entry,
        ),
      }),
    );
    await auditService.record({
      consultationId: saved.id,
      entityType: "MEDICATION",
      entityId: medicationId,
      action: "MEDICATION_UPDATED",
      summary: "Medication updated: " + updated.name,
      doctor: actor,
      previousValue: existing,
      newValue: updated,
    });
    return saved;
  },

  async removeMedication(
    consultationId: string,
    medicationId: string,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));
    if (!current.medications.some((entry) => entry.id === medicationId)) {
      throw ApiError.notFound("MEDICATION_NOT_FOUND", "This medication is no longer listed.");
    }

    const removed = current.medications.find((entry) => entry.id === medicationId);
    const saved = await consultationRepository.save(
      touchContent({
        ...current,
        medications: current.medications.filter((entry) => entry.id !== medicationId),
      }),
    );
    await auditService.record({
      consultationId: saved.id,
      entityType: "MEDICATION",
      entityId: medicationId,
      action: "MEDICATION_REMOVED",
      summary: "Medication removed: " + (removed?.name ?? medicationId),
      doctor: actor,
      previousValue: removed,
    });
    return saved;
  },

  async setFollowUp(
    consultationId: string,
    body: Record<string, unknown>,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = assertMutable(await this.getById(consultationId));

    const followUp: FollowUpPlan = {
      date: optionalText(body.date),
      interval: String(body.interval ?? ""),
      reason: String(body.reason ?? ""),
      requiredInvestigations: stringList(body.requiredInvestigations),
      medicationReview: String(body.medicationReview ?? ""),
      symptomMonitoring: stringList(body.symptomMonitoring),
      escalationInstructions: String(body.escalationInstructions ?? ""),
    };

    const saved = await consultationRepository.save(touchContent({ ...current, followUp }));
    await auditService.record({
      consultationId: saved.id,
      entityType: "FOLLOW_UP",
      entityId: saved.id,
      action: "FOLLOW_UP_CREATED",
      summary: followUp.date
        ? "Follow-up planned for " + followUp.date
        : followUp.interval
          ? "Follow-up planned in " + followUp.interval
          : "Follow-up plan updated",
      doctor: actor,
      previousValue: current.followUp,
      newValue: followUp,
    });
    return saved;
  },

  /**
   * The review workspace. `finalization` is the server's own assessment of
   * whether this consultation can be closed — the client renders it but never
   * decides it. Finalization itself lives in `consultation-record.service`,
   * which owns the snapshot transaction.
   */
  async getSummary(consultationId: string): Promise<ConsultationSummary> {
    const consultation = await this.getById(consultationId);
    const patientContext = await patientContextService.getByPatientId(consultation.patientId);
    const finalization = await consultationRecordService.assessReadiness(consultation);

    return {
      consultation,
      patientContext,
      consideredDifferentials: consultation.differentialReviews
        .filter((review) => review.disposition === "ACCEPTED_FOR_CONSIDERATION")
        .sort((a, b) => a.condition.localeCompare(b.condition)),
      finalization,
    };
  },
};

/** Exported for the controller layer's step validation. */
export { stepIndex };
