import { Case, Task } from '../models/index.js';
import {
  assertSameTeamUsers,
  canEditTask,
  caseAccessFilter,
  getAccessibleCase,
  getAccessibleClient,
  getAccessibleTask,
} from '../services/access.service.js';
import { writeAudit } from '../services/audit.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, escapeRegex, isObjectId, parsePagination, sendSuccess } from '../utils/http.js';

export const listTasks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const cases = await Case.find(caseAccessFilter(req.user)).select('_id');
  const filter = {
    teamId: req.user.teamId,
    $or: [
      { assignedTo: req.user._id },
      { createdBy: req.user._id },
      { caseId: { $in: cases.map((c) => c._id) } },
    ],
  };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.assignedTo) {
    if (req.query.assignedTo === 'me') {
      filter.assignedTo = req.user._id;
    } else if (isObjectId(req.query.assignedTo)) {
      filter.assignedTo = req.query.assignedTo;
    }
  }
  if (req.query.q) filter.title = { $regex: escapeRegex(req.query.q), $options: 'i' };
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  if (req.query.scope === 'overdue') {
    filter.status = { $in: ['todo', 'in_progress'] };
    filter.dueAt = { $lt: start };
  }
  if (req.query.scope === 'today') {
    filter.dueAt = { $gte: start, $lt: end };
  }
  if (req.query.scope === 'upcoming') {
    filter.status = { $in: ['todo', 'in_progress'] };
    filter.dueAt = { $gte: end };
  }
  const [items, total] = await Promise.all([
    Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('caseId', 'title internalId')
      .populate('clientId', 'name')
      .sort({ dueAt: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);
  sendSuccess(res, { items, page, limit, total }, 'Tasks loaded');
});

export const createTask = asyncHandler(async (req, res) => {
  await assertSameTeamUsers(req.user.teamId, [req.body.assignedTo]);
  if (req.body.caseId) await getAccessibleCase(req.user, req.body.caseId);
  if (req.body.clientId) await getAccessibleClient(req.user, req.body.clientId);
  const task = await Task.create({
    teamId: req.user.teamId,
    title: req.body.title,
    description: req.body.description || '',
    caseId: req.body.caseId || undefined,
    clientId: req.body.clientId || undefined,
    assignedTo: req.body.assignedTo,
    createdBy: req.user._id,
    updatedBy: req.user._id,
    dueAt: req.body.dueAt || null,
    priority: req.body.priority || 'normal',
    status: req.body.status || 'todo',
  });
  sendSuccess(res, { task }, 'Task created', 201);
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await getAccessibleTask(req.user, req.params.id);
  await task.populate([
    { path: 'assignedTo', select: 'name email' },
    { path: 'caseId', select: 'title internalId' },
    { path: 'clientId', select: 'name' },
  ]);
  sendSuccess(res, { task }, 'Task loaded');
});

export const patchTask = asyncHandler(async (req, res) => {
  const task = await getAccessibleTask(req.user, req.params.id);
  if (!canEditTask(req.user, task)) {
    throw new AppError('You do not have permission to complete this action', { status: 403, code: 'FORBIDDEN' });
  }
  if (req.body.assignedTo) await assertSameTeamUsers(req.user.teamId, [req.body.assignedTo]);
  if (req.body.caseId) await getAccessibleCase(req.user, req.body.caseId);
  const allow = ['title', 'description', 'caseId', 'clientId', 'assignedTo', 'dueAt', 'priority', 'status'];
  for (const key of allow) {
    if (req.body[key] !== undefined) task[key] = req.body[key] || null;
  }
  task.updatedBy = req.user._id;
  await task.save();
  sendSuccess(res, { task }, 'Task updated');
});

export const completeTask = asyncHandler(async (req, res) => {
  const task = await getAccessibleTask(req.user, req.params.id);
  if (!canEditTask(req.user, task)) {
    throw new AppError('You do not have permission to complete this action', { status: 403, code: 'FORBIDDEN' });
  }
  task.status = 'completed';
  task.completedAt = new Date();
  task.completedBy = req.user._id;
  task.updatedBy = req.user._id;
  await task.save();
  await writeAudit({
    teamId: req.user.teamId,
    actorId: req.user._id,
    action: 'task.completed',
    entityType: 'Task',
    entityId: task._id,
    requestId: req.requestId,
    metadata: { status: 'completed' },
  });
  sendSuccess(res, { task }, 'Task marked complete');
});

export const reopenTask = asyncHandler(async (req, res) => {
  const task = await getAccessibleTask(req.user, req.params.id);
  if (!canEditTask(req.user, task)) {
    throw new AppError('You do not have permission to complete this action', { status: 403, code: 'FORBIDDEN' });
  }
  task.status = 'todo';
  task.completedAt = null;
  task.completedBy = undefined;
  task.updatedBy = req.user._id;
  await task.save();
  sendSuccess(res, { task }, 'Task reopened');
});
