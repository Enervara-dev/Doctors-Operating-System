"use client";

import { create } from "zustand";
import {
  consultationsApi,
  type ConsultationPatch,
  type DiagnosisInput,
  type DifferentialReviewInput,
  type InvestigationInput,
  type MedicationInput,
} from "@/features/consultations/consultations.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type {
  Consultation,
  ConsultationRecord,
  ConsultationStep,
  CurrentCaseContext,
  FollowUpPlan,
  TreatmentPlan,
} from "@/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

/** What the header tells the doctor about the state of their work. */
export type SaveState = "IDLE" | "UNSAVED" | "SAVING" | "SAVED" | "ERROR";

/**
 * A step registers how to persist its own pending edits so the always-visible
 * "Save draft" control, and "Save & continue", can flush them without the shell
 * knowing anything about the current step's form.
 */
type StepSaver = () => Promise<boolean>;

interface ConsultationState {
  consultation: Consultation | null;
  status: LoadStatus;
  failure: RequestFailure | null;

  saveState: SaveState;
  saveFailure: RequestFailure | null;
  lastSavedAt: string | null;

  stepSaver: StepSaver | null;

  load: (consultationId: string, options?: { force?: boolean }) => Promise<void>;
  start: (input: {
    patientId: string;
    appointmentId?: string | null;
    consultationType?: string;
    accessGrantId?: string | null;
  }) => Promise<Consultation | null>;

  /** Marks the workspace dirty when a step's local form diverges from the server. */
  markUnsaved: () => void;
  registerStepSaver: (saver: StepSaver | null) => void;
  /** Flushes the active step's pending edits. Returns false if the save failed. */
  saveDraft: () => Promise<boolean>;

  patch: (patch: ConsultationPatch) => Promise<boolean>;
  goToStep: (step: ConsultationStep, options?: { completing?: ConsultationStep }) => Promise<boolean>;

  saveContext: (context: Partial<CurrentCaseContext>) => Promise<boolean>;
  saveNotes: (notes: { doctorNotes?: string; additionalObservations?: string }) => Promise<boolean>;
  reviewDifferential: (review: DifferentialReviewInput) => Promise<boolean>;
  saveDiagnoses: (diagnoses: DiagnosisInput[], assessmentNotes: string) => Promise<boolean>;

  addInvestigation: (input: InvestigationInput) => Promise<boolean>;
  updateInvestigation: (id: string, input: Partial<InvestigationInput>) => Promise<boolean>;
  removeInvestigation: (id: string) => Promise<boolean>;

  addMedication: (input: MedicationInput) => Promise<boolean>;
  updateMedication: (id: string, input: Partial<MedicationInput>) => Promise<boolean>;
  removeMedication: (id: string) => Promise<boolean>;

  saveTreatment: (plan: TreatmentPlan, advice?: string) => Promise<boolean>;
  saveFollowUp: (followUp: FollowUpPlan) => Promise<boolean>;
  /**
   * Runs the finalization transaction. Returns the record on success — the
   * server decides whether the consultation could be closed, not this store.
   */
  finalize: () => Promise<ConsultationRecord | null>;

  clearSaveFailure: () => void;
  reset: () => void;
}

const INITIAL = {
  consultation: null,
  status: "idle" as LoadStatus,
  failure: null,
  saveState: "IDLE" as SaveState,
  saveFailure: null,
  lastSavedAt: null,
  stepSaver: null,
};

export const useConsultationStore = create<ConsultationState>()((set, get) => {
  /**
   * Every write funnels through here: one place owns the SAVING -> SAVED/ERROR
   * transition and the replacement of the local aggregate with the server's.
   */
  async function mutate(
    operation: (consultationId: string) => Promise<Consultation>,
  ): Promise<boolean> {
    const consultation = get().consultation;
    if (!consultation) return false;

    set({ saveState: "SAVING", saveFailure: null });
    try {
      const updated = await operation(consultation.id);
      set({
        consultation: updated,
        saveState: "SAVED",
        saveFailure: null,
        lastSavedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      set({ saveState: "ERROR", saveFailure: toRequestFailure(error) });
      return false;
    }
  }

  return {
    ...INITIAL,

    async load(consultationId, options) {
      const { consultation, status } = get();
      if (status === "loading") return;
      if (!options?.force && consultation?.id === consultationId && status === "ready") return;

      set({ status: "loading", failure: null });
      try {
        const loaded = await consultationsApi.getById(consultationId);
        set({
          consultation: loaded,
          status: "ready",
          failure: null,
          saveState: "IDLE",
          saveFailure: null,
        });
      } catch (error) {
        set({ status: "error", failure: toRequestFailure(error) });
      }
    },

    async start(input) {
      set({ status: "loading", failure: null });
      try {
        const created = await consultationsApi.create(input);
        set({
          consultation: created,
          status: "ready",
          failure: null,
          saveState: "IDLE",
          saveFailure: null,
        });
        return created;
      } catch (error) {
        set({ status: "error", failure: toRequestFailure(error) });
        return null;
      }
    },

    markUnsaved() {
      if (get().saveState !== "SAVING") set({ saveState: "UNSAVED" });
    },

    registerStepSaver(saver) {
      set({ stepSaver: saver });
    },

    async saveDraft() {
      const saver = get().stepSaver;
      if (!saver) {
        // Nothing pending on this step — reflect that the record is up to date.
        set({ saveState: "SAVED", lastSavedAt: new Date().toISOString() });
        return true;
      }
      return saver();
    },

    patch(patch) {
      return mutate((id) => consultationsApi.patch(id, patch));
    },

    goToStep(step, options) {
      return mutate((id) =>
        consultationsApi.patch(id, {
          currentStep: step,
          ...(options?.completing ? { completedStep: options.completing } : {}),
        }),
      );
    },

    saveContext(context) {
      return mutate((id) => consultationsApi.updateContext(id, context));
    },

    saveNotes(notes) {
      return mutate((id) => consultationsApi.updateNotes(id, notes));
    },

    reviewDifferential(review) {
      return mutate((id) => consultationsApi.reviewDifferential(id, review));
    },

    saveDiagnoses(diagnoses, assessmentNotes) {
      return mutate((id) => consultationsApi.setDiagnoses(id, { diagnoses, assessmentNotes }));
    },

    addInvestigation(input) {
      return mutate((id) => consultationsApi.addInvestigation(id, input));
    },

    updateInvestigation(investigationId, input) {
      return mutate((id) => consultationsApi.updateInvestigation(id, investigationId, input));
    },

    removeInvestigation(investigationId) {
      return mutate((id) => consultationsApi.removeInvestigation(id, investigationId));
    },

    addMedication(input) {
      return mutate((id) => consultationsApi.addMedication(id, input));
    },

    updateMedication(medicationId, input) {
      return mutate((id) => consultationsApi.updateMedication(id, medicationId, input));
    },

    removeMedication(medicationId) {
      return mutate((id) => consultationsApi.removeMedication(id, medicationId));
    },

    saveTreatment(plan, advice) {
      return mutate((id) =>
        consultationsApi.patch(id, {
          treatmentPlan: plan,
          ...(advice === undefined ? {} : { additionalNotes: advice }),
        }),
      );
    },

    saveFollowUp(followUp) {
      return mutate((id) => consultationsApi.setFollowUp(id, followUp));
    },

    async finalize() {
      const consultation = get().consultation;
      if (!consultation) return null;

      set({ saveState: "SAVING", saveFailure: null });
      try {
        const result = await consultationsApi.finalize(consultation.id);
        // Re-read the consultation so its FINALIZED state and record link are
        // the server's, not a locally assumed one.
        const refreshed = await consultationsApi.getById(consultation.id);
        set({
          consultation: refreshed,
          saveState: "SAVED",
          saveFailure: null,
          lastSavedAt: new Date().toISOString(),
        });
        return result.record;
      } catch (error) {
        set({ saveState: "ERROR", saveFailure: toRequestFailure(error) });
        return null;
      }
    },

    clearSaveFailure() {
      set({ saveFailure: null, saveState: "IDLE" });
    },

    reset() {
      set({ ...INITIAL });
    },
  };
});

export const selectIsFinalized = (state: ConsultationState): boolean =>
  state.consultation?.status === "FINALIZED";

/** Editing is blocked once the record is closed. */
export const selectIsEditable = (state: ConsultationState): boolean =>
  Boolean(state.consultation) && state.consultation?.status !== "FINALIZED";
