import { env } from '../config/env.js';
import {
  Invitation,
  PasswordReset,
  Session,
  Team,
  User,
} from '../models/index.js';
import { writeAudit } from '../services/audit.service.js';
import {
  clearAuthCookies,
  createSession,
  findActiveUser,
  revokeAllUserSessions,
  revokeSessionByToken,
  rotateSession,
  setAuthCookies,
  signAccessToken,
} from '../services/auth.service.js';
import { sendTransactionalEmail } from '../services/mail.service.js';
import { buildPasswordResetEmail } from '../templates/emailTemplates.js';
import { setCsrfCookie } from '../middleware/csrf.js';
import { hashPassword, hashToken, normalizeEmail, randomToken, verifyPassword } from '../utils/crypto.js';
import { AppError, sendSuccess, unauthorized } from '../utils/http.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function publicUser(user) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
    timezone: user.timezone,
    onboardingComplete: user.onboardingComplete,
    isActive: user.isActive,
  };
}

async function establishSession(user, req, res) {
  const { session, refreshToken } = await createSession(user, req);
  const accessToken = signAccessToken(user, session._id);
  setAuthCookies(res, { accessToken, refreshToken });
  setCsrfCookie(res);
}

export const csrf = asyncHandler(async (_req, res) => {
  const token = setCsrfCookie(res);
  sendSuccess(res, { csrfToken: token }, 'CSRF token issued');
});

export const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = user ? await verifyPassword(req.body.password, user.passwordHash) : false;
  if (!user || !valid || !user.isActive) {
    throw new AppError('Invalid email or password', { status: 401, code: 'INVALID_CREDENTIALS' });
  }
  await establishSession(user, req, res);
  sendSuccess(res, { user: publicUser(user) }, 'Signed in');
});

export const logout = asyncHandler(async (req, res) => {
  await revokeSessionByToken(req.cookies?.[env.refreshCookieName]);
  clearAuthCookies(res);
  sendSuccess(res, {}, 'Signed out');
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.refreshCookieName];
  if (!token) throw unauthorized();
  const current = await Session.findOne({
    refreshTokenHash: hashToken(token),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  if (!current) {
    clearAuthCookies(res);
    throw unauthorized();
  }
  const user = await findActiveUser(current.userId);
  if (!user) {
    current.revokedAt = new Date();
    await current.save();
    clearAuthCookies(res);
    throw unauthorized('This account is no longer active');
  }
  const { session, refreshToken } = await rotateSession(current, req);
  const accessToken = signAccessToken(user, session._id);
  setAuthCookies(res, { accessToken, refreshToken });
  setCsrfCookie(res);
  sendSuccess(res, { user: publicUser(user) }, 'Session refreshed');
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: publicUser(req.user) }, 'Current user');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email, isActive: true });
  if (user) {
    const token = randomToken(32);
    await PasswordReset.create({
      userId: user._id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;
    const mailContent = buildPasswordResetEmail({
      name: user.name,
      resetUrl,
    });
    await sendTransactionalEmail({
      to: user.email,
      ...mailContent,
    });
  }
  sendSuccess(res, {}, 'If an account exists, reset instructions were sent');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const record = await PasswordReset.findOne({
    tokenHash: hashToken(req.body.token),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  if (!record) {
    throw new AppError('This reset link is invalid or has expired', { status: 400, code: 'INVALID_TOKEN' });
  }
  const user = await User.findById(record.userId);
  if (!user || !user.isActive) {
    throw new AppError('This reset link is invalid or has expired', { status: 400, code: 'INVALID_TOKEN' });
  }
  user.passwordHash = await hashPassword(req.body.password);
  user.passwordChangedAt = new Date();
  await user.save();
  record.usedAt = new Date();
  await record.save();
  await revokeAllUserSessions(user._id);
  sendSuccess(res, {}, 'Password updated. Please sign in');
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOne({
    tokenHash: hashToken(req.body.token),
    acceptedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  if (!invitation) {
    throw new AppError('This invitation is invalid or has expired', { status: 400, code: 'INVALID_TOKEN' });
  }
  const email = normalizeEmail(invitation.email);
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists', { status: 409, code: 'CONFLICT' });
  }
  const team = await Team.findById(invitation.teamId);
  if (!team) throw new AppError('This invitation is invalid or has expired', { status: 400, code: 'INVALID_TOKEN' });
  const user = await User.create({
    name: req.body.name,
    email,
    passwordHash: await hashPassword(req.body.password),
    role: invitation.role,
    teamId: invitation.teamId,
    isActive: true,
  });
  invitation.acceptedAt = new Date();
  await invitation.save();
  await writeAudit({
    teamId: user.teamId,
    actorId: user._id,
    action: 'invitation.accepted',
    entityType: 'User',
    entityId: user._id,
    requestId: req.requestId,
  });
  await establishSession(user, req, res);
  sendSuccess(res, { user: publicUser(user) }, 'Welcome to Lexora LegalDesk', 201);
});

export const updateMe = asyncHandler(async (req, res) => {
  const allowed = {};
  if (req.body.name) allowed.name = req.body.name;
  if (req.body.timezone) allowed.timezone = req.body.timezone;
  if (typeof req.body.onboardingComplete === 'boolean') allowed.onboardingComplete = req.body.onboardingComplete;
  Object.assign(req.user, allowed);
  await req.user.save();
  sendSuccess(res, { user: publicUser(req.user) }, 'Profile updated');
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  const ok = await verifyPassword(req.body.currentPassword, user.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', { status: 400, code: 'INVALID_CREDENTIALS' });
  user.passwordHash = await hashPassword(req.body.newPassword);
  user.passwordChangedAt = new Date();
  await user.save();
  await revokeAllUserSessions(user._id);
  await establishSession(user, req, res);
  sendSuccess(res, {}, 'Password changed');
});
