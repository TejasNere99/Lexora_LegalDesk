import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/config/db.js';

const LOCAL_URI = 'mongodb://127.0.0.1:27017/lexora_legaldesk';

async function main() {
  console.log('Connecting to local MongoDB (source)...');
  const localConn = await mongoose.createConnection(LOCAL_URI, {
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  console.log('Connecting to MongoDB Atlas (destination)...');
  await connectDb(env.mongoUri);
  const atlasDb = mongoose.connection.db;

  const collections = await localConn.db.listCollections().toArray();
  console.log(`Found ${collections.length} collections in local database.`);

  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;

    const sourceCol = localConn.collection(name);
    const targetCol = atlasDb.collection(name);

    const docs = await sourceCol.find({}).toArray();
    console.log(`Syncing collection "${name}": ${docs.length} documents...`);

    if (docs.length > 0) {
      const operations = docs.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      }));
      await targetCol.bulkWrite(operations, { ordered: false });
    }

    const targetCount = await targetCol.countDocuments();
    console.log(` -> "${name}" in Atlas now has ${targetCount} documents.`);
  }

  console.log('Data synchronization from local to Atlas completed successfully!');

  await localConn.close();
  await disconnectDb();
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
