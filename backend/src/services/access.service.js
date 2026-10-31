import mongoose from 'mongoose';
import { Case, Client, Task, User } from '../models/index.js';
import { isObjectId, notFound } from '../utils/http.js';

export function asId(value) {
  return new mongoose.Types.ObjectId(value);
}

export function caseAccessFilter(user) {
  return {
    teamId: user.teamId,
    $or: [{ assignedLawyerId: user._id }, { authorizedUserIds: user._id }],
  };
}

export async function getAccessibleCase(user, caseId) {
  if (!isObjectId(caseId)) throw notFound();
  const doc = await Case.findOne({ _id: caseId, ...caseAccessFilter(user) });
  if (!doc) throw notFound();
  return doc;
}

export async function getTeamCaseForAdminAccess(user, caseId) {
  if (!isObjectId(caseId)) throw notFound();
  if (user.role === 'admin') {
    const doc = await Case.findOne({ _id: caseId, teamId: user.teamId });
    if (!doc) throw notFound();
    return doc;
  }
  return getAccessibleCase(user, caseId);
}

export function canManageCaseAccess(user, caseDoc) {
  return (
    user.role === 'admin' ||
    String(caseDoc.assignedLawyerId) === String(user._id) ||
    String(caseDoc.createdBy) === String(user._id)
  );
}

export async function accessibleClientIds(user) {
  if (user.role === 'admin') {
    const clients = await Client.find({ teamId: user.teamId }).select('_id');
    return clients.map((c) => c._id);
  }
  const cases = await Case.find(caseAccessFilter(user)).select('clientIds');
  const fromCases = cases.flatMap((c) => c.clientIds);
  const assigned = await Client.find({
    teamId: user.teamId,
    $or: [{ assignedLawyerId: user._id }, { createdBy: user._id }],
  }).select('_id');
  return [...new Set([...fromCases, ...assigned.map((c) => c._id)].map(String))].map(asId);
}

export function clientAccessFilter(user, ids) {
  if (user.role === 'admin') return { teamId: user.teamId };
  return { teamId: user.teamId, _id: { $in: ids } };
}

export async function getAccessibleClient(user, clientId) {
  if (!isObjectId(clientId)) throw notFound();
  const ids = await accessibleClientIds(user);
  const doc = await Client.findOne({ _id: clientId, ...clientAccessFilter(user, ids) });
  if (!doc) throw notFound();
  return doc;
}

export async function assertSameTeamUsers(teamId, userIds) {
  const unique = [...new Set(userIds.filter(Boolean).map(String))];
  if (!unique.length) return [];
  if (unique.some((id) => !isObjectId(id))) throw notFound();
  const count = await User.countDocuments({ _id: { $in: unique }, teamId, isActive: true });
  if (count !== unique.length) throw notFound();
  return unique.map(asId);
}

export async function canAccessTask(user, task) {
  if (String(task.teamId) !== String(user.teamId)) return false;
  if (String(task.assignedTo) === String(user._id) || String(task.createdBy) === String(user._id)) {
    if (!task.caseId) return true;
  }
  if (task.caseId) {
    try {
      await getAccessibleCase(user, task.caseId);
      return true;
    } catch {
      return false;
    }
  }
  return user.role === 'admin';
}

export async function getAccessibleTask(user, taskId) {
  if (!isObjectId(taskId)) throw notFound();
  const task = await Task.findOne({ _id: taskId, teamId: user.teamId });
  if (!task || !(await canAccessTask(user, task))) throw notFound();
  return task;
}

export function canEditTask(user, task) {
  return (
    String(task.assignedTo) === String(user._id) ||
    String(task.createdBy) === String(user._id) ||
    user.role === 'admin'
  );
}
