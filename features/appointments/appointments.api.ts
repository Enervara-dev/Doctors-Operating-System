import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Appointment, AppointmentBoard, AppointmentWithPatient } from "@/types";

export const appointmentsApi = {
  getBoard(signal?: AbortSignal): Promise<AppointmentBoard> {
    return apiRequest<AppointmentBoard>(endpoints.appointments.list, { signal });
  },

  getById(id: string, signal?: AbortSignal): Promise<AppointmentWithPatient> {
    return apiRequest<AppointmentWithPatient>(endpoints.appointments.byId(id), { signal });
  },

  /** Accepts a patient's booking request, making the appointment attendable. */
  confirm(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(endpoints.appointments.confirm(id), { method: "POST" });
  },
};
