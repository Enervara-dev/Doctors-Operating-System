"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi } from "@/features/auth/auth.api";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";
import type { Doctor, LoginCredentials } from "@/types";

type AuthStatus = "idle" | "authenticating";

interface AuthState {
  doctor: Doctor | null;
  token: string | null;
  status: AuthStatus;
  failure: RequestFailure | null;
  /** False until persisted state has been read back on the client. */
  hasHydrated: boolean;

  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  clearFailure: () => void;
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

      async login(credentials) {
        set({ status: "authenticating", failure: null });
        try {
          const session = await authApi.login(credentials);
          set({ doctor: session.doctor, token: session.token, status: "idle", failure: null });
          return true;
        } catch (error) {
          set({ status: "idle", failure: toRequestFailure(error) });
          return false;
        }
      },

      logout() {
        set({ doctor: null, token: null, status: "idle", failure: null });
      },

      clearFailure() {
        set({ failure: null });
      },

      setHasHydrated(value) {
        set({ hasHydrated: value });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only the session survives a reload; transient UI state must not.
      partialize: (state) => ({ doctor: state.doctor, token: state.token }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

export const selectIsAuthenticated = (state: AuthState): boolean =>
  Boolean(state.token && state.doctor);
