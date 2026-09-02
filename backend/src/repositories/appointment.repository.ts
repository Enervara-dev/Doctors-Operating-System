import type { Appointment } from "../domain/types";
import { compareIsoDates } from "../mock/date";
import { db, rebaseAppointments } from "../mock/db";

function byDateThenTime(a: Appointment, b: Appointment): number {
  const byDate = compareIsoDates(a.date, b.date);
  return byDate !== 0 ? byDate : a.time.localeCompare(b.time);
}

/** Fixture rows rebased onto the current day, recomputed on every read. */
function appointments(): Appointment[] {
  return rebaseAppointments(db.appointmentSeed);
}

export const appointmentRepository = {
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return appointments()
      .filter((appointment) => appointment.doctorId === doctorId)
      .sort(byDateThenTime);
  },

  async findById(id: string): Promise<Appointment | null> {
    return appointments().find((appointment) => appointment.id === id) ?? null;
  },

  async findUpcomingByPatientId(patientId: string): Promise<Appointment | null> {
    const candidates = appointments()
      .filter((appointment) => appointment.patientId === patientId)
      .sort(byDateThenTime);
    return (
      candidates.find(
        (appointment) =>
          appointment.status === "READY" ||
          appointment.status === "IN_PROGRESS" ||
          appointment.status === "UPCOMING",
      ) ?? null
    );
  },
};
