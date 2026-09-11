import type {
  Consultation,
  ConsultationStatus,
  ConsultationStep,
  ConsultationSummary,
  CurrentCaseContext,
  Diagnosis,
  Doctor,
  FollowUpPlan,
  Medication,
  SelectedInvestigation,
  TreatmentPlan,
} from "../domain/types";
import { ApiError } from "../lib/api-error";
import { assertTransition, isConsultationStatus } from "../lib/consultation-status";
import { furthestOf, isStep, stepIndex } from "../lib/consultation-steps";
import { createId } from "../lib/id";
import { consultationRepository } from "../repositories/consultation.repository";
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
 * Applied to every change that alters clinical content. Correcting a
 * consultation that is already in REVIEW is normal reviewing, so the status is
 * left alone; readiness is re-evaluated by the server on every read.
 */
const touchContent = touch;

/* -------------------------------------------------------------------------- */
/* Factories                                                                   */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Service                                                                     */
/* -------------------------------------------------------------------------- */

export const consultationService = {
  async getById(consultationId: string): Promise<Consultation> {
    const consultation = await consultationRepository.findById(consultationId);
    if (!consultation) {
      throw ApiError.notFound(
        "CONSULTATION_NOT_FOUND",
        "This consultation could not be found. It may have ended with the previous session.",
      );
    }
    // Decisions arrive with the consultation: they are rows on the same
    // aggregate. Re-reading them here would now be a second round trip for
    // data already in hand — and, while the decision repository reads through
    // this same method, a cycle.
    return consultation;
  },

  /**
   * Moves the clinical lifecycle. The backend owns this transition — the
   * frontend reflects state, it never asserts it.
   */
  async setStatus(
    consultationId: string,
    status: ConsultationStatus,
    actor: Doctor,
  ): Promise<Consultation> {
    const current = await this.getById(consultationId);
    if (current.status === status) return current;

    assertTransition(current.status, status);
    const saved = await consultationRepository.save(
      touch({ ...current, status }),
    );

    if (status === "REVIEW") {
      await auditService.record({
        consultationId: saved.id,
        entityType: "CONSULTATION",
        entityId: saved.id,
        action: "CONSULTATION_READY_FOR_REVIEW",
        summary: "Consultation moved to review",
        doctor: actor,
        previousValue: { status: current.status },
        newValue: { status: saved.status },
      });
    }

    return saved;
  },

  /**
   * Opens a consultation, or resumes the one already open for this visit.
   *
   * Both the decision and the record now belong to the patient platform: it
   * resolves the access grant, attaches the patient-reported intake, mints the
   * reference and enforces one-consultation-per-appointment with a unique
   * index. A doctor who returns to a visit lands on the same row even after
   * this process has restarted, which the in-memory implementation could not
   * promise.
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

    const { consultation, resumed } = await consultationRepository.createOrResume({
      patientId,
      appointmentId,
      accessGrantId: optionalText(input.accessGrantId),
    });

    // The platform writes its own audit row for both outcomes. This one is the
    // clinician-facing trail shown beside the record, and a resumed visit is
    // not a new consultation, so it is not recorded as one.
    if (!resumed) {
      await auditService.record({
        consultationId: consultation.id,
        entityType: "CONSULTATION",
        entityId: consultation.id,
        action: "CONSULTATION_CREATED",
        summary: "Consultation " + consultation.reference + " opened",
        doctor: input.doctor,
        newValue: {
          consultationType: consultation.consultationType,
          accessMethod: consultation.authorization?.method ?? null,
        },
      });
    }

    return consultation;
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
      if (!isConsultationStatus(body.status)) {
        throw ApiError.validation("Unknown consultation status.", {
          status: "Unknown consultation status.",
        });
      }
      assertTransition(current.status, body.status);
      next.status = body.status;
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

    if (body.status === "REVIEW" && current.status !== "REVIEW") {
      await auditService.record({
        consultationId: saved.id,
        entityType: "CONSULTATION",
        entityId: saved.id,
        action: "CONSULTATION_READY_FOR_REVIEW",
        summary: "Consultation moved to review",
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
      acceptedConsiderations: consultation.doctorDecisions
        .filter(
          (decision) =>
            decision.subject === "CLINICAL_CONSIDERATION" &&
            decision.outcome === "ACCEPTED_FOR_CONSIDERATION",
        )
        .sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel)),
      finalization,
    };
  },
};

/** Exported for the controller layer's step validation. */
export { stepIndex };
