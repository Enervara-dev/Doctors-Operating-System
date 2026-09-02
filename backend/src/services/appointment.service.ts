import type {
  Appointment,
  AppointmentBoard,
  AppointmentSummary,
  AppointmentWithPatient,
} from "../domain/types";
import { ApiError } from "../lib/api-error";
import { simulateLatency } from "../lib/delay";
import { compareIsoDates, todayIsoDate } from "../mock/date";
import { appointmentRepository } from "../repositories/appointment.repository";
import { patientRepository } from "../repositories/patient.repository";

/** Statuses that still occupy a slot in the doctor's working day. */
const ACTIVE_STATUSES = new Set<Appointment["status"]>([
  "UPCOMING",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
]);

async function joinPatients(appointments: Appointment[]): Promise<AppointmentWithPatient[]> {
  const patients = await patientRepository.findManyByIds(
    appointments.map((appointment) => appointment.patientId),
  );

  // An appointment whose patient record is missing is a data fault, not a
  // user-facing state; drop it rather than rendering a half-populated card.
  return appointments.flatMap((appointment) => {
    const patient = patients.get(appointment.patientId);
    return patient ? [{ ...appointment, patient }] : [];
  });
}

function buildSummary(
  today: AppointmentWithPatient[],
  upcoming: AppointmentWithPatient[],
): AppointmentSummary {
  const activeToday = today.filter((appointment) => ACTIVE_STATUSES.has(appointment.status));
  const pendingFollowUps = [...today, ...upcoming].filter(
    (appointment) =>
      appointment.appointmentType === "Follow-up" &&
      (appointment.status === "UPCOMING" || appointment.status === "READY"),
  );

  return {
    todayTotal: today.length,
    patientsToday: new Set(activeToday.map((appointment) => appointment.patientId)).size,
    pendingFollowUps: pendingFollowUps.length,
    readyForConsultation: today.filter((appointment) => appointment.status === "READY").length,
  };
}

export const appointmentService = {
  async getBoard(doctorId: string): Promise<AppointmentBoard> {
    await simulateLatency();

    const appointments = await appointmentRepository.findByDoctorId(doctorId);
    const joined = await joinPatients(appointments);
    const today = todayIsoDate();

    const todays = joined.filter((appointment) => compareIsoDates(appointment.date, today) === 0);
    const upcoming = joined.filter((appointment) => compareIsoDates(appointment.date, today) > 0);
    const past = joined
      .filter((appointment) => compareIsoDates(appointment.date, today) < 0)
      .reverse();

    return { today: todays, upcoming, past, summary: buildSummary(todays, upcoming) };
  },

  async getById(appointmentId: string): Promise<AppointmentWithPatient> {
    await simulateLatency();

    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw ApiError.notFound("APPOINTMENT_NOT_FOUND", "This appointment could not be found.");
    }

    const patient = await patientRepository.findById(appointment.patientId);
    if (!patient) {
      throw ApiError.notFound(
        "PATIENT_NOT_FOUND",
        "The patient linked to this appointment could not be found.",
      );
    }

    return { ...appointment, patient };
  },
};
