import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Session, User } from '../models/index.js';
import { hashToken, randomToken } from '../utils/crypto.js';

const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function cookieOptions({ maxAge, path = '/', httpOnly = true }) {
  return {
    httpOnly,
    sameSite: env.cookieSecure ? 'none' : 'lax',
    secure: env.cookieSecure,
    path,
    maxAge,
  };
}

export function signAccessToken(user, sessionId) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      teamId: String(user.teamId),
      sid: String(sessionId),
      typ: 'access',
    },
    env.accessTokenSecret,
    { algorithm: 'HS256', expiresIn: ACCESS_TTL_SEC, issuer: 'lexora-legaldesk', audience: 'lexora-api' },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.accessTokenSecret, {
    algorithms: ['HS256'],
    issuer: 'lexora-legaldesk',
    audience: 'lexora-api',
  });
}

export async function createSession(user, req) {
  const refreshToken = randomToken(48);
  const session = await Session.create({
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    userAgent: req.get('user-agent')?.slice(0, 400),
    ip: req.ip,
  });
  return { session, refreshToken };
}

export async function rotateSession(current, req) {
  const refreshToken = randomToken(48);
  const next = await Session.create({
    userId: current.userId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    userAgent: req.get('user-agent')?.slice(0, 400),
    ip: req.ip,
  });
  current.revokedAt = new Date();
  current.replacedByHash = next.refreshTokenHash;
  await current.save();
  return { session: next, refreshToken };
}

export async function revokeSessionByToken(refreshToken) {
  if (!refreshToken) return;
  await Session.updateOne(
    { refreshTokenHash: hashToken(refreshToken), revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export async function revokeAllUserSessions(userId) {
  await Session.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}

export async function findActiveUser(userId) {
  return User.findOne({ _id: userId, isActive: true });
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(env.accessCookieName, accessToken, cookieOptions({ maxAge: ACCESS_TTL_SEC * 1000 }));
  res.cookie(
    env.refreshCookieName,
    refreshToken,
    cookieOptions({ maxAge: REFRESH_TTL_MS, path: '/api/v1/auth' }),
  );
}

export function clearAuthCookies(res) {
  res.clearCookie(env.accessCookieName, cookieOptions({ maxAge: 0 }));
  res.clearCookie(env.refreshCookieName, cookieOptions({ maxAge: 0, path: '/api/v1/auth' }));
}
