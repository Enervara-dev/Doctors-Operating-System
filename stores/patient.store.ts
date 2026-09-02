"use client";

import { create } from "zustand";
import { patientAccessApi } from "@/features/patient-access/patient-access.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type {
  AccessMethod,
  AuthorizationStatus,
  Patient,
  PatientAccessGrant,
} from "@/types";

type AccessStatus = "idle" | "validating";

interface PatientState {
  /**
   * The active access grant. It is deliberately not persisted: an
   * authorization to view a patient is a session act, not a bookmarkable URL.
   */
  grant: PatientAccessGrant | null;
  status: AccessStatus;
  failure: RequestFailure | null;

  accessByCode: (code: string) => Promise<PatientAccessGrant | null>;
  accessByLink: (link: string) => Promise<PatientAccessGrant | null>;
  accessByAppointment: (appointmentId: string) => Promise<PatientAccessGrant | null>;
  setSelectedPatient: (grant: PatientAccessGrant) => void;
  clearAccess: () => void;
  clearFailure: () => void;
}

function createAccessAction(
  set: (partial: Partial<PatientState>) => void,
  request: () => Promise<PatientAccessGrant>,
): Promise<PatientAccessGrant | null> {
  set({ status: "validating", failure: null });
  return request()
    .then((grant) => {
      set({ grant, status: "idle", failure: null });
      return grant;
    })
    .catch((error: unknown) => {
      set({ grant: null, status: "idle", failure: toRequestFailure(error) });
      return null;
    });
}

export const usePatientStore = create<PatientState>()((set) => ({
  grant: null,
  status: "idle",
  failure: null,

  accessByCode(code) {
    return createAccessAction(set, () => patientAccessApi.validateCode(code));
  },

  accessByLink(link) {
    return createAccessAction(set, () => patientAccessApi.validateLink(link));
  },

  accessByAppointment(appointmentId) {
    return createAccessAction(set, () =>
      patientAccessApi.grantFromAppointment(appointmentId),
    );
  },

  setSelectedPatient(grant) {
    set({ grant, status: "idle", failure: null });
  },

  clearAccess() {
    set({ grant: null, status: "idle", failure: null });
  },

  clearFailure() {
    set({ failure: null });
  },
}));

export const selectSelectedPatient = (state: PatientState): Patient | null =>
  state.grant?.patient ?? null;

export const selectAccessMethod = (state: PatientState): AccessMethod | null =>
  state.grant?.method ?? null;

export const selectAuthorizationStatus = (state: PatientState): AuthorizationStatus | null =>
  state.grant?.authorizationStatus ?? null;
