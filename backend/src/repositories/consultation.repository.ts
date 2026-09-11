import type { Consultation, CurrentCaseContext } from "../domain/types";
import { patientApi, recall, remember } from "../lib/patient-api";
import { ApiError } from "../lib/api-error";
import type { RemoteClinicalState, RemoteConsultation } from "../lib/remote-mapping";
import { toClinicalState, toClinicalStatePayload } from "../lib/remote-mapping";

/**
 * Consultations.
 *
 * There is no overlay any more. Identity, authorization, the patient-reported
 * intake AND everything the doctor writes after the brief — assessment,
 * diagnoses, investigations, medications, treatment, follow-up and the
 * decisions taken against platform output — are all rows in the patient
 * platform's PostgreSQL schema.
 *
 * A restart, a redeploy or a doctor returning tomorrow all find the same
 * consultation. Nothing clinical is held in this process.
 *
 * Concurrency: `findById` remembers the version it read for the life of the
 * request, and `save` claims it. Two clinicians editing the same consultation
 * no longer silently overwrite each other — the later save is refused and the
 * doctor is told to reload.
 */

const EMPTY_TREATMENT: Consultation["treatmentPlan"] = {
  nonPharmacological: [],
  procedures: [],
  advice: "",
};

const EMPTY_FOLLOW_UP: Consultation["followUp"] = {
  date: null,
  interval: "",
  reason: "",
  requiredInvestigations: [],
  medicationReview: "",
  symptomMonitoring: [],
  escalationInstructions: "",
};

const versionKey = (id: string) => `consultation:version:${id}`;

function toConsultation(
  remote: RemoteConsultation,
  clinical: RemoteClinicalState | null,
): Consultation {
  const state = clinical ? toClinicalState(clinical) : null;

  if (clinical) remember(versionKey(remote.id), clinical.version);

  const caseContext: CurrentCaseContext = {
    chiefComplaint: remote.caseContext.chiefComplaint,
    historyOfPresentIllness: remote.caseContext.historyOfPresentIllness,
    symptoms: remote.caseContext.symptoms.map((s) => ({
      id: s.id,
      name: s.name,
      duration: s.duration ?? "",
      severity: s.severity,
      notes: s.notes ?? "",
    })),
    symptomTimeline: remote.caseContext.symptomTimeline.map((e) => ({
      id: e.id,
      label: e.label,
      date: e.date ?? "",
      description: e.description ?? "",
      source: e.source,
    })),
    // Examination findings and the doctor's own narrative are part of the
    // durable clinical record, not of the patient-reported intake.
    clinicalFindings: state?.clinicalFindings ?? [],
    doctorNotes: state?.doctorNotes ?? "",
    additionalObservations: state?.additionalObservations ?? "",
  };

  return {
    id: remote.id,
    reference: remote.reference,
    patientId: remote.patientId,
    doctorId: remote.doctorId,
    appointmentId: remote.appointmentId,
    consultationType: remote.consultationType,
    authorization: remote.accessGrantId
      ? {
          grantId: remote.accessGrantId,
          method: "ACCESS_CODE",
          status: "AUTHORIZED",
          grantedAt: remote.consultedAt,
          expiresAt: null,
          appointmentId: remote.appointmentId,
        }
      : null,
    // The platform row is authoritative for the lifecycle position.
    status: (state?.status ?? remote.status) as Consultation["status"],
    currentStep: (state?.currentStep ?? remote.currentStep) as Consultation["currentStep"],
    furthestStep: (state?.furthestStep ?? remote.furthestStep) as Consultation["furthestStep"],
    completedSteps: state?.completedSteps ?? [],
    caseContext,
    doctorDecisions: state?.doctorDecisions ?? [],
    diagnoses: state?.diagnoses ?? [],
    assessmentNotes: state?.assessmentNotes ?? "",
    investigations: state?.investigations ?? [],
    medications: state?.medications ?? [],
    treatmentPlan: state?.treatmentPlan ?? EMPTY_TREATMENT,
    followUp: state?.followUp ?? EMPTY_FOLLOW_UP,
    additionalNotes: state?.additionalNotes ?? "",
    startedAt: state?.startedAt ?? remote.consultedAt,
    updatedAt: state?.updatedAt ?? remote.consultedAt,
    finalizedAt: state?.finalizedAt ?? remote.finalizedAt,
    // A finalized consultation IS the record; it is its own reference.
    recordId: state?.finalizedAt ? remote.id : null,
  };
}

interface ConsultationEnvelope {
  consultation: RemoteConsultation;
  clinicalState: RemoteClinicalState | null;
}

export const consultationRepository = {
  async findById(id: string): Promise<Consultation | null> {
    const body = await patientApi.getOnce<ConsultationEnvelope>(
      `/api/doctor/consultations/${encodeURIComponent(id)}`,
    );
    return body.consultation ? toConsultation(body.consultation, body.clinicalState) : null;
  },

  /**
   * Opens a visit, or resumes the one already open for it.
   *
   * Resume-or-create is decided upstream inside one statement, guarded by a
   * unique index on the appointment — two tabs opening the same visit converge
   * on one record instead of racing to create two.
   */
  async createOrResume(input: {
    patientId: string;
    appointmentId: string | null;
    accessGrantId: string | null;
  }): Promise<{ consultation: Consultation; resumed: boolean }> {
    const body = await patientApi.post<ConsultationEnvelope & { resumed: boolean }>(
      "/api/doctor/consultations",
      {
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        grantId: input.accessGrantId,
      },
    );
    return {
      consultation: toConsultation(body.consultation, body.clinicalState),
      resumed: body.resumed,
    };
  },

  /**
   * Persists the doctor's clinical state.
   *
   * The whole aggregate goes up, as it always has. Upstream it lands in one
   * transaction with the consultation row locked, so concurrent saves
   * serialise instead of interleaving, and the version claimed here turns a
   * stale write into a refusal rather than a silent overwrite.
   */
  async save(consultation: Consultation): Promise<Consultation> {
    const body = await patientApi.put<{ clinicalState: RemoteClinicalState }>(
      `/api/doctor/consultations/${encodeURIComponent(consultation.id)}/clinical-state`,
      {
        expectedVersion: recall<number>(versionKey(consultation.id)) ?? null,
        state: toClinicalStatePayload(consultation),
      },
    );

    remember(versionKey(consultation.id), body.clinicalState.version);

    // The identity half of the consultation is untouched by a save, so the
    // request-memoised read is still correct for it; the clinical half is the
    // response we just received. Re-fetching would hit that same memo and
    // hand back the pre-save state.
    const envelope = await patientApi.getOnce<ConsultationEnvelope>(
      `/api/doctor/consultations/${encodeURIComponent(consultation.id)}`,
    );
    if (!envelope.consultation) {
      throw ApiError.notFound("CONSULTATION_NOT_FOUND", "This consultation could not be found.");
    }
    return toConsultation(envelope.consultation, body.clinicalState);
  },

  /**
   * Closes the consultation.
   *
   * One upstream transaction: the pending state is written, a follow-up task
   * is raised into the care journey when the doctor recorded one, and only
   * then does the status move. There is no moment at which a half-finalized
   * consultation exists.
   */
  async finalize(
    consultation: Consultation,
    outcome: string,
  ): Promise<{ consultation: Consultation; alreadyFinalized: boolean }> {
    const body = await patientApi.post<{
      clinicalState: RemoteClinicalState;
      alreadyFinalized: boolean;
    }>(`/api/doctor/consultations/${encodeURIComponent(consultation.id)}/finalize`, {
      expectedVersion: recall<number>(versionKey(consultation.id)) ?? null,
      state: toClinicalStatePayload(consultation),
      outcome,
    });

    remember(versionKey(consultation.id), body.clinicalState.version);

    const envelope = await patientApi.getOnce<ConsultationEnvelope>(
      `/api/doctor/consultations/${encodeURIComponent(consultation.id)}`,
    );
    if (!envelope.consultation) {
      throw ApiError.notFound("CONSULTATION_NOT_FOUND", "This consultation could not be found.");
    }
    return {
      consultation: toConsultation(envelope.consultation, body.clinicalState),
      alreadyFinalized: body.alreadyFinalized,
    };
  },
};
