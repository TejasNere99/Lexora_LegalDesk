import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();

async function start() {
  await connectDb();
  const server = app.listen(env.port, () => {
    console.log(`Lexora LegalDesk API listening on port ${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[Process] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('[Process] HTTP server closed.');
      await disconnectDb();
      console.log('[Process] Database disconnected. Exiting.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[Process] Forceful shutdown: timeout exceeded.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server');
  console.error(err.message);
  process.exit(1);
});
