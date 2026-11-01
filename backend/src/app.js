import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { dbHealth } from './config/db.js';
import { apiRouter } from './routes/index.js';
import { requestId } from './middleware/requestId.js';
import { csrfProtect } from './middleware/csrf.js';
import { apiLimiter } from './middleware/rateLimits.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(requestId);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", '*'],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const configuredOrigins = env.frontendUrl
    ? env.frontendUrl.split(',').map((u) => u.trim().replace(/\/+$/, '')).filter(Boolean)
    : [];

  const defaultDevOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];

  const allowedOrigins = [...new Set([...configuredOrigins, ...defaultDevOrigins])];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/+$/, '');
        const isExactMatch = allowedOrigins.includes(normalized);
        const isLocalDev =
          !env.isProd &&
          (normalized.startsWith('http://localhost:') || normalized.startsWith('http://127.0.0.1:'));
        const isVercelPreview =
          env.frontendUrl && env.frontendUrl.includes('vercel.app') && normalized.endsWith('.vercel.app');

        if (isExactMatch || isLocalDev || isVercelPreview) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  app.use('/api', apiLimiter);

  // Health check endpoint (for load balancers & monitoring)
  app.get('/api/v1/health', async (_req, res) => {
    const dbStatus = dbHealth();
    let dbPing = 'ok';
    let usersCount = null;
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        usersCount = await mongoose.connection.collection('users').countDocuments();
      } else {
        dbPing = 'disconnected';
      }
    } catch (err) {
      dbPing = `error: ${err.message}`;
    }

    res.json({
      success: true,
      data: {
        service: 'lexora-legaldesk',
        environment: env.nodeEnv,
        time: new Date().toISOString(),
        database: {
          ...dbStatus,
          ping: dbPing,
          users: usersCount,
        },
        timezone: env.timezone,
      },
      message: 'Health check',
    });
  });

  // REST API router
  app.use('/api/v1', csrfProtect, apiRouter);

  // Serve static frontend in unified full-stack deployments (e.g. Render / Railway single-service)
  const candidateDists = [
    path.resolve(__dirname, '../../../frontend/dist'),
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(__dirname, '../dist'),
  ];
  const staticDist = candidateDists.find((d) => fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html')));

  if (staticDist) {
    app.use(express.static(staticDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(staticDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
