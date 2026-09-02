import type { AuditAction, AuditEntityType, AuditEvent, Doctor } from "../domain/types";
import { createId } from "../lib/id";
import { auditRepository } from "../repositories/audit.repository";

export interface AuditInput {
  consultationId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  summary: string;
  doctor?: Doctor | null;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Writes the activity trail. Called from the service layer at the point a
 * change is applied, so the log records what actually happened.
 *
 * Audit writes must never fail a clinical operation: a failure here is logged
 * and swallowed rather than losing the doctor's work.
 */
export const auditService = {
  async record(input: AuditInput): Promise<void> {
    const event: AuditEvent = {
      id: createId("aud"),
      entityType: input.entityType,
      entityId: input.entityId,
      consultationId: input.consultationId,
      action: input.action,
      actorType: input.doctor ? "DOCTOR" : "SYSTEM",
      actorId: input.doctor?.id ?? null,
      actorName: input.doctor?.fullName ?? null,
      timestamp: new Date().toISOString(),
      summary: input.summary,
      ...(input.previousValue === undefined ? {} : { previousValue: input.previousValue }),
      ...(input.newValue === undefined ? {} : { newValue: input.newValue }),
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    };

    try {
      await auditRepository.append(event);
    } catch (error) {
      console.error("[audit] failed to append event", input.action, error);
    }
  },

  async listForConsultation(consultationId: string): Promise<AuditEvent[]> {
    return auditRepository.findByConsultationId(consultationId);
  },

  async hasRecorded(consultationId: string, action: AuditAction): Promise<boolean> {
    return auditRepository.existsForAction(consultationId, action);
  },
};
