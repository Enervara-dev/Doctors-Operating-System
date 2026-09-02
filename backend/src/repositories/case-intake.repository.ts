import { db } from "../mock/db";
import type { CaseIntakeRecord } from "../mock/types";

export const caseIntakeRepository = {
  async findByAppointmentId(appointmentId: string): Promise<CaseIntakeRecord | null> {
    return db.caseIntakes.find((record) => record.appointmentId === appointmentId) ?? null;
  },

  async findLatestByPatientId(patientId: string): Promise<CaseIntakeRecord | null> {
    return db.caseIntakes.find((record) => record.patientId === patientId) ?? null;
  },
};
