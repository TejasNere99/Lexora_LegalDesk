import { Case, Hearing, HearingHistory } from '../models/index.js';
import { caseAccessFilter, getAccessibleCase } from '../services/access.service.js';
import { writeAudit } from '../services/audit.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isObjectId, notFound, parsePagination, sendSuccess } from '../utils/http.js';

export const listHearings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const cases = await Case.find(caseAccessFilter(req.user)).select('_id');
  const caseIds = cases.map((c) => c._id);
  const filter = { teamId: req.user.teamId, caseId: { $in: caseIds } };
  if (req.query.from || req.query.to) {
    filter.scheduledAt = {};
    if (req.query.from) filter.scheduledAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.scheduledAt.$lte = new Date(req.query.to);
  }
  if (req.query.scope === 'upcoming') {
    filter.scheduledAt = { ...(filter.scheduledAt || {}), $gte: new Date() };
    filter.cancelledAt = null;
  }
  if (req.query.scope === 'past') {
    filter.scheduledAt = { ...(filter.scheduledAt || {}), $lt: new Date() };
  }
  if (req.query.caseId) {
    if (!isObjectId(req.query.caseId)) throw notFound();
    await getAccessibleCase(req.user, req.query.caseId);
    filter.caseId = req.query.caseId;
  }
  const [items, total] = await Promise.all([
    Hearing.find(filter)
      .populate({ path: 'caseId', select: 'title internalId court' })
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit),
    Hearing.countDocuments(filter),
  ]);
  sendSuccess(res, { items, page, limit, total }, 'Hearings loaded');
});

export const createHearing = asyncHandler(async (req, res) => {
  const caseDoc = await getAccessibleCase(req.user, req.body.caseId);
  const hearing = await Hearing.create({
    teamId: req.user.teamId,
    caseId: caseDoc._id,
    scheduledAt: new Date(req.body.scheduledAt),
    court: req.body.court || caseDoc.court || '',
    hearingType: req.body.hearingType || '',
    notes: req.body.notes || '',
    outcome: req.body.outcome || '',
    nextAction: req.body.nextAction || '',
    nextHearingAt: req.body.nextHearingAt || null,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });
  caseDoc.nextHearingAt = hearing.scheduledAt;
  caseDoc.updatedBy = req.user._id;
  await caseDoc.save();
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'hearing.created',
    entityType: 'Hearing',
    entityId: hearing._id,
    requestId: req.requestId,
  });
  sendSuccess(res, { hearing }, 'Hearing scheduled', 201);
});

export const getHearing = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const hearing = await Hearing.findOne({ _id: req.params.id, teamId: req.user.teamId });
  if (!hearing) throw notFound();
  await getAccessibleCase(req.user, hearing.caseId);
  const history = await HearingHistory.find({ hearingId: hearing._id }).sort({ createdAt: -1 });
  sendSuccess(res, { hearing, history }, 'Hearing loaded');
});

export const patchHearing = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const hearing = await Hearing.findOne({ _id: req.params.id, teamId: req.user.teamId });
  if (!hearing) throw notFound();
  const caseDoc = await getAccessibleCase(req.user, hearing.caseId);
  const previous = hearing.scheduledAt;
  const allow = ['court', 'hearingType', 'notes', 'outcome', 'nextAction', 'nextHearingAt'];
  for (const key of allow) {
    if (req.body[key] !== undefined) hearing[key] = req.body[key];
  }
  if (req.body.scheduledAt) {
    hearing.scheduledAt = new Date(req.body.scheduledAt);
    if (previous.getTime() !== hearing.scheduledAt.getTime()) {
      await HearingHistory.create({
        teamId: req.user.teamId,
        hearingId: hearing._id,
        caseId: hearing.caseId,
        previousScheduledAt: previous,
        nextScheduledAt: hearing.scheduledAt,
        changedBy: req.user._id,
        reason: req.body.notes || '',
      });
      await writeAudit({
        teamId: req.user.teamId,
        actorId: req.user._id,
        action: 'hearing.date_changed',
        entityType: 'Hearing',
        entityId: hearing._id,
        requestId: req.requestId,
        metadata: { from: previous.toISOString(), to: hearing.scheduledAt.toISOString() },
      });
    }
  }
  hearing.updatedBy = req.user._id;
  await hearing.save();
  const nextOpen = await Hearing.findOne({
    caseId: caseDoc._id,
    cancelledAt: null,
    scheduledAt: { $gte: new Date() },
  }).sort({ scheduledAt: 1 });
  caseDoc.nextHearingAt = nextOpen?.scheduledAt || hearing.scheduledAt;
  caseDoc.updatedBy = req.user._id;
  await caseDoc.save();
  sendSuccess(res, { hearing }, 'Hearing updated');
});

export const cancelHearing = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const hearing = await Hearing.findOne({ _id: req.params.id, teamId: req.user.teamId });
  if (!hearing) throw notFound();
  await getAccessibleCase(req.user, hearing.caseId);
  hearing.cancelledAt = new Date();
  hearing.updatedBy = req.user._id;
  await hearing.save();
  sendSuccess(res, { hearing }, 'Hearing cancelled');
});
