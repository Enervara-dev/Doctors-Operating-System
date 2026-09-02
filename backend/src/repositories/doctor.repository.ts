import type { Doctor } from "../domain/types";
import { db } from "../mock/db";

/**
 * Mock persistence for doctors. Every method is async so the SQL-backed
 * implementation can replace this file without touching the service layer.
 */
export const doctorRepository = {
  async findById(id: string): Promise<Doctor | null> {
    return db.doctors.find((doctor) => doctor.id === id) ?? null;
  },

  async findByEmail(email: string): Promise<Doctor | null> {
    const normalized = email.trim().toLowerCase();
    return db.doctors.find((doctor) => doctor.email.toLowerCase() === normalized) ?? null;
  },

  /**
   * Phase 1 only: plaintext comparison against a fixture. A real
   * implementation delegates to an identity provider and never sees a password.
   */
  async findIdByCredentials(email: string, password: string): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    const match = db.credentials.find(
      (record) => record.email.toLowerCase() === normalized && record.password === password,
    );
    return match?.doctorId ?? null;
  },
};
