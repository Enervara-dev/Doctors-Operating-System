import type { AccessMethod } from "@/types";

export const ACCESS_METHOD_LABELS: Record<AccessMethod, string> = {
  APPOINTMENT: "Scheduled appointment",
  ACCESS_CODE: "Patient access code",
  SHARING_LINK: "Patient sharing link",
};

export const ACCESS_METHOD_ROUTES: Record<AccessMethod, string> = {
  APPOINTMENT: "/patients/access/appointment",
  ACCESS_CODE: "/patients/access/code",
  SHARING_LINK: "/patients/access/link",
};
