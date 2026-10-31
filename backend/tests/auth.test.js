import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTeamUser, csrfAgent, login, startTestApp, stopTestApp } from './helpers.js';

let app;
let mongo;

describe('auth', () => {
  before(async () => {
    ({ app, mongo } = await startTestApp());
  });
  after(async () => {
    await stopTestApp(mongo);
  });

  it('rejects invalid credentials with a generic message', async () => {
    const { password } = await createTeamUser({ email: 'a@lexora.test', name: 'Asha', role: 'admin' });
    const agent = await csrfAgent(app);
    const res = await agent.post('/api/v1/auth/login').send({ email: 'a@lexora.test', password: `${password}x` });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('signs in an active user and returns /me', async () => {
    const { password } = await createTeamUser({ email: 'b@lexora.test', name: 'Rahul', role: 'lawyer' });
    const agent = await login(app, 'b@lexora.test', password);
    const me = await agent.get('/api/v1/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, 'b@lexora.test');
    assert.equal(me.body.data.user.passwordHash, undefined);
  });

  it('blocks unauthenticated access', async () => {
    const agent = await csrfAgent(app);
    const res = await agent.get('/api/v1/clients');
    assert.equal(res.status, 401);
  });

  it('rejects deactivated accounts on login and after deactivation', async () => {
    const { user, team, password } = await createTeamUser({
      email: 'admin-deact@lexora.test',
      name: 'Admin',
      role: 'admin',
    });
    await createTeamUser({
      email: 'inactive@lexora.test',
      name: 'Gone',
      role: 'lawyer',
      team,
      isActive: false,
    });
    const fail = await (await csrfAgent(app))
      .post('/api/v1/auth/login')
      .send({ email: 'inactive@lexora.test', password });
    assert.equal(fail.status, 401);

    const lawyer = await createTeamUser({
      email: 'soonoff@lexora.test',
      name: 'Soon',
      role: 'lawyer',
      team,
    });
    const lawyerAgent = await login(app, lawyer.user.email, lawyer.password);
    const adminAgent = await login(app, user.email, password);
    const deact = await adminAgent.post(`/api/v1/team/members/${lawyer.user._id}/deactivate`);
    assert.equal(deact.status, 200);
    const blocked = await lawyerAgent.get('/api/v1/auth/me');
    assert.equal(blocked.status, 401);
  });

  it('rejects mass assignment of role on profile update', async () => {
    const { password } = await createTeamUser({ email: 'role@lexora.test', name: 'Lee', role: 'lawyer' });
    const agent = await login(app, 'role@lexora.test', password);
    const res = await agent.patch('/api/v1/auth/me').send({ role: 'admin', name: 'Lee Updated' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'lawyer');
    assert.equal(res.body.data.user.name, 'Lee Updated');
  });
});
