import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimits.js';
import { validate } from '../middleware/validate.js';
import * as auth from '../controllers/auth.controller.js';
import * as clients from '../controllers/client.controller.js';
import * as cases from '../controllers/case.controller.js';
import * as hearings from '../controllers/hearing.controller.js';
import * as tasks from '../controllers/task.controller.js';
import * as team from '../controllers/team.controller.js';
import * as dashboard from '../controllers/dashboard.controller.js';
import {
  acceptInviteSchema,
  caseAccessSchema,
  caseCreateSchema,
  casePatchSchema,
  changePasswordSchema,
  clientCreateSchema,
  clientPatchSchema,
  forgotSchema,
  hearingCreateSchema,
  hearingPatchSchema,
  interactionCreateSchema,
  invitationSchema,
  loginSchema,
  memberPatchSchema,
  profileSchema,
  resetSchema,
  taskCreateSchema,
  taskPatchSchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/auth/csrf', auth.csrf);
router.post('/auth/login', authLimiter, validate(loginSchema), auth.login);
router.post('/auth/logout', auth.logout);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/forgot-password', authLimiter, validate(forgotSchema), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(resetSchema), auth.resetPassword);
router.post('/auth/accept-invitation', authLimiter, validate(acceptInviteSchema), auth.acceptInvitation);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/me', requireAuth, validate(profileSchema), auth.updateMe);
router.post('/auth/change-password', requireAuth, sensitiveLimiter, validate(changePasswordSchema), auth.changePassword);

router.get('/clients', requireAuth, clients.listClients);
router.post('/clients', requireAuth, validate(clientCreateSchema), clients.createClient);
router.get('/clients/:id', requireAuth, clients.getClient);
router.patch('/clients/:id', requireAuth, validate(clientPatchSchema), clients.patchClient);
router.post('/clients/:id/archive', requireAuth, clients.archiveClient);
router.get('/clients/:id/interactions', requireAuth, clients.listInteractions);
router.post('/interactions', requireAuth, validate(interactionCreateSchema), clients.createInteraction);

router.get('/cases', requireAuth, cases.listCases);
router.post('/cases', requireAuth, validate(caseCreateSchema), cases.createCase);
router.get('/cases/:id', requireAuth, cases.getCase);
router.patch('/cases/:id', requireAuth, validate(casePatchSchema), cases.patchCase);
router.post('/cases/:id/archive', requireAuth, cases.archiveCase);
router.post('/cases/:id/restore', requireAuth, cases.restoreCase);
router.patch('/cases/:id/access', requireAuth, validate(caseAccessSchema), cases.updateAccess);
router.get('/cases/:id/hearings', requireAuth, cases.caseHearings);
router.get('/cases/:id/tasks', requireAuth, cases.caseTasks);

router.get('/hearings', requireAuth, hearings.listHearings);
router.post('/hearings', requireAuth, validate(hearingCreateSchema), hearings.createHearing);
router.get('/hearings/:id', requireAuth, hearings.getHearing);
router.patch('/hearings/:id', requireAuth, validate(hearingPatchSchema), hearings.patchHearing);
router.post('/hearings/:id/cancel', requireAuth, hearings.cancelHearing);

router.get('/tasks', requireAuth, tasks.listTasks);
router.post('/tasks', requireAuth, validate(taskCreateSchema), tasks.createTask);
router.get('/tasks/:id', requireAuth, tasks.getTask);
router.patch('/tasks/:id', requireAuth, validate(taskPatchSchema), tasks.patchTask);
router.post('/tasks/:id/complete', requireAuth, tasks.completeTask);
router.post('/tasks/:id/reopen', requireAuth, tasks.reopenTask);

router.get('/team/members', requireAuth, team.listMembers);
router.post('/team/invitations', requireAuth, requireAdmin, validate(invitationSchema), team.inviteMember);
router.patch('/team/members/:id', requireAuth, requireAdmin, validate(memberPatchSchema), team.patchMember);
router.post('/team/members/:id/deactivate', requireAuth, requireAdmin, team.deactivateMember);

router.get('/dashboard/summary', requireAuth, dashboard.summary);
router.get('/dashboard/agenda', requireAuth, dashboard.agenda);
router.get('/reports', requireAuth, dashboard.reports);
router.get('/audit-logs', requireAuth, requireAdmin, team.listAuditLogs);

export const apiRouter = router;
