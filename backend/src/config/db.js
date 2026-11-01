import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected. Waiting for reconnection...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Connection re-established.');
  });

  await mongoose.connect(uri, {
    autoIndex: !env.isProd,
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  const dbName = mongoose.connection.name;
  console.log(`[MongoDB] Connected successfully to database: "${dbName}"`);
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

export function dbHealth() {
  const state = mongoose.connection.readyState;
  const labels = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return {
    status: state === 1 ? 'ok' : 'unavailable',
    connection: labels[state] || 'unknown',
  };
}
