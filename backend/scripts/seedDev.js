import { connectDb, disconnectDb } from '../src/config/db.js';
import { Case, Client, Hearing, Task, Team, User } from '../src/models/index.js';
import { nextSeq } from '../src/models/Counter.js';
import { hashPassword } from '../src/utils/crypto.js';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }
  await connectDb();
  const team =
    (await Team.findOne({ name: 'Dev Chambers' })) || (await Team.create({ name: 'Dev Chambers' }));
  const passwordHash = await hashPassword('DevPassphrase!1');
  const admin =
    (await User.findOne({ email: 'admin@lexora.dev' })) ||
    (await User.create({
      name: 'Asha Menon',
      email: 'admin@lexora.dev',
      passwordHash,
      role: 'admin',
      teamId: team._id,
    }));
  const lawyer =
    (await User.findOne({ email: 'lawyer@lexora.dev' })) ||
    (await User.create({
      name: 'Rahul Iyer',
      email: 'lawyer@lexora.dev',
      passwordHash,
      role: 'lawyer',
      teamId: team._id,
    }));
  const outsiderTeam = (await Team.findOne({ name: 'Other Firm' })) || (await Team.create({ name: 'Other Firm' }));
  (await User.findOne({ email: 'outsider@lexora.dev' })) ||
    (await User.create({
      name: 'Outside Counsel',
      email: 'outsider@lexora.dev',
      passwordHash,
      role: 'lawyer',
      teamId: outsiderTeam._id,
    }));

  let client = await Client.findOne({ teamId: team._id, name: 'Northwind Traders' });
  if (!client) {
    client = await Client.create({
      teamId: team._id,
      name: 'Northwind Traders',
      email: 'ops@northwind.example',
      phone: '5550100',
      assignedLawyerId: lawyer._id,
      createdBy: admin._id,
      updatedBy: admin._id,
    });
  }
  let caseDoc = await Case.findOne({ teamId: team._id, title: 'Contract review workspace' });
  if (!caseDoc) {
    const year = new Date().getUTCFullYear();
    const seq = await nextSeq(team._id, `case-${year}`);
    caseDoc = await Case.create({
      teamId: team._id,
      internalId: `LEX-${year}-${String(seq).padStart(4, '0')}`,
      title: 'Contract review workspace',
      caseType: 'Commercial',
      court: 'City Civil Court',
      clientIds: [client._id],
      assignedLawyerId: lawyer._id,
      authorizedUserIds: [lawyer._id, admin._id],
      status: 'active',
      createdBy: admin._id,
      updatedBy: admin._id,
    });
    await Hearing.create({
      teamId: team._id,
      caseId: caseDoc._id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      court: 'City Civil Court',
      hearingType: 'Mention',
      createdBy: admin._id,
      updatedBy: admin._id,
    });
    await Task.create({
      teamId: team._id,
      title: 'Prepare hearing brief',
      caseId: caseDoc._id,
      assignedTo: lawyer._id,
      createdBy: admin._id,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      priority: 'high',
    });
  }
  console.log('Development seed complete. Admin: admin@lexora.dev / DevPassphrase!1');
  await disconnectDb();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
