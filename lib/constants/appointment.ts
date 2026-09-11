import type {
  AppointmentAlertSeverity,
  AppointmentStatus,
  AuthorizationStatus,
  HealthContextAvailability,
} from "@/types";

/**
 * Presentation tones map to token-driven styles in `components/ui/Badge`.
 * Keeping the mapping here means status colour is decided once, not per card.
 */
export type Tone = "neutral" | "primary" | "info" | "success" | "warning" | "error";

interface StatusMeta {
  label: string;
  tone: Tone;
}

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  REQUESTED: { label: "Awaiting confirmation", tone: "neutral" },
  CONFIRMED: { label: "Confirmed", tone: "neutral" },
  // The patient is here. This is what a clinician means by "ready".
  CHECKED_IN: { label: "Ready for consultation", tone: "primary" },
  IN_CONSULTATION: { label: "In consultation", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  FOLLOW_UP_DUE: { label: "Follow-up due", tone: "warning" },
  RESCHEDULED: { label: "Rescheduled", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  NO_SHOW: { label: "No-show", tone: "warning" },
};

/** Statuses the doctor can still act on — drives the primary card action. */
export const ACTIONABLE_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "CHECKED_IN",
  "IN_CONSULTATION",
  "CONFIRMED",
  "REQUESTED",
]);

export const ALERT_SEVERITY_TONE: Record<AppointmentAlertSeverity, Tone> = {
  INFO: "neutral",
  WARNING: "warning",
  CRITICAL: "error",
};

export const AUTHORIZATION_STATUS_META: Record<AuthorizationStatus, StatusMeta> = {
  AUTHORIZED: { label: "Authorized", tone: "success" },
  PENDING: { label: "Awaiting patient approval", tone: "warning" },
  DENIED: { label: "Not authorized", tone: "error" },
};

export const HEALTH_CONTEXT_META: Record<HealthContextAvailability, StatusMeta> = {
  AVAILABLE: { label: "Available", tone: "success" },
  PARTIAL: { label: "Partially available", tone: "warning" },
  UNAVAILABLE: { label: "Not available", tone: "neutral" },
};
