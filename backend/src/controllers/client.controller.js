import { Client, Interaction } from '../models/index.js';
import {
  accessibleClientIds,
  assertSameTeamUsers,
  clientAccessFilter,
  getAccessibleCase,
  getAccessibleClient,
} from '../services/access.service.js';
import { writeAudit } from '../services/audit.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, parsePagination, sendSuccess } from '../utils/http.js';

export const listClients = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const ids = await accessibleClientIds(req.user);
  const filter = clientAccessFilter(req.user, ids);
  if (req.query.archived === 'true') filter.archivedAt = { $ne: null };
  else filter.archivedAt = null;
  if (req.query.q) filter.name = { $regex: escapeRegex(req.query.q), $options: 'i' };
  if (req.query.assignedLawyerId) filter.assignedLawyerId = req.query.assignedLawyerId;
  const [items, total] = await Promise.all([
    Client.find(filter)
      .populate('assignedLawyerId', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Client.countDocuments(filter),
  ]);
  sendSuccess(res, { items, page, limit, total }, 'Clients loaded');
});

export const createClient = asyncHandler(async (req, res) => {
  const assigned = req.body.assignedLawyerId || String(req.user._id);
  await assertSameTeamUsers(req.user.teamId, [assigned]);
  const client = await Client.create({
    teamId: req.user.teamId,
    name: req.body.name,
    phone: req.body.phone || '',
    email: req.body.email || '',
    notes: req.body.notes || '',
    assignedLawyerId: assigned,
    nextFollowUpAt: req.body.nextFollowUpAt || null,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'client.created',
    entityType: 'Client',
    entityId: client._id,
    requestId: req.requestId,
  });
  sendSuccess(res, { client }, 'Client created', 201);
});

export const getClient = asyncHandler(async (req, res) => {
  const client = await getAccessibleClient(req.user, req.params.id);
  await client.populate('assignedLawyerId', 'name email');
  sendSuccess(res, { client }, 'Client loaded');
});

export const patchClient = asyncHandler(async (req, res) => {
  const client = await getAccessibleClient(req.user, req.params.id);
  if (req.body.assignedLawyerId) await assertSameTeamUsers(req.user.teamId, [req.body.assignedLawyerId]);
  const allow = ['name', 'phone', 'email', 'notes', 'assignedLawyerId', 'nextFollowUpAt'];
  for (const key of allow) {
    if (req.body[key] !== undefined) client[key] = req.body[key] || null;
  }
  client.updatedBy = req.user._id;
  await client.save();
  sendSuccess(res, { client }, 'Client updated');
});

export const archiveClient = asyncHandler(async (req, res) => {
  const client = await getAccessibleClient(req.user, req.params.id);
  client.archivedAt = client.archivedAt ? null : new Date();
  client.updatedBy = req.user._id;
  await client.save();
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: client.archivedAt ? 'client.archived' : 'client.restored',
    entityType: 'Client',
    entityId: client._id,
    requestId: req.requestId,
    metadata: { archived: Boolean(client.archivedAt) },
  });
  sendSuccess(res, { client }, client.archivedAt ? 'Client archived' : 'Client restored');
});

export const listInteractions = asyncHandler(async (req, res) => {
  const client = await getAccessibleClient(req.user, req.params.id);
  const items = await Interaction.find({ teamId: req.user.teamId, clientId: client._id })
    .populate('createdBy', 'name')
    .sort({ occurredAt: -1 })
    .limit(100);
  sendSuccess(res, { items }, 'Interactions loaded');
});

export const createInteraction = asyncHandler(async (req, res) => {
  const client = await getAccessibleClient(req.user, req.body.clientId);
  if (req.body.caseId) await getAccessibleCase(req.user, req.body.caseId);
  const interaction = await Interaction.create({
    teamId: req.user.teamId,
    clientId: client._id,
    caseId: req.body.caseId || undefined,
    type: req.body.type,
    occurredAt: new Date(req.body.occurredAt),
    summary: req.body.summary,
    followUpRequired: Boolean(req.body.followUpRequired),
    followUpAt: req.body.followUpAt || null,
    createdBy: req.user._id,
  });
  if (interaction.followUpAt) {
    client.nextFollowUpAt = interaction.followUpAt;
    client.updatedBy = req.user._id;
    await client.save();
  }
  sendSuccess(res, { interaction }, 'Interaction recorded', 201);
});
