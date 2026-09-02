import type { PatientAccessGrant } from "../domain/types";

/**
 * Issued access grants, held in memory for the life of the process.
 *
 * Its purpose is to keep authorization server-authoritative: a client passes a
 * grant id, never an authorization claim. A real implementation persists these
 * with signatures, revocation and an audit trail.
 */
const grants = new Map<string, PatientAccessGrant>();

export const accessGrantRepository = {
  async save(grant: PatientAccessGrant): Promise<PatientAccessGrant> {
    grants.set(grant.id, grant);
    return grant;
  },

  async findById(id: string): Promise<PatientAccessGrant | null> {
    return grants.get(id) ?? null;
  },
};
