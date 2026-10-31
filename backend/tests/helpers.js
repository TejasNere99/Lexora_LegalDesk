import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Team, User } from '../src/models/index.js';
import { hashPassword } from '../src/utils/crypto.js';

export async function startTestApp() {
  process.env.NODE_ENV = 'test';
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const app = createApp();
  return { app, mongo };
}

export async function stopTestApp(mongo) {
  await mongoose.disconnect();
  await mongo.stop();
}

export async function createTeamUser({
  email,
  name,
  role = 'lawyer',
  password = 'CorrectHorse!1',
  team,
  isActive = true,
}) {
  const ownedTeam = team || (await Team.create({ name: `Team ${email}` }));
  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    teamId: ownedTeam._id,
    isActive,
  });
  return { user, team: ownedTeam, password };
}

export async function csrfAgent(app) {
  const agent = request.agent(app);
  const res = await agent.get('/api/v1/auth/csrf');
  const token = res.body.data.csrfToken;
  agent.set('X-CSRF-Token', token);
  return agent;
}

export async function login(app, email, password) {
  const agent = await csrfAgent(app);
  const res = await agent.post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const refreshed = res.headers['set-cookie']?.find((c) => c.startsWith('lexora_csrf='));
  if (refreshed) {
    const value = refreshed.split('=')[1].split(';')[0];
    agent.set('X-CSRF-Token', value);
  }
  return agent;
}
