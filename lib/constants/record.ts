import {
  CircleCheck,
  FileCheck2,
  FilePlus2,
  FlaskConical,
  NotebookPen,
  Pencil,
  Pill,
  ShieldCheck,
  Stethoscope,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import type { AuditAction, RecordStatus } from "@/types";
import type { Tone } from "./appointment";

export const RECORD_STATUS_META: Record<RecordStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "info" },
  FINALIZED: { label: "Finalized", tone: "success" },
  AMENDED: { label: "Amended", tone: "warning" },
};

/** How each audited action is presented in the history. */
export const AUDIT_ACTION_META: Record<AuditAction, { label: string; icon: LucideIcon }> = {
  CONSULTATION_CREATED: { label: "Consultation opened", icon: FilePlus2 },
  CONSULTATION_STARTED: { label: "Consultation started", icon: Stethoscope },
  CONSULTATION_UPDATED: { label: "Consultation updated", icon: Pencil },
  CONSULTATION_NOTES_UPDATED: { label: "Notes updated", icon: Pencil },
  DIFFERENTIAL_REVIEWED: { label: "Differential reviewed", icon: NotebookPen },
  DIAGNOSIS_SELECTED: { label: "Assessment recorded", icon: NotebookPen },
  INVESTIGATION_ADDED: { label: "Investigation added", icon: FlaskConical },
  INVESTIGATION_UPDATED: { label: "Investigation updated", icon: FlaskConical },
  INVESTIGATION_REMOVED: { label: "Investigation removed", icon: FlaskConical },
  MEDICATION_ADDED: { label: "Medication added", icon: Pill },
  MEDICATION_UPDATED: { label: "Medication updated", icon: Pill },
  MEDICATION_REMOVED: { label: "Medication removed", icon: Pill },
  TREATMENT_UPDATED: { label: "Treatment updated", icon: Pill },
  FOLLOW_UP_CREATED: { label: "Follow-up planned", icon: CalendarClock },
  CONSULTATION_READY_FOR_REVIEW: { label: "Marked ready for review", icon: CircleCheck },
  CONSULTATION_FINALIZED: { label: "Consultation finalized", icon: ShieldCheck },
  RECORD_CREATED: { label: "Record created", icon: FileCheck2 },
};

export const AUDIT_ACTOR_LABELS = {
  DOCTOR: "Doctor",
  SYSTEM: "System",
  AI: "Clinical intelligence",
} as const;

export function recordHref(recordId: string): string {
  return `/records/${encodeURIComponent(recordId)}`;
}
