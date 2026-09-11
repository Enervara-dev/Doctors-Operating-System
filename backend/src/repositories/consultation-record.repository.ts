import type { ConsultationRecordSummary } from "../domain/types";
import { patientApi } from "../lib/patient-api";

/**
 * Finalized clinical records.
 *
 * A finalized consultation IS the record — same id, same rows, immutable by
 * database trigger once closed. There is no separate snapshot table, because a
 * second copy of every diagnosis, investigation and medication would restate
 * what the consultation already holds and then have to be kept honest forever.
 *
 * So this repository no longer stores anything. It lists the archive from the
 * platform, and a single record is projected from the consultation the
 * service already fetches.
 *
 * The only field that is NOT a projection of durable state is
 * `patientContext`: the record shows the patient's context as it is NOW, not
 * as it was at the visit. Storing a copy would duplicate the health record.
 * See `consultation-record.service.ts`, which says so where the record is
 * built.
 */

interface RemoteRecordSummary {
  id: string;
  consultationId: string;
  reference: string;
  patientId: string;
  patientName: string;
  consultationType: string;
  consultationDateTime: string | null;
  finalizedAt: string | null;
  assessment: string | null;
  outcome: string | null;
}

export const consultationRecordRepository = {
  /**
   * The archive for one doctor, newest finalization first.
   *
   * Summaries only. A list of twenty records does not need twenty full
   * clinical snapshots, and fetching them would be twenty round trips.
   */
  async listSummariesByDoctorId(doctorId: string): Promise<ConsultationRecordSummary[]> {
    const { records } = await patientApi.getOnce<{ records: RemoteRecordSummary[] }>(
      "/api/doctor/consultations/records",
    );

    return records.map((record) => ({
      id: record.id,
      consultationId: record.consultationId,
      reference: record.reference,
      patientId: record.patientId,
      patientName: record.patientName,
      doctorId,
      doctorName: "",
      consultationType: record.consultationType,
      consultationDateTime: record.consultationDateTime ?? "",
      finalizedAt: record.finalizedAt ?? "",
      // The closing line, written at finalization from the primary assessment.
      primaryAssessment: record.outcome || record.assessment || null,
      status: "FINALIZED",
      version: 1,
    }));
  },
};
