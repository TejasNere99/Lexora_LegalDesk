import { AuditLog } from '../models/AuditLog.js';

const SAFE_KEYS = ['status', 'priority', 'assignedLawyerId', 'from', 'to', 'role', 'archived', 'memberId'];

export async function writeAudit({ teamId, actorId, action, entityType, entityId, requestId, metadata = {} }) {
  const safe = {};
  for (const key of SAFE_KEYS) {
    if (metadata[key] !== undefined) safe[key] = String(metadata[key]);
  }
  await AuditLog.create({
    teamId,
    actorId,
    action,
    entityType,
    entityId,
    requestId,
    metadata: safe,
  });
}
