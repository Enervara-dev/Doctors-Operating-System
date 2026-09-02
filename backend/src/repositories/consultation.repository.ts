import type { Consultation } from "../domain/types";
import { db } from "../mock/db";

/**
 * In-memory consultation store seeded from `data/consultations.json`.
 *
 * Writes are process-local and are lost on restart — Phase 2 deliberately has
 * no database. Replacing this file with a SQL implementation is the only change
 * required at the persistence boundary; services and controllers are unaffected.
 */
const consultations = new Map<string, Consultation>(
  db.consultationSeed.map((consultation) => [consultation.id, consultation]),
);

let referenceCounter = 1024 + consultations.size;

export const consultationRepository = {
  async findById(id: string): Promise<Consultation | null> {
    return consultations.get(id) ?? null;
  },

  async findByPatientId(patientId: string): Promise<Consultation[]> {
    return [...consultations.values()].filter(
      (consultation) => consultation.patientId === patientId,
    );
  },

  /** Used to resume rather than duplicate a consultation already in progress. */
  async findOpenForPatient(
    patientId: string,
    appointmentId: string | null,
  ): Promise<Consultation | null> {
    return (
      [...consultations.values()].find(
        (consultation) =>
          consultation.patientId === patientId &&
          consultation.appointmentId === appointmentId &&
          consultation.status !== "FINALIZED",
      ) ?? null
    );
  },

  async save(consultation: Consultation): Promise<Consultation> {
    consultations.set(consultation.id, consultation);
    return consultation;
  },

  async nextReference(): Promise<string> {
    referenceCounter += 1;
    return `C-${referenceCounter}`;
  },
};
