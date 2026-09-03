import {
  Activity,
  BrainCircuit,
  ClipboardList,
  FileText,
  MessageSquare,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type {
  ClinicalFactKind,
  ClinicalIntelligenceStatus,
  ConsultationEventKind,
  DecisionOutcome,
  InvestigationPriority,
  LiveConnectionState,
  LiveSessionState,
  SafetyAlertKind,
  SafetySeverity,
  SpeakerRole,
} from "@/types";
import type { Tone } from "./appointment";

/**
 * Speaker presentation. Roles are resolved by the platform; the workspace never
 * shows a raw diarization identifier.
 */
export const SPEAKER_META: Record<SpeakerRole, { label: string; tone: Tone; initials: string }> = {
  DOCTOR: { label: "Doctor", tone: "primary", initials: "Dr" },
  PATIENT: { label: "Patient", tone: "info", initials: "Pt" },
  ATTENDER: { label: "Attender", tone: "neutral", initials: "At" },
  UNKNOWN: { label: "Unattributed", tone: "neutral", initials: "?" },
};

export const CLINICAL_FACT_KIND_LABELS: Record<ClinicalFactKind, string> = {
  SYMPTOM: "Symptom",
  NEGATIVE_FINDING: "Ruled out",
  DURATION: "Duration",
  SEVERITY: "Severity",
  MEDICATION: "Medication",
  ALLERGY: "Allergy",
  HISTORY: "History",
  RISK_FACTOR: "Risk factor",
  VITAL: "Vital",
  EXAMINATION: "Examination",
};

/** Ruled-out findings read differently from positive ones; everything else is quiet. */
export const CLINICAL_FACT_KIND_TONE: Record<ClinicalFactKind, Tone> = {
  SYMPTOM: "info",
  NEGATIVE_FINDING: "neutral",
  DURATION: "neutral",
  SEVERITY: "neutral",
  MEDICATION: "neutral",
  ALLERGY: "error",
  HISTORY: "neutral",
  RISK_FACTOR: "warning",
  VITAL: "neutral",
  EXAMINATION: "neutral",
};

export const SAFETY_KIND_LABELS: Record<SafetyAlertKind, string> = {
  RED_FLAG: "Red flag",
  CONTRAINDICATION: "Contraindication",
  DRUG_INTERACTION: "Drug interaction",
  RISK_FACTOR: "Risk factor",
};

export const SAFETY_SEVERITY_META: Record<SafetySeverity, { label: string; tone: Tone }> = {
  ADVISORY: { label: "Advisory", tone: "neutral" },
  WARNING: { label: "Warning", tone: "warning" },
  CRITICAL: { label: "Critical", tone: "error" },
};

export const INVESTIGATION_PRIORITY_META: Record<
  InvestigationPriority,
  { label: string; tone: Tone }
> = {
  ROUTINE: { label: "Routine", tone: "neutral" },
  IMPORTANT: { label: "Important", tone: "warning" },
  URGENT: { label: "Urgent", tone: "error" },
};

/**
 * Decision wording. None of these confirm a diagnosis or order anything —
 * that distinction is the point, and the labels carry it.
 */
export const DECISION_OUTCOME_META: Record<DecisionOutcome, { label: string; tone: Tone }> = {
  ACCEPTED_FOR_CONSIDERATION: { label: "Accepted for consideration", tone: "primary" },
  REJECTED: { label: "Rejected", tone: "error" },
  ACKNOWLEDGED: { label: "Acknowledged", tone: "info" },
  DEFERRED: { label: "Deferred", tone: "neutral" },
  ACTIONED: { label: "Carried into record", tone: "success" },
};

export const INTELLIGENCE_STATUS_META: Record<
  ClinicalIntelligenceStatus,
  { label: string; tone: Tone }
> = {
  UNAVAILABLE: { label: "Not connected", tone: "neutral" },
  CONNECTING: { label: "Connecting", tone: "info" },
  WAITING: { label: "Processing", tone: "info" },
  PARTIAL: { label: "Partial", tone: "warning" },
  AVAILABLE: { label: "Up to date", tone: "success" },
  STALE: { label: "Catching up", tone: "warning" },
  ERROR: { label: "Unavailable", tone: "error" },
};

export const LIVE_SESSION_META: Record<LiveSessionState, { label: string; tone: Tone }> = {
  IDLE: { label: "Not started", tone: "neutral" },
  LIVE: { label: "Live", tone: "error" },
  PAUSED: { label: "Paused", tone: "warning" },
  ENDED: { label: "Ended", tone: "neutral" },
};

export const CONNECTION_META: Record<LiveConnectionState, { label: string; tone: Tone }> = {
  DISCONNECTED: { label: "Not connected", tone: "neutral" },
  CONNECTING: { label: "Connecting", tone: "info" },
  CONNECTED: { label: "Connected", tone: "success" },
  RECONNECTING: { label: "Reconnecting", tone: "warning" },
  UNAVAILABLE: { label: "Connection unavailable", tone: "error" },
};

export const CONSULTATION_EVENT_META: Record<
  ConsultationEventKind,
  { label: string; icon: LucideIcon }
> = {
  SESSION: { label: "Session", icon: Stethoscope },
  TRANSCRIPT: { label: "Conversation", icon: MessageSquare },
  CLINICAL_CONTEXT: { label: "Clinical context", icon: Activity },
  CLINICAL_INTELLIGENCE: { label: "Clinical Intelligence", icon: BrainCircuit },
  CLINICAL_SAFETY: { label: "Clinical safety", icon: ShieldAlert },
  DOCTOR_DECISION: { label: "Doctor decision", icon: UserCheck },
  DOCTOR_ENTRY: { label: "Doctor entry", icon: ClipboardList },
};

export const CONSULTATION_EVENT_ACTOR_LABELS = {
  DOCTOR: "Doctor",
  CLINICAL_INTELLIGENCE: "Clinical Intelligence",
  SYSTEM: "System",
} as const;

export const RECORD_ICON = FileText;

/** `mm:ss` for the live session clock. */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
}
