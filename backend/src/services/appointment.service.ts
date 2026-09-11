import type { Appointment, AppointmentBoard, AppointmentWithPatient } from "../domain/types";
import { ApiError } from "../lib/api-error";
import { appointmentRepository } from "../repositories/appointment.repository";

/**
 * The doctor's schedule.
 *
 * The today / upcoming / past split and its counts are computed by the patient
 * platform, from the same clock that holds the rows, and passed through
 * unchanged. This service used to re-derive both from a flat list; keeping a
 * second implementation of "which of these is today" is how two screens come
 * to disagree at midnight.
 */
export const appointmentService = {
  async getBoard(): Promise<AppointmentBoard> {
    return appointmentRepository.getBoard();
  },

  /**
   * Confirms a requested appointment.
   *
   * A patient booking arrives as REQUESTED, and REQUESTED is not attendable —
   * so without this the doctor could see the appointment, press "Open patient"
   * and be told it "cannot be attended", with nothing anywhere to change that.
   * Confirming is the doctor accepting the request.
   */
  async confirm(appointmentId: string): Promise<Appointment> {
    return appointmentRepository.setStatus(appointmentId, "CONFIRMED", null);
  },

  async getById(appointmentId: string): Promise<AppointmentWithPatient> {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw ApiError.notFound("APPOINTMENT_NOT_FOUND", "This appointment could not be found.");
    }
    return appointment;
  },
};
