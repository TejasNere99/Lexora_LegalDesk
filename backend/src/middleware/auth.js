import { env } from '../config/env.js';
import { Session } from '../models/index.js';
import { findActiveUser, verifyAccessToken } from '../services/auth.service.js';
import { forbidden, unauthorized } from '../utils/http.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[env.accessCookieName];
    if (!token) throw unauthorized();
    const payload = verifyAccessToken(token);
    if (payload.typ !== 'access') throw unauthorized();
    const user = await findActiveUser(payload.sub);
    if (!user) throw unauthorized('This account is no longer active');
    const session = await Session.findOne({
      _id: payload.sid,
      userId: user._id,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    if (!session) throw unauthorized();
    req.user = user;
    req.sessionId = session._id;
    next();
  } catch (err) {
    if (err.status === 401) return next(err);
    return next(unauthorized());
  }
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(forbidden());
  }
  next();
}
