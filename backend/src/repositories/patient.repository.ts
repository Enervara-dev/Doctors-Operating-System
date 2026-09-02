import type { Patient } from "../domain/types";
import { db } from "../mock/db";

export const patientRepository = {
  async findById(id: string): Promise<Patient | null> {
    return db.patients.find((patient) => patient.id === id) ?? null;
  },

  async findManyByIds(ids: readonly string[]): Promise<Map<string, Patient>> {
    const wanted = new Set(ids);
    const entries = db.patients
      .filter((patient) => wanted.has(patient.id))
      .map((patient) => [patient.id, patient] as const);
    return new Map(entries);
  },

  async list(): Promise<Patient[]> {
    return [...db.patients];
  },
};
