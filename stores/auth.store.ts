"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi } from "@/features/auth/auth.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { ChangePasswordInput, Doctor, LoginCredentials } from "@/types";

type AuthStatus = "idle" | "authenticating";
type ChangePasswordStatus = "idle" | "submitting";

interface AuthState {
  doctor: Doctor | null;
  token: string | null;
  status: AuthStatus;
  failure: RequestFailure | null;
  /** False until persisted state has been read back on the client. */
  hasHydrated: boolean;
  /**
   * Set from the login response and persisted, so a reload mid-forced-change
   * still shows the change-password screen rather than a flash of the
   * dashboard. Cleared only by a successful `changePassword` call — the
   * server-side gate (`requirePasswordChange` on the patient platform) is
   * what actually protects every other route regardless of this flag.
   */
  mustChangePassword: boolean;
  changePasswordStatus: ChangePasswordStatus;
  changePasswordFailure: RequestFailure | null;

  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  clearFailure: () => void;
  changePassword: (input: ChangePasswordInput) => Promise<boolean>;
  clearChangePasswordFailure: () => void;
  setHasHydrated: (value: boolean) => void;
}

const STORAGE_KEY = "enervara-doctor.auth";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      doctor: null,
      token: null,
      status: "idle",
      failure: null,
      hasHydrated: false,
      mustChangePassword: false,
      changePasswordStatus: "idle",
      changePasswordFailure: null,

      async login(credentials) {
        set({ status: "authenticating", failure: null });
        try {
          const session = await authApi.login(credentials);
          set({
            doctor: session.doctor,
            token: session.token,
            mustChangePassword: session.mustChangePassword,
            status: "idle",
            failure: null,
          });
          return true;
        } catch (error) {
          set({ status: "idle", failure: toRequestFailure(error) });
          return false;
        }
      },

      logout() {
        set({ doctor: null, token: null, mustChangePassword: false, status: "idle", failure: null });
      },

      clearFailure() {
        set({ failure: null });
      },

      async changePassword(input) {
        set({ changePasswordStatus: "submitting", changePasswordFailure: null });
        try {
          await authApi.changePassword(input);
          set({ mustChangePassword: false, changePasswordStatus: "idle", changePasswordFailure: null });
          return true;
        } catch (error) {
          set({ changePasswordStatus: "idle", changePasswordFailure: toRequestFailure(error) });
          return false;
        }
      },

      clearChangePasswordFailure() {
        set({ changePasswordFailure: null });
      },

      setHasHydrated(value) {
        set({ hasHydrated: value });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only the session survives a reload; transient UI state must not.
      partialize: (state) => ({
        doctor: state.doctor,
        token: state.token,
        mustChangePassword: state.mustChangePassword,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

export const selectIsAuthenticated = (state: AuthState): boolean =>
  Boolean(state.token && state.doctor);
