import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { PatientAccessGrant } from "@/types";

export const patientAccessApi = {
  validateCode(code: string): Promise<PatientAccessGrant> {
    return apiRequest<PatientAccessGrant>(endpoints.patientAccess.validateCode, {
      method: "POST",
      body: { code },
    });
  },

  validateLink(link: string): Promise<PatientAccessGrant> {
    return apiRequest<PatientAccessGrant>(endpoints.patientAccess.validateLink, {
      method: "POST",
      body: { link },
    });
  },

  grantFromAppointment(appointmentId: string): Promise<PatientAccessGrant> {
    return apiRequest<PatientAccessGrant>(endpoints.patientAccess.grantFromAppointment, {
      method: "POST",
      body: { appointmentId },
    });
  },
};
