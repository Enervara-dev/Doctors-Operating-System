import type { Patient, PatientContext } from "../domain/types";
import { patientApi } from "../lib/patient-api";
import { toPatient, toPatientContext, type RemoteBrief } from "../lib/remote-mapping";

/**
 * The pre-consultation brief: everything known about a patient before the
 * visit, assembled by the patient platform in a single read.
 *
 * Access is checked upstream on every call — the doctor's own token is
 * forwarded, and the platform refuses unless a live access grant exists for
 * this clinician and this patient. There is no cached copy here, so a patient
 * who revokes access stops being readable on the next request rather than
 * whenever a cache happens to expire.
 */

function fetchBrief(patientId: string): Promise<RemoteBrief> {
  return patientApi
    .getOnce<{ brief: RemoteBrief }>(`/api/doctor/patients/${encodeURIComponent(patientId)}/brief`)
    .then((body) => body.brief);
}

export const patientContextRepository = {
  async findByPatientId(patientId: string): Promise<PatientContext> {
    return toPatientContext(await fetchBrief(patientId));
  },

  /**
   * The patient with their derived health-context summary.
   *
   * Both come from the same upstream read, memoised for the request, so the
   * confirmation screen and the brief cannot show different summaries of the
   * same record.
   */
  async findPatient(patientId: string): Promise<Patient> {
    return toPatient(await fetchBrief(patientId));
  },
};
