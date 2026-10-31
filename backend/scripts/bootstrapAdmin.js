import { connectDb, disconnectDb } from '../src/config/db.js';
import { Team, User } from '../src/models/index.js';
import { hashPassword, normalizeEmail } from '../src/utils/crypto.js';

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.BOOTSTRAP_ADMIN_EMAIL) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL is required');
  }
  const email = normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL);
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Practice Administrator';
  const teamName = process.env.BOOTSTRAP_TEAM_NAME || 'Lexora Chambers';
  if (!email || !password || password.length < 10) {
    throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (min 10 characters).');
  }
  await connectDb();
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    throw new Error('Bootstrap refused: users already exist.');
  }
  const team = await Team.create({ name: teamName });
  const admin = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
    teamId: team._id,
    isActive: true,
  });
  team.createdBy = admin._id;
  await team.save();
  console.log(`Created team "${team.name}" and admin ${admin.email}`);
  await disconnectDb();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
