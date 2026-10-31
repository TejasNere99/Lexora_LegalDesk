import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Case } from '../src/models/index.js';
import { createTeamUser, login, startTestApp, stopTestApp } from './helpers.js';

let app;
let mongo;

describe('authorization', () => {
  before(async () => {
    ({ app, mongo } = await startTestApp());
  });
  after(async () => {
    await stopTestApp(mongo);
  });

  it('blocks cross-team and unauthorized case access', async () => {
    const teamA = await createTeamUser({ email: 'admin.a@lexora.test', name: 'Admin A', role: 'admin' });
    const lawyerA = await createTeamUser({
      email: 'lawyer.a@lexora.test',
      name: 'Lawyer A',
      role: 'lawyer',
      team: teamA.team,
    });
    const teamB = await createTeamUser({ email: 'admin.b@lexora.test', name: 'Admin B', role: 'admin' });
    const agentA = await login(app, lawyerA.user.email, lawyerA.password);
    const agentB = await login(app, teamB.user.email, teamB.password);

    const clientRes = await agentA.post('/api/v1/clients').send({ name: 'Confidential Client' });
    assert.equal(clientRes.status, 201);
    const clientId = clientRes.body.data.client._id;

    const caseRes = await agentA.post('/api/v1/cases').send({
      title: 'Sealed matter',
      clientIds: [clientId],
    });
    assert.equal(caseRes.status, 201);
    const caseId = caseRes.body.data.case._id;

    const other = await agentB.get(`/api/v1/cases/${caseId}`);
    assert.equal(other.status, 404);

    const invalid = await agentA.get('/api/v1/cases/not-an-id');
    assert.equal(invalid.status, 404);

    const missing = await agentA.get(`/api/v1/cases/${new mongoose.Types.ObjectId()}`);
    assert.equal(missing.status, 404);

    const mass = await agentA.patch(`/api/v1/cases/${caseId}`).send({
      teamId: teamB.team._id,
      role: 'admin',
      title: 'Sealed matter updated',
    });
    assert.equal(mass.status, 200);
    const stored = await Case.findById(caseId);
    assert.equal(String(stored.teamId), String(teamA.team._id));
    assert.equal(stored.title, 'Sealed matter updated');

    const outsiderClient = await agentB.get(`/api/v1/clients/${clientId}`);
    assert.equal(outsiderClient.status, 404);

    const hearing = await agentB.post('/api/v1/hearings').send({
      caseId,
      scheduledAt: new Date().toISOString(),
    });
    assert.equal(hearing.status, 404);
  });

  it('does not let a lawyer without case access read nested records', async () => {
    const admin = await createTeamUser({ email: 'admin.c@lexora.test', name: 'Admin C', role: 'admin' });
    const owner = await createTeamUser({
      email: 'owner.c@lexora.test',
      name: 'Owner',
      role: 'lawyer',
      team: admin.team,
    });
    const other = await createTeamUser({
      email: 'other.c@lexora.test',
      name: 'Other',
      role: 'lawyer',
      team: admin.team,
    });
    const ownerAgent = await login(app, owner.user.email, owner.password);
    const otherAgent = await login(app, other.user.email, other.password);
    const client = await ownerAgent.post('/api/v1/clients').send({ name: 'Limited Client' });
    const created = await ownerAgent.post('/api/v1/cases').send({
      title: 'Limited case',
      clientIds: [client.body.data.client._id],
    });
    const caseId = created.body.data.case._id;
    const peek = await otherAgent.get(`/api/v1/cases/${caseId}`);
    assert.equal(peek.status, 404);
    const tasks = await otherAgent.get(`/api/v1/cases/${caseId}/tasks`);
    assert.equal(tasks.status, 404);
  });

  it('records audit events and hides them from lawyers', async () => {
    const admin = await createTeamUser({ email: 'admin.d@lexora.test', name: 'Admin D', role: 'admin' });
    const lawyer = await createTeamUser({
      email: 'lawyer.d@lexora.test',
      name: 'Lawyer D',
      role: 'lawyer',
      team: admin.team,
    });
    const adminAgent = await login(app, admin.user.email, admin.password);
    const lawyerAgent = await login(app, lawyer.user.email, lawyer.password);
    await adminAgent.post('/api/v1/clients').send({ name: 'Audit Client' });
    const lawyerLogs = await lawyerAgent.get('/api/v1/audit-logs');
    assert.equal(lawyerLogs.status, 403);
    const adminLogs = await adminAgent.get('/api/v1/audit-logs');
    assert.equal(adminLogs.status, 200);
    assert.ok(adminLogs.body.data.items.length >= 1);
  });

  it('completes tasks and preserves hearing date history', async () => {
    const lawyer = await createTeamUser({ email: 'hist@lexora.test', name: 'Hist', role: 'lawyer' });
    const agent = await login(app, lawyer.user.email, lawyer.password);
    const client = await agent.post('/api/v1/clients').send({ name: 'History Client' });
    const created = await agent.post('/api/v1/cases').send({
      title: 'History case',
      clientIds: [client.body.data.client._id],
      status: 'active',
    });
    const caseId = created.body.data.case._id;
    const first = new Date(Date.now() + 86400000).toISOString();
    const hearing = await agent.post('/api/v1/hearings').send({
      caseId,
      scheduledAt: first,
      court: 'District Court',
    });
    assert.equal(hearing.status, 201);
    const later = new Date(Date.now() + 5 * 86400000).toISOString();
    const patched = await agent.patch(`/api/v1/hearings/${hearing.body.data.hearing._id}`).send({
      scheduledAt: later,
    });
    assert.equal(patched.status, 200);
    const detail = await agent.get(`/api/v1/hearings/${hearing.body.data.hearing._id}`);
    assert.ok(detail.body.data.history.length >= 1);

    const task = await agent.post('/api/v1/tasks').send({
      title: 'File memo',
      assignedTo: String(lawyer.user._id),
      caseId,
    });
    const done = await agent.post(`/api/v1/tasks/${task.body.data.task._id}/complete`);
    assert.equal(done.status, 200);
    assert.equal(done.body.data.task.status, 'completed');
    const dashboard = await agent.get('/api/v1/dashboard/summary');
    assert.equal(dashboard.status, 200);
    assert.ok(dashboard.body.data.activeCases >= 1);
  });
});
