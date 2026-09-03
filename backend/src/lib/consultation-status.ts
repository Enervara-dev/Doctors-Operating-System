import type { ConsultationStatus } from "../domain/types";
import { ApiError } from "./api-error";

/**
 * The clinical lifecycle, owned by the backend.
 *
 *   NOT_STARTED -> READY -> LIVE <-> PAUSED -> REVIEW -> FINALIZING -> FINALIZED
 *
 * A consultation returns to LIVE from REVIEW if the doctor resumes it, and
 * FINALIZING exists so a failed finalization does not strand the record.
 */
const ALLOWED: Record<ConsultationStatus, readonly ConsultationStatus[]> = {
  NOT_STARTED: ["NOT_STARTED", "READY"],
  READY: ["READY", "LIVE", "REVIEW"],
  LIVE: ["LIVE", "PAUSED", "REVIEW"],
  PAUSED: ["PAUSED", "LIVE", "REVIEW"],
  REVIEW: ["REVIEW", "LIVE", "PAUSED", "FINALIZING"],
  FINALIZING: ["FINALIZING", "REVIEW", "FINALIZED"],
  FINALIZED: [],
};

export function isConsultationStatus(value: unknown): value is ConsultationStatus {
  return typeof value === "string" && value in ALLOWED;
}

export function canTransition(from: ConsultationStatus, to: ConsultationStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: ConsultationStatus, to: ConsultationStatus): void {
  if (!canTransition(from, to)) {
    throw new ApiError(
      409,
      "INVALID_STATE_TRANSITION",
      `A consultation cannot move from ${from} to ${to}.`,
    );
  }
}

/** Statuses in which clinical content may still be edited. */
export function isEditable(status: ConsultationStatus): boolean {
  return status !== "FINALIZED";
}

/** Statuses that mean the platform should be listening. */
export function isLive(status: ConsultationStatus): boolean {
  return status === "LIVE";
}
