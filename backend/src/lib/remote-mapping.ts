import type {
  Allergy,
  Appointment,
  ClinicalFinding,
  Consultation,
  ConsultationStep,
  Diagnosis,
  DoctorDecision,
  FollowUpPlan,
  Medication,
  SelectedInvestigation,
  TreatmentPlan,
  CurrentMedication,
  MedicalHistoryItem,
  Patient,
  PatientContext,
  PreviousConsultation,
} from "../domain/types";

/**
 * Translation between the patient platform's API and this service's domain
 * contract.
 *
 * The contract the frontend compiles against is unchanged, so everything the
 * platform names differently is renamed exactly once — here — rather than in
 * each repository. Two differences are worth naming:
 *
 *   The platform stores one instant (`scheduledAt`); this contract carries a
 *   calendar date and a wall-clock time, because that is what a day's schedule
 *   is read as. The split happens on the way out, in the server's timezone.
 *
 *   The platform returns archived clinical rows flagged rather than hidden, as
 *   a clinician needs. Nothing here drops them.
 */

/* ── Remote shapes ────────────────────────────────────────────────────────── */

export interface RemoteAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMinutes: number;
  appointmentType: Appointment["appointmentType"];
  status: Appointment["status"];
  reason: string | null;
  alerts: { severity: "INFO" | "WARNING" | "CRITICAL"; label: string }[];
  patient: RemotePatientSummary;
}

export interface RemotePatientSummary {
  id: string;
  fullName: string;
  age: number | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  bloodGroup: string | null;
  city: string | null;
  avatarInitials: string;
  /**
   * Present only where the platform has actually derived it — on an access
   * grant, which is what the confirmation screen reads. Absent on appointment
   * cards, which have not read the record.
   */
  healthContext?: Patient["healthContext"] | null;
}

export interface RemoteBoard {
  today: RemoteAppointment[];
  upcoming: RemoteAppointment[];
  past: RemoteAppointment[];
  summary: {
    todayTotal: number;
    patientsToday: number;
    pendingFollowUps: number;
    readyForConsultation: number;
  };
}

export interface RemoteBrief {
  patientId: string;
  demographics: {
    patientId: string;
    fullName: string;
    age: number | null;
    dateOfBirth: string | null;
    gender: "MALE" | "FEMALE" | "OTHER" | null;
    bloodGroup: string | null;
    city: string | null;
    state: string | null;
    heightCm: number | null;
    weightKg: number | null;
    phoneMasked: string | null;
    avatarInitials: string;
    registeredOn: string;
  };
  allergies: {
    id: string;
    substance: string;
    reaction: string;
    severity: Allergy["severity"];
    recordedOn: string;
    lastReactionOn: string | null;
    archived: boolean;
  }[];
  noKnownAllergiesConfirmedAt: string | null;
  noKnownConditionsConfirmedAt: string | null;
  medicalHistory: {
    id: string;
    category: MedicalHistoryItem["category"];
    label: string;
    detail: string | null;
    since: string | null;
    status: MedicalHistoryItem["status"];
    archived: boolean;
  }[];
  currentMedications: {
    id: string;
    name: string;
    dosage: string | null;
    frequency: string | null;
    courseType: string;
    timeOfDay: string[];
    foodRelation: string | null;
    indication: string | null;
    recordedOn: string;
    archived: boolean;
  }[];
  previousConsultations: {
    id: string;
    reference: string;
    date: string;
    doctorName: string | null;
    specialty: string | null;
    consultationType: string;
    complaint: string | null;
    assessment: string | null;
    investigations: string[];
    treatment: string[];
    outcome: string | null;
  }[];
  labReports: PatientContext["labReports"];
  prescriptions: PatientContext["prescriptions"];
  lifestyle: Record<string, unknown> | null;
  wellbeing: Record<string, unknown> | null;
  healthContext: Patient["healthContext"];
  lastUpdatedAt: string;
}

export interface RemoteGrant {
  id: string;
  patientId: string;
  method: "APPOINTMENT" | "ACCESS_CODE" | "SHARING_LINK";
  authorizationStatus: "AUTHORIZED" | "PENDING" | "DENIED";
  grantedAt: string;
  expiresAt: string | null;
  patient: RemotePatientSummary | null;
  appointment: RemoteAppointment | null;
}

export interface RemoteConsultation {
  id: string;
  reference: string;
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  accessGrantId: string | null;
  consultationType: Appointment["appointmentType"];
  status: string;
  currentStep: string;
  furthestStep: string;
  consultedAt: string;
  finalizedAt: string | null;
  caseContext: {
    intakeId: string | null;
    chiefComplaint: string;
    historyOfPresentIllness: string;
    symptoms: { id: string; name: string; duration: string | null; severity: "MILD" | "MODERATE" | "SEVERE"; notes: string | null }[];
    symptomTimeline: { id: string; label: string; date: string | null; description: string | null; source: "PATIENT_REPORTED" | "DOCTOR_RECORDED" | "RECORD" }[];
    submittedAt: string | null;
  };
}

/* ── Mapping ──────────────────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` in the server's timezone — not `toISOString`, which is UTC. */
export function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `HH:mm`, 24-hour, in the server's timezone. */
export function localTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toAppointment(remote: RemoteAppointment): Appointment {
  return {
    id: remote.id,
    patientId: remote.patientId,
    doctorId: remote.doctorId,
    date: localDate(remote.scheduledAt),
    time: localTime(remote.scheduledAt),
    durationMinutes: remote.durationMinutes,
    appointmentType: remote.appointmentType,
    status: remote.status,
    reason: remote.reason ?? "",
    alerts: remote.alerts,
  };
}

/** No summary derived — said plainly rather than guessed at. */
const NO_HEALTH_CONTEXT: Patient["healthContext"] = {
  availability: "UNAVAILABLE",
  previousConsultations: 0,
  activeMedications: 0,
  knownConditions: [],
  knownAllergies: [],
  lastVisitDate: null,
};

/**
 * The patient summary an appointment card and the confirmation screen show.
 *
 * The confirmation screen exists to show the health-context summary before a
 * doctor opens a record, so the platform derives it on the access grant and it
 * is used verbatim here. An appointment card carries none — it has not read
 * the record — and falls back to UNAVAILABLE rather than to a made-up count
 * that would contradict the brief.
 */
export function toPatientSummary(remote: RemotePatientSummary): Patient {
  return {
    id: remote.id,
    fullName: remote.fullName,
    age: remote.age ?? 0,
    gender: remote.gender ?? "OTHER",
    bloodGroup: remote.bloodGroup ?? null,
    phoneMasked: "",
    city: remote.city ?? "",
    registeredOn: "",
    avatarInitials: remote.avatarInitials,
    healthContext: remote.healthContext ?? NO_HEALTH_CONTEXT,
  };
}

export function toPatient(brief: RemoteBrief): Patient {
  const d = brief.demographics;
  return {
    id: d.patientId,
    fullName: d.fullName,
    age: d.age ?? 0,
    gender: d.gender ?? "OTHER",
    bloodGroup: d.bloodGroup ?? null,
    phoneMasked: d.phoneMasked ?? "",
    city: d.city ?? "",
    registeredOn: d.registeredOn,
    avatarInitials: d.avatarInitials,
    healthContext: brief.healthContext,
  };
}

export function toPatientContext(brief: RemoteBrief): PatientContext {
  const d = brief.demographics;

  const allergies: Allergy[] = brief.allergies.map((a) => ({
    id: a.id,
    substance: a.substance,
    reaction: a.reaction,
    severity: a.severity,
    recordedOn: a.recordedOn,
    archived: a.archived,
  }));

  const medicalHistory: MedicalHistoryItem[] = brief.medicalHistory.map((h) => ({
    id: h.id,
    category: h.category,
    label: h.label,
    detail: h.detail ?? "",
    since: h.since ?? "",
    status: h.status,
    archived: h.archived,
  }));

  const currentMedications: CurrentMedication[] = brief.currentMedications.map((m) => ({
    id: m.id,
    name: m.name,
    dosage: m.dosage ?? "Dose not recorded",
    frequency: m.frequency ?? "Frequency not recorded",
    startedOn: null,
    indication: m.indication ?? "",
    prescribedBy: null,
    archived: m.archived,
  }));

  const previousConsultations: PreviousConsultation[] = brief.previousConsultations.map((c) => ({
    id: c.id,
    date: c.date,
    doctorName: c.doctorName ?? "",
    specialty: c.specialty ?? "",
    complaint: c.complaint ?? "",
    assessment: c.assessment ?? "",
    investigations: c.investigations,
    treatment: c.treatment,
    outcome: c.outcome ?? "",
  }));

  return {
    patientId: brief.patientId,
    demographics: {
      patientId: d.patientId,
      fullName: d.fullName,
      age: d.age ?? 0,
      gender: d.gender ?? "OTHER",
      bloodGroup: d.bloodGroup ?? null,
      city: d.city ?? "",
      phoneMasked: d.phoneMasked ?? "",
      avatarInitials: d.avatarInitials,
      heightCm: d.heightCm,
      weightKg: d.weightKg,
    },
    allergies,
    noKnownAllergiesConfirmedAt: brief.noKnownAllergiesConfirmedAt,
    noKnownConditionsConfirmedAt: brief.noKnownConditionsConfirmedAt,
    medicalHistory,
    currentMedications,
    previousConsultations,
    labReports: brief.labReports,
    prescriptions: brief.prescriptions,
    relevantHealthInformation: relevantHealthInformation(brief),
    lastUpdatedAt: brief.lastUpdatedAt,
  };
}

/**
 * The short "worth knowing" lines on the context panel, assembled from the
 * lifestyle and wellbeing modules the patient filled in.
 *
 * These were free text in the fixture; here they are generated from structured
 * answers, so nothing is written that the patient did not actually record.
 */
function relevantHealthInformation(brief: RemoteBrief): string[] {
  const lines: string[] = [];
  const l = brief.lifestyle;
  const w = brief.wellbeing;

  if (l) {
    const sleep = l.sleep_hours;
    if (typeof sleep === "number" && sleep < 6) {
      lines.push(`Reports sleeping about ${sleep} hours a night.`);
    }
    if (l.smoking === "yes") lines.push("Current smoker.");
    else if (l.smoking === "sometimes") lines.push("Occasional smoker.");
    if (l.alcohol === "yes") lines.push("Drinks alcohol regularly.");
    if (l.exercise === "no") lines.push("Reports no regular exercise.");
  }

  if (w) {
    const stress = w.stress_level;
    if (typeof stress === "number" && stress >= 7) {
      lines.push(`Self-reported stress ${stress}/10.`);
    }
    const energy = w.energy_level;
    if (typeof energy === "number" && energy <= 4) {
      lines.push(`Self-reported energy ${energy}/10.`);
    }
  }

  return lines;
}

/* ── Clinical state ───────────────────────────────────────────────────────── */

/**
 * The post-brief clinical record as the platform stores it.
 *
 * Field-for-field the Doctor API's own aggregate, so mapping is renaming and
 * nothing else — there is no place here for a value to be reinterpreted on
 * the way in or out.
 */
export interface RemoteClinicalState {
  version: number;
  status: string;
  currentStep: string;
  furthestStep: string;
  completedSteps: string[];
  startedAt: string | null;
  updatedAt: string | null;
  finalizedAt: string | null;

  assessmentNotes: string;
  additionalNotes: string;
  doctorNotes: string;
  additionalObservations: string;

  treatmentPlan: { advice: string; nonPharmacological: string[]; procedures: string[] };
  followUp: {
    date: string | null;
    interval: string;
    reason: string;
    requiredInvestigations: string[];
    medicationReview: string;
    symptomMonitoring: string[];
    escalationInstructions: string;
  };

  diagnoses: Diagnosis[];
  investigations: SelectedInvestigation[];
  medications: Medication[];
  clinicalFindings: ClinicalFinding[];
  doctorDecisions: DoctorDecision[];
}

export interface MappedClinicalState {
  status: string;
  currentStep: string;
  furthestStep: string;
  completedSteps: ConsultationStep[];
  startedAt: string;
  updatedAt: string;
  finalizedAt: string | null;
  assessmentNotes: string;
  additionalNotes: string;
  doctorNotes: string;
  additionalObservations: string;
  treatmentPlan: TreatmentPlan;
  followUp: FollowUpPlan;
  diagnoses: Diagnosis[];
  investigations: SelectedInvestigation[];
  medications: Medication[];
  clinicalFindings: ClinicalFinding[];
  doctorDecisions: DoctorDecision[];
}

export function toClinicalState(remote: RemoteClinicalState): MappedClinicalState {
  return {
    status: remote.status,
    currentStep: remote.currentStep,
    furthestStep: remote.furthestStep,
    completedSteps: remote.completedSteps as ConsultationStep[],
    startedAt: remote.startedAt ?? "",
    updatedAt: remote.updatedAt ?? "",
    finalizedAt: remote.finalizedAt,
    assessmentNotes: remote.assessmentNotes,
    additionalNotes: remote.additionalNotes,
    doctorNotes: remote.doctorNotes,
    additionalObservations: remote.additionalObservations,
    treatmentPlan: {
      advice: remote.treatmentPlan.advice,
      nonPharmacological: remote.treatmentPlan.nonPharmacological,
      procedures: remote.treatmentPlan.procedures,
    },
    followUp: {
      date: remote.followUp.date,
      interval: remote.followUp.interval,
      reason: remote.followUp.reason,
      requiredInvestigations: remote.followUp.requiredInvestigations,
      medicationReview: remote.followUp.medicationReview,
      symptomMonitoring: remote.followUp.symptomMonitoring,
      escalationInstructions: remote.followUp.escalationInstructions,
    },
    diagnoses: remote.diagnoses,
    investigations: remote.investigations,
    medications: remote.medications,
    clinicalFindings: remote.clinicalFindings,
    doctorDecisions: remote.doctorDecisions,
  };
}

/**
 * The aggregate on its way up.
 *
 * The doctor's narrative lives on `caseContext` in this service's contract and
 * on the consultation row upstream, so it is lifted here rather than being
 * stored twice in either place.
 */
export function toClinicalStatePayload(consultation: Consultation) {
  return {
    status: consultation.status,
    currentStep: consultation.currentStep,
    furthestStep: consultation.furthestStep,
    completedSteps: consultation.completedSteps,

    assessmentNotes: consultation.assessmentNotes,
    additionalNotes: consultation.additionalNotes,
    doctorNotes: consultation.caseContext.doctorNotes,
    additionalObservations: consultation.caseContext.additionalObservations,

    treatmentPlan: consultation.treatmentPlan,
    followUp: consultation.followUp,

    diagnoses: consultation.diagnoses,
    investigations: consultation.investigations,
    medications: consultation.medications,
    clinicalFindings: consultation.caseContext.clinicalFindings,
    doctorDecisions: consultation.doctorDecisions,
  };
}
