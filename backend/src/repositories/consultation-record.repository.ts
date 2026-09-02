import type { ConsultationRecord } from "../domain/types";
import { db } from "../mock/db";

/**
 * Finalized clinical records. Seeded from JSON and extended in memory.
 *
 * Records are written once and never mutated: an amendment creates a new
 * version that points back at the one it supersedes.
 */
const records = new Map<string, ConsultationRecord>(
  db.consultationRecordSeed.map((record) => [record.id, record]),
);

export const consultationRecordRepository = {
  async create(record: ConsultationRecord): Promise<ConsultationRecord> {
    records.set(record.id, record);
    return record;
  },

  async findById(id: string): Promise<ConsultationRecord | null> {
    return records.get(id) ?? null;
  },

  async findByConsultationId(consultationId: string): Promise<ConsultationRecord | null> {
    return (
      [...records.values()].find((record) => record.consultationId === consultationId) ?? null
    );
  },

  /** All records for a doctor, newest finalization first. */
  async listByDoctorId(doctorId: string): Promise<ConsultationRecord[]> {
    return [...records.values()]
      .filter((record) => record.doctorId === doctorId)
      .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt));
  },
};
