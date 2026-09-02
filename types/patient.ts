export type Gender = "MALE" | "FEMALE" | "OTHER";

export type HealthContextAvailability = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";

export interface PatientHealthContext {
  availability: HealthContextAvailability;
  /** Counts drive the "what exists for this patient" summary on confirmation. */
  previousConsultations: number;
  activeMedications: number;
  knownConditions: string[];
  knownAllergies: string[];
  lastVisitDate: string | null;
}

export interface Patient {
  id: string;
  fullName: string;
  age: number;
  gender: Gender;
  bloodGroup: string | null;
  phoneMasked: string;
  city: string;
  registeredOn: string;
  avatarInitials: string;
  healthContext: PatientHealthContext;
}
