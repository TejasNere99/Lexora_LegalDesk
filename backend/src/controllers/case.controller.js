import { Case, Hearing, Task } from '../models/index.js';
import { nextSeq } from '../models/Counter.js';
import {
  assertSameTeamUsers,
  canManageCaseAccess,
  caseAccessFilter,
  getAccessibleCase,
  getAccessibleClient,
  getTeamCaseForAdminAccess,
} from '../services/access.service.js';
import { writeAudit } from '../services/audit.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, escapeRegex, isObjectId, parsePagination, sendSuccess } from '../utils/http.js';

function caseFilter(user, query) {
  const filter = { ...caseAccessFilter(user) };
  if (query.archived === 'true' || query.status === 'archived') {
    filter.archivedAt = { $ne: null };
  } else {
    filter.archivedAt = null;
  }
  if (query.status && query.status !== 'archived') filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.assignedLawyerId) {
    if (query.assignedLawyerId === 'me') {
      filter.assignedLawyerId = user._id;
    } else if (isObjectId(query.assignedLawyerId)) {
      filter.assignedLawyerId = query.assignedLawyerId;
    }
  }
  if (query.q) {
    filter.$and = [
      {
        $or: [
          { title: { $regex: escapeRegex(query.q), $options: 'i' } },
          { internalId: { $regex: escapeRegex(query.q), $options: 'i' } },
          { caseNumber: { $regex: escapeRegex(query.q), $options: 'i' } },
        ],
      },
    ];
  }
  return filter;
}

export const listCases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = caseFilter(req.user, req.query);
  const [items, total] = await Promise.all([
    Case.find(filter)
      .populate('assignedLawyerId', 'name email')
      .populate('clientIds', 'name')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Case.countDocuments(filter),
  ]);
  sendSuccess(res, { items, page, limit, total }, 'Cases loaded');
});

export const createCase = asyncHandler(async (req, res) => {
  for (const clientId of req.body.clientIds) {
    await getAccessibleClient(req.user, clientId);
  }
  const assigned = req.body.assignedLawyerId || String(req.user._id);
  const extra = req.body.authorizedUserIds || [];
  const authorized = await assertSameTeamUsers(req.user.teamId, [
    assigned,
    String(req.user._id),
    ...extra,
  ]);
  const year = new Date().getUTCFullYear();
  const seq = await nextSeq(req.user.teamId, `case-${year}`);
  const internalId = `LEX-${year}-${String(seq).padStart(4, '0')}`;
  const doc = await Case.create({
    teamId: req.user.teamId,
    internalId,
    title: req.body.title,
    caseNumber: req.body.caseNumber || '',
    caseType: req.body.caseType || '',
    court: req.body.court || '',
    jurisdiction: req.body.jurisdiction || '',
    clientIds: req.body.clientIds,
    opposingParty: req.body.opposingParty || '',
    assignedLawyerId: assigned,
    authorizedUserIds: authorized,
    status: req.body.status === 'archived' ? 'pending' : req.body.status || 'pending',
    priority: req.body.priority || 'normal',
    filingDate: req.body.filingDate || null,
    nextHearingAt: req.body.nextHearingAt || null,
    internalNotes: req.body.internalNotes || '',
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'case.created',
    entityType: 'Case',
    entityId: doc._id,
    requestId: req.requestId,
    metadata: { status: doc.status, assignedLawyerId: assigned },
  });
  sendSuccess(res, { case: doc }, 'Case created', 201);
});

export const getCase = asyncHandler(async (req, res) => {
  const doc = await getAccessibleCase(req.user, req.params.id);
  await doc.populate([
    { path: 'assignedLawyerId', select: 'name email role' },
    { path: 'authorizedUserIds', select: 'name email role' },
    { path: 'clientIds', select: 'name email phone' },
  ]);
  sendSuccess(res, { case: doc }, 'Case loaded');
});

export const patchCase = asyncHandler(async (req, res) => {
  const doc = await getAccessibleCase(req.user, req.params.id);
  if (req.body.__v !== undefined && req.body.__v !== doc.__v) {
    throw new AppError('This record was updated by someone else. Refresh and try again.', {
      status: 409,
      code: 'VERSION_CONFLICT',
    });
  }
  if (req.body.clientIds) {
    for (const clientId of req.body.clientIds) await getAccessibleClient(req.user, clientId);
  }
  if (req.body.assignedLawyerId) {
    await assertSameTeamUsers(req.user.teamId, [req.body.assignedLawyerId]);
  }
  const allow = [
    'title',
    'caseNumber',
    'caseType',
    'court',
    'jurisdiction',
    'clientIds',
    'opposingParty',
    'status',
    'priority',
    'filingDate',
    'nextHearingAt',
    'internalNotes',
  ];
  for (const key of allow) {
    if (req.body[key] !== undefined) doc[key] = req.body[key];
  }
  if (req.body.assignedLawyerId) {
    doc.assignedLawyerId = req.body.assignedLawyerId;
    if (!doc.authorizedUserIds.map(String).includes(String(req.body.assignedLawyerId))) {
      doc.authorizedUserIds.push(req.body.assignedLawyerId);
    }
  }
  doc.updatedBy = req.user._id;
  await doc.save();
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'case.updated',
    entityType: 'Case',
    entityId: doc._id,
    requestId: req.requestId,
    metadata: { status: doc.status },
  });
  sendSuccess(res, { case: doc }, 'Case updated');
});

export const archiveCase = asyncHandler(async (req, res) => {
  const doc = await getAccessibleCase(req.user, req.params.id);
  doc.archivedAt = new Date();
  doc.status = 'archived';
  doc.updatedBy = req.user._id;
  await doc.save();
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'case.archived',
    entityType: 'Case',
    entityId: doc._id,
    requestId: req.requestId,
    metadata: { archived: 'true' },
  });
  sendSuccess(res, { case: doc }, 'Case archived');
});

export const restoreCase = asyncHandler(async (req, res) => {
  const doc = await getAccessibleCase(req.user, req.params.id);
  doc.archivedAt = null;
  if (doc.status === 'archived') doc.status = 'pending';
  doc.updatedBy = req.user._id;
  await doc.save();
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'case.restored',
    entityType: 'Case',
    entityId: doc._id,
    requestId: req.requestId,
  });
  sendSuccess(res, { case: doc }, 'Case restored');
});

export const updateAccess = asyncHandler(async (req, res) => {
  const doc = await getTeamCaseForAdminAccess(req.user, req.params.id);
  if (!canManageCaseAccess(req.user, doc)) {
    throw new AppError('You do not have permission to complete this action', { status: 403, code: 'FORBIDDEN' });
  }
  const assigned = req.body.assignedLawyerId || String(doc.assignedLawyerId);
  const authorized = await assertSameTeamUsers(req.user.teamId, [assigned, ...req.body.authorizedUserIds]);
  doc.assignedLawyerId = assigned;
  doc.authorizedUserIds = authorized;
  doc.updatedBy = req.user._id;
  await doc.save();
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'case.access_updated',
    entityType: 'Case',
    entityId: doc._id,
    requestId: req.requestId,
    metadata: { assignedLawyerId: assigned },
  });
  sendSuccess(res, { case: doc }, 'Case access updated');
});

export const caseHearings = asyncHandler(async (req, res) => {
  const doc = await getAccessibleCase(req.user, req.params.id);
  const items = await Hearing.find({ teamId: req.user.teamId, caseId: doc._id }).sort({ scheduledAt: -1 });
  sendSuccess(res, { items }, 'Hearings loaded');
});

export const caseTasks = asyncHandler(async (req, res) => {
  const doc = await getAccessibleCase(req.user, req.params.id);
  const items = await Task.find({ teamId: req.user.teamId, caseId: doc._id })
    .populate('assignedTo', 'name')
    .sort({ dueAt: 1 });
  sendSuccess(res, { items }, 'Tasks loaded');
});
