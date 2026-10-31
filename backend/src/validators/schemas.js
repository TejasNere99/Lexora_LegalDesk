import { z } from 'zod';
import { CASE_PRIORITIES, CASE_STATUSES } from '../models/Case.js';
import { INTERACTION_TYPES } from '../models/Interaction.js';
import { TASK_PRIORITIES, TASK_STATUSES } from '../models/Task.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const optionalDate = z.union([z.string().datetime(), z.string().min(1), z.null()]).optional();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export const forgotSchema = z.object({
  email: z.string().email(),
});

export const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(10).max(200),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20).max(200),
  name: z.string().min(2).max(120),
  password: z.string().min(10).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  timezone: z.string().min(1).max(80).optional(),
  onboardingComplete: z.boolean().optional(),
});

export const clientCreateSchema = z.object({
  name: z.string().min(2).max(160),
  phone: z.string().max(40).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  assignedLawyerId: objectId.optional(),
  nextFollowUpAt: optionalDate,
});

export const clientPatchSchema = clientCreateSchema.partial();

export const caseCreateSchema = z.object({
  title: z.string().min(3).max(200),
  caseNumber: z.string().max(80).optional().or(z.literal('')),
  caseType: z.string().max(80).optional().or(z.literal('')),
  court: z.string().max(160).optional().or(z.literal('')),
  jurisdiction: z.string().max(120).optional().or(z.literal('')),
  clientIds: z.array(objectId).min(1),
  opposingParty: z.string().max(160).optional().or(z.literal('')),
  assignedLawyerId: objectId.optional(),
  authorizedUserIds: z.array(objectId).optional(),
  status: z.enum(CASE_STATUSES).optional(),
  priority: z.enum(CASE_PRIORITIES).optional(),
  filingDate: optionalDate,
  nextHearingAt: optionalDate,
  internalNotes: z.string().max(5000).optional().or(z.literal('')),
});

export const casePatchSchema = caseCreateSchema.partial().extend({
  __v: z.number().optional(),
});

export const caseAccessSchema = z.object({
  authorizedUserIds: z.array(objectId),
  assignedLawyerId: objectId.optional(),
});

export const hearingCreateSchema = z.object({
  caseId: objectId,
  scheduledAt: z.string().min(1),
  court: z.string().max(160).optional().or(z.literal('')),
  hearingType: z.string().max(80).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  outcome: z.string().max(2000).optional().or(z.literal('')),
  nextAction: z.string().max(500).optional().or(z.literal('')),
  nextHearingAt: optionalDate,
});

export const hearingPatchSchema = hearingCreateSchema.partial();

export const taskCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(4000).optional().or(z.literal('')),
  caseId: objectId.optional(),
  clientId: objectId.optional(),
  assignedTo: objectId,
  dueAt: optionalDate,
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
});

export const taskPatchSchema = taskCreateSchema.partial();

export const interactionCreateSchema = z.object({
  clientId: objectId,
  caseId: objectId.optional(),
  type: z.enum(INTERACTION_TYPES),
  occurredAt: z.string().min(1),
  summary: z.string().min(2).max(2000),
  followUpRequired: z.boolean().optional(),
  followUpAt: optionalDate,
});

export const invitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'lawyer']).optional(),
});

export const memberPatchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: z.enum(['admin', 'lawyer']).optional(),
  isActive: z.boolean().optional(),
});
