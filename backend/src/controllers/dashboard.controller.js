import { Case, Client, Hearing, Task } from '../models/index.js';
import { caseAccessFilter } from '../services/access.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/http.js';

function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export const summary = asyncHandler(async (req, res) => {
  const access = caseAccessFilter(req.user);
  const { start, end } = dayBounds();
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const cases = await Case.find({ ...access, archivedAt: null }).select('_id status assignedLawyerId updatedAt title internalId');
  const caseIds = cases.map((c) => c._id);
  const [todayHearings, pendingTasks, overdueTasks, followUps, recentCases] = await Promise.all([
    Hearing.find({
      teamId: req.user.teamId,
      caseId: { $in: caseIds },
      cancelledAt: null,
      scheduledAt: { $gte: start, $lt: end },
    })
      .populate('caseId', 'title internalId')
      .sort({ scheduledAt: 1 }),
    Task.countDocuments({
      teamId: req.user.teamId,
      assignedTo: req.user._id,
      status: { $in: ['todo', 'in_progress'] },
    }),
    Task.find({
      teamId: req.user.teamId,
      assignedTo: req.user._id,
      status: { $in: ['todo', 'in_progress'] },
      dueAt: { $lt: start },
    })
      .sort({ dueAt: 1 })
      .limit(8),
    Client.find({
      teamId: req.user.teamId,
      assignedLawyerId: req.user._id,
      archivedAt: null,
      nextFollowUpAt: { $gte: start, $lte: soon },
    })
      .select('name nextFollowUpAt')
      .sort({ nextFollowUpAt: 1 })
      .limit(8),
    Case.find({ ...access, archivedAt: null }).sort({ updatedAt: -1 }).limit(6).select('title internalId status updatedAt'),
  ]);
  const upcomingHearings = await Hearing.find({
    teamId: req.user.teamId,
    caseId: { $in: caseIds },
    cancelledAt: null,
    scheduledAt: { $gte: end, $lte: soon },
  })
    .populate('caseId', 'title internalId')
    .sort({ scheduledAt: 1 })
    .limit(8);

  sendSuccess(
    res,
    {
      activeCases: cases.filter((c) => c.status === 'active' || c.status === 'pending').length,
      todayHearings: todayHearings.length,
      pendingTasks,
      overdueTasks: overdueTasks.length,
      followUps: followUps.length,
      cards: {
        todayHearings,
        overdueTasks,
        followUps,
        upcomingHearings,
        recentCases,
      },
    },
    'Dashboard loaded',
  );
});

export const agenda = asyncHandler(async (req, res) => {
  const access = caseAccessFilter(req.user);
  const cases = await Case.find(access).select('_id');
  const caseIds = cases.map((c) => c._id);
  const from = req.query.from ? new Date(req.query.from) : new Date();
  const to = req.query.to ? new Date(req.query.to) : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hearings = await Hearing.find({
    teamId: req.user.teamId,
    caseId: { $in: caseIds },
    cancelledAt: null,
    scheduledAt: { $gte: from, $lte: to },
  })
    .populate('caseId', 'title internalId court')
    .sort({ scheduledAt: 1 });
  const tasks = await Task.find({
    teamId: req.user.teamId,
    assignedTo: req.user._id,
    dueAt: { $gte: from, $lte: to },
    status: { $in: ['todo', 'in_progress'] },
  }).sort({ dueAt: 1 });
  sendSuccess(res, { hearings, tasks, from, to }, 'Agenda loaded');
});

export const reports = asyncHandler(async (req, res) => {
  const access = caseAccessFilter(req.user);
  const cases = await Case.find({ ...access, archivedAt: null }).select('status assignedLawyerId');
  const byStatus = cases.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const completed = await Task.countDocuments({
    teamId: req.user.teamId,
    assignedTo: req.user._id,
    status: 'completed',
    completedAt: { $gte: from, $lte: to },
  });
  const overdue = await Task.countDocuments({
    teamId: req.user.teamId,
    assignedTo: req.user._id,
    status: { $in: ['todo', 'in_progress'] },
    dueAt: { $lt: new Date() },
  });
  let workload = [];
  if (req.user.role === 'admin') {
    const members = await Task.aggregate([
      { $match: { teamId: req.user.teamId, status: { $in: ['todo', 'in_progress'] } } },
      { $group: { _id: '$assignedTo', openTasks: { $sum: 1 } } },
    ]);
    workload = members;
  }
  sendSuccess(res, { byStatus, completed, overdue, workload, from, to }, 'Report loaded');
});
