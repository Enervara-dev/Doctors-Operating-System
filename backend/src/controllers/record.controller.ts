import type { Request, Response } from "express";
import type { RecordListFilters, RecordStatus } from "../domain/types";
import { requireParam } from "../lib/params";
import { sendSuccess } from "../lib/respond";
import { getAuthenticatedDoctor } from "../middleware/auth.middleware";
import { auditService } from "../services/audit.service";
import { consultationRecordService } from "../services/consultation-record.service";
import { patientCommunicationService } from "../services/patient-communication.service";

function queryString(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export const recordController = {
  async list(req: Request, res: Response): Promise<void> {
    const doctor = getAuthenticatedDoctor(req);
    const status = queryString(req, "status");

    const filters: RecordListFilters = {
      ...(queryString(req, "patientId") ? { patientId: queryString(req, "patientId")! } : {}),
      ...(status ? { status: status as RecordStatus } : {}),
      ...(queryString(req, "consultationType")
        ? { consultationType: queryString(req, "consultationType")! }
        : {}),
      ...(queryString(req, "query") ? { query: queryString(req, "query")! } : {}),
      ...(queryString(req, "from") ? { from: queryString(req, "from")! } : {}),
      ...(queryString(req, "to") ? { to: queryString(req, "to")! } : {}),
    };

    sendSuccess(res, await consultationRecordService.list(doctor.id, filters));
  },

  async getById(req: Request, res: Response): Promise<void> {
    const id = requireParam(req, "id", "A record id is required.");
    sendSuccess(res, await consultationRecordService.getById(id));
  },

  async getAudit(req: Request, res: Response): Promise<void> {
    const id = requireParam(req, "id", "A record id is required.");
    const record = await consultationRecordService.getById(id);
    sendSuccess(res, await auditService.listForConsultation(record.consultationId));
  },

  async getPatientCommunication(req: Request, res: Response): Promise<void> {
    const id = requireParam(req, "id", "A record id is required.");
    sendSuccess(res, await patientCommunicationService.getForRecord(id));
  },
};
