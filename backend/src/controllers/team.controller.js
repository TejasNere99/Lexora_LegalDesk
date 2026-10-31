import { env } from '../config/env.js';
import { AuditLog, Invitation, User } from '../models/index.js';
import { writeAudit } from '../services/audit.service.js';
import { revokeAllUserSessions } from '../services/auth.service.js';
import { sendTransactionalEmail } from '../services/mail.service.js';
import { buildInvitationEmail } from '../templates/emailTemplates.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashToken, normalizeEmail, randomToken } from '../utils/crypto.js';
import { AppError, forbidden, parsePagination, sendSuccess } from '../utils/http.js';

export const listMembers = asyncHandler(async (req, res) => {
  const items = await User.find({ teamId: req.user.teamId }).select('name email role isActive createdAt').sort({ name: 1 });
  sendSuccess(res, { items }, 'Team loaded');
});

export const inviteMember = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw forbidden();
  const email = normalizeEmail(req.body.email);
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('An account with this email already exists', { status: 409, code: 'CONFLICT' });
  const token = randomToken(32);
  const invitation = await Invitation.create({
    teamId: req.user.teamId,
    email,
    role: req.body.role || 'lawyer',
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    createdBy: req.user._id,
  });
  const url = `${env.frontendUrl}/accept-invite?token=${token}`;
  const mailContent = buildInvitationEmail({
    inviterName: req.user.name,
    role: invitation.role,
    inviteUrl: url,
  });
  await sendTransactionalEmail({
    to: email,
    ...mailContent,
  });
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'team.invited',
    entityType: 'Invitation',
    entityId: invitation._id,
    requestId: req.requestId,
    metadata: { role: invitation.role },
  });
  sendSuccess(res, { invitationId: invitation._id }, 'Invitation created', 201);
});

export const patchMember = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw forbidden();
  if (String(req.params.id) === String(req.user._id) && req.body.role && req.body.role !== req.user.role) {
    throw forbidden();
  }
  const member = await User.findOne({ _id: req.params.id, teamId: req.user.teamId });
  if (!member) throw new AppError('Resource not found', { status: 404, code: 'NOT_FOUND' });
  if (req.body.name) member.name = req.body.name;
  if (req.body.role && String(member._id) !== String(req.user._id)) member.role = req.body.role;
  if (typeof req.body.isActive === 'boolean' && String(member._id) !== String(req.user._id)) {
    member.isActive = req.body.isActive;
    if (!member.isActive) await revokeAllUserSessions(member._id);
  }
  await member.save();
  sendSuccess(res, { member: member.toJSON() }, 'Member updated');
});

export const deactivateMember = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw forbidden();
  if (String(req.params.id) === String(req.user._id)) throw forbidden();
  const member = await User.findOne({ _id: req.params.id, teamId: req.user.teamId });
  if (!member) throw new AppError('Resource not found', { status: 404, code: 'NOT_FOUND' });
  member.isActive = false;
  await member.save();
  await revokeAllUserSessions(member._id);
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'team.member_deactivated',
    entityType: 'User',
    entityId: member._id,
    requestId: req.requestId,
    metadata: { memberId: String(member._id) },
  });
  sendSuccess(res, { member: member.toJSON() }, 'Member deactivated');
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw forbidden();
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { teamId: req.user.teamId };
  if (req.query.entityType) filter.entityType = req.query.entityType;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).populate('actorId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  sendSuccess(res, { items, page, limit, total }, 'Audit logs loaded');
});
