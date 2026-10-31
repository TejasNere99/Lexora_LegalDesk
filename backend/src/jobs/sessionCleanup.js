import { Session } from '../models/index.js';

export async function cleanupExpiredSessions() {
  await Session.deleteMany({ expiresAt: { $lt: new Date() } });
}
