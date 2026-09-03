/** Every API path the frontend knows about, in one place. */
const consultation = (id: string) => `/consultations/${encodeURIComponent(id)}`;

export const endpoints = {
  auth: {
    login: "/auth/login",
    me: "/auth/me",
  },
  appointments: {
    list: "/appointments",
    byId: (id: string) => `/appointments/${encodeURIComponent(id)}`,
  },
  patients: {
    context: (id: string) => `/patients/${encodeURIComponent(id)}/context`,
  },
  patientAccess: {
    validateCode: "/patient-access/code/validate",
    validateLink: "/patient-access/link/validate",
    grantFromAppointment: "/patient-access/appointment/grant",
  },
  consultations: {
    create: "/consultations",
    byId: consultation,
    context: (id: string) => `${consultation(id)}/context`,
    notes: (id: string) => `${consultation(id)}/notes`,
    diagnosis: (id: string) => `${consultation(id)}/diagnosis`,
    investigations: (id: string) => `${consultation(id)}/investigations`,
    investigation: (id: string, investigationId: string) =>
      `${consultation(id)}/investigations/${encodeURIComponent(investigationId)}`,
    medications: (id: string) => `${consultation(id)}/medications`,
    medication: (id: string, medicationId: string) =>
      `${consultation(id)}/medications/${encodeURIComponent(medicationId)}`,
    followUp: (id: string) => `${consultation(id)}/follow-up`,
    finalize: (id: string) => `${consultation(id)}/finalize`,
    summary: (id: string) => `${consultation(id)}/summary`,
    record: (id: string) => `${consultation(id)}/record`,
    audit: (id: string) => `${consultation(id)}/audit`,
    clinicalIntelligence: (id: string) => `${consultation(id)}/clinical-intelligence`,

    /* Live consultation: session control and transport. */
    live: (id: string) => `${consultation(id)}/live`,
    liveStart: (id: string) => `${consultation(id)}/live/start`,
    livePause: (id: string) => `${consultation(id)}/live/pause`,
    liveResume: (id: string) => `${consultation(id)}/live/resume`,
    liveStop: (id: string) => `${consultation(id)}/live/stop`,
    liveUpdates: (id: string) => `${consultation(id)}/live/updates`,
    liveStream: (id: string) => `${consultation(id)}/live/stream`,

    /* Clinical domains, each fetched independently. */
    transcript: (id: string) => `${consultation(id)}/transcript`,
    clinicalContext: (id: string) => `${consultation(id)}/clinical-context`,
    considerations: (id: string) => `${consultation(id)}/clinical-intelligence/considerations`,
    investigationRecommendations: (id: string) =>
      `${consultation(id)}/clinical-intelligence/investigations`,
    missingInformation: (id: string) =>
      `${consultation(id)}/clinical-intelligence/missing-information`,
    clinicalSafety: (id: string) => `${consultation(id)}/clinical-intelligence/safety`,
    clinicalEvidence: (id: string) => `${consultation(id)}/clinical-intelligence/evidence`,
    events: (id: string) => `${consultation(id)}/events`,
    decisions: (id: string) => `${consultation(id)}/decisions`,
  },
  records: {
    list: "/records",
    byId: (id: string) => `/records/${encodeURIComponent(id)}`,
    audit: (id: string) => `/records/${encodeURIComponent(id)}/audit`,
    patientCommunication: (id: string) =>
      `/records/${encodeURIComponent(id)}/patient-communication`,
  },
} as const;
