import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  Consultation,
  ConsultationRecord,
  FinalizationResult,
  ConsultationStatus,
  ConsultationStep,
  ConsultationSummary,
  CurrentCaseContext,
  DifferentialDisposition,
  FollowUpPlan,
  InvestigationUrgency,
  TreatmentPlan,
} from "@/types";

export interface ConsultationPatch {
  status?: ConsultationStatus;
  currentStep?: ConsultationStep;
  completedStep?: ConsultationStep;
  assessmentNotes?: string;
  additionalNotes?: string;
  treatmentPlan?: TreatmentPlan;
}

export interface DiagnosisInput {
  id?: string;
  condition: string;
  certainty: "PROVISIONAL" | "WORKING" | "CONFIRMED";
  isPrimary: boolean;
  notes?: string | null;
  derivedFromDifferentialId?: string | null;
}

export interface InvestigationInput {
  name: string;
  purpose?: string | null;
  clinicalQuestion?: string | null;
  notes?: string | null;
  urgency?: InvestigationUrgency;
  fromSuggestionId?: string | null;
}

export interface MedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string | null;
  instructions?: string | null;
}

export interface DifferentialReviewInput {
  differentialId: string;
  condition: string;
  disposition: DifferentialDisposition;
  doctorNote?: string | null;
}

/** Every consultation write returns the whole updated aggregate. */
export const consultationsApi = {
  create(input: {
    patientId: string;
    appointmentId?: string | null;
    consultationType?: string;
    /** Server-issued grant id; the API resolves authorization from it. */
    accessGrantId?: string | null;
  }): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.create, {
      method: "POST",
      body: input,
    });
  },

  getById(id: string, signal?: AbortSignal): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.byId(id), { signal });
  },

  patch(id: string, patch: ConsultationPatch): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.byId(id), {
      method: "PATCH",
      body: patch,
    });
  },

  updateContext(id: string, context: Partial<CurrentCaseContext>): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.context(id), {
      method: "PATCH",
      body: context,
    });
  },

  updateNotes(
    id: string,
    notes: { doctorNotes?: string; additionalObservations?: string },
  ): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.notes(id), {
      method: "POST",
      body: notes,
    });
  },

  reviewDifferential(id: string, review: DifferentialReviewInput): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.differentialReviews(id), {
      method: "POST",
      body: review,
    });
  },

  setDiagnoses(
    id: string,
    payload: { diagnoses: DiagnosisInput[]; assessmentNotes?: string },
  ): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.diagnosis(id), {
      method: "POST",
      body: payload,
    });
  },

  addInvestigation(id: string, input: InvestigationInput): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.investigations(id), {
      method: "POST",
      body: input,
    });
  },

  updateInvestigation(
    id: string,
    investigationId: string,
    input: Partial<InvestigationInput>,
  ): Promise<Consultation> {
    return apiRequest<Consultation>(
      endpoints.consultations.investigation(id, investigationId),
      { method: "PATCH", body: input },
    );
  },

  removeInvestigation(id: string, investigationId: string): Promise<Consultation> {
    return apiRequest<Consultation>(
      endpoints.consultations.investigation(id, investigationId),
      { method: "DELETE" },
    );
  },

  addMedication(id: string, input: MedicationInput): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.medications(id), {
      method: "POST",
      body: input,
    });
  },

  updateMedication(
    id: string,
    medicationId: string,
    input: Partial<MedicationInput>,
  ): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.medication(id, medicationId), {
      method: "PATCH",
      body: input,
    });
  },

  removeMedication(id: string, medicationId: string): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.medication(id, medicationId), {
      method: "DELETE",
    });
  },

  setFollowUp(id: string, followUp: FollowUpPlan): Promise<Consultation> {
    return apiRequest<Consultation>(endpoints.consultations.followUp(id), {
      method: "POST",
      body: followUp,
    });
  },

  finalize(id: string): Promise<FinalizationResult> {
    return apiRequest<FinalizationResult>(endpoints.consultations.finalize(id), {
      method: "POST",
    });
  },

  getRecord(id: string, signal?: AbortSignal): Promise<ConsultationRecord> {
    return apiRequest<ConsultationRecord>(endpoints.consultations.record(id), { signal });
  },

  getSummary(id: string, signal?: AbortSignal): Promise<ConsultationSummary> {
    return apiRequest<ConsultationSummary>(endpoints.consultations.summary(id), { signal });
  },
};
