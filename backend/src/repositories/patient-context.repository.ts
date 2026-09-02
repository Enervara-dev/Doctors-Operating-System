import { db } from "../mock/db";
import type { PatientContextRecord } from "../mock/types";

export const patientContextRepository = {
  /** Returns null when a patient has no clinical history fixture yet. */
  async findByPatientId(patientId: string): Promise<PatientContextRecord | null> {
    return db.patientContexts.find((record) => record.patientId === patientId) ?? null;
  },
};
