import type { PatientCommunicationPayload } from "../domain/types";

/**
 * Patient-facing payloads generated at finalization, keyed by record id.
 *
 * Nothing is transmitted anywhere. Storing the payload makes the projection an
 * explicit, inspectable step of the finalization transaction rather than
 * something computed on the way out of the door.
 */
const payloads = new Map<string, PatientCommunicationPayload>();

export const patientCommunicationRepository = {
  async save(payload: PatientCommunicationPayload): Promise<PatientCommunicationPayload> {
    payloads.set(payload.recordId, payload);
    return payload;
  },

  async findByRecordId(recordId: string): Promise<PatientCommunicationPayload | null> {
    return payloads.get(recordId) ?? null;
  },
};
