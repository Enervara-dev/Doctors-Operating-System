import { db } from "../mock/db";
import type { AccessCodeRecord, SharingLinkRecord } from "../mock/types";

/**
 * Stands in for the authorization store that will eventually own access codes,
 * share tokens, consent records and audit trails.
 */
export const patientAccessRepository = {
  async findAccessCode(code: string): Promise<AccessCodeRecord | null> {
    const normalized = code.trim().toUpperCase();
    return db.accessCodes.find((record) => record.code === normalized) ?? null;
  },

  async findSharingLink(token: string): Promise<SharingLinkRecord | null> {
    const normalized = token.trim().toUpperCase();
    return db.sharingLinks.find((record) => record.token === normalized) ?? null;
  },
};
