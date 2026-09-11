import type { Appointment, AppointmentBoard, AppointmentWithPatient } from "../domain/types";
import { patientApi } from "../lib/patient-api";
import { toAppointment, toPatientSummary, type RemoteBoard } from "../lib/remote-mapping";

/**
 * The doctor's schedule, read from the patient platform.
 *
 * The board arrives already bucketed into today / upcoming / past with its
 * counts, because that split depends on the server's current day and the
 * platform is the one holding the clock and the rows. This service used to
 * re-derive it from a flat list; doing that in two places is how two screens
 * come to disagree about what "today" means.
 */

function board(): Promise<RemoteBoard> {
  return patientApi.getOnce<RemoteBoard>("/api/doctor/appointments");
}

function join(remote: RemoteBoard["today"]): AppointmentWithPatient[] {
  return remote.map((row) => ({
    ...toAppointment(row),
    patient: toPatientSummary(row.patient),
  }));
}

export const appointmentRepository = {
  async getBoard(): Promise<AppointmentBoard> {
    const remote = await board();
    return {
      today: join(remote.today),
      upcoming: join(remote.upcoming),
      past: join(remote.past),
      summary: remote.summary,
    };
  },

  async findById(id: string): Promise<AppointmentWithPatient | null> {
    const { appointment } = await patientApi.getOnce<{ appointment: RemoteBoard["today"][number] }>(
      `/api/doctor/appointments/${encodeURIComponent(id)}`,
    );
    return appointment
      ? { ...toAppointment(appointment), patient: toPatientSummary(appointment.patient) }
      : null;
  },

  /**
   * The patient's next active appointment with this doctor, taken from the
   * board that has already been fetched. It is only ever asked for while
   * rendering the schedule, so this costs nothing extra.
   */
  async findUpcomingByPatientId(patientId: string): Promise<Appointment | null> {
    const remote = await board();
    const candidates = [...remote.today, ...remote.upcoming].filter(
      (row) =>
        row.patientId === patientId &&
        (row.status === "CHECKED_IN" ||
          row.status === "IN_CONSULTATION" ||
          row.status === "CONFIRMED" ||
          row.status === "REQUESTED"),
    );
    return candidates.length > 0 ? toAppointment(candidates[0]) : null;
  },
};
