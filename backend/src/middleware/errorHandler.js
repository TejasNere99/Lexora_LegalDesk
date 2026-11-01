import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    requestId: req.requestId,
  });
}

export function errorHandler(err, req, res, _next) {
  const isClientError =
    err instanceof AppError ||
    err.isAppError ||
    (typeof err.status === 'number' && err.status >= 400 && err.status < 500);

  if (isClientError) {
    return res.status(err.status || 400).json({
      success: false,
      error: { code: err.code || 'BAD_REQUEST', message: err.message },
      requestId: req.requestId,
    });
  }

  if (err.name === 'ZodError' || err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Please review the submitted information' },
      requestId: req.requestId,
    });
  }

  // Always log unexpected server errors in server console for visibility across all environments
  console.error(`[Unhandled Error][${req.requestId || 'no-id'}] ${req.method} ${req.originalUrl}:`, err);

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'A matching record already exists' },
      requestId: req.requestId,
    });
  }

  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoTimeoutError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError'
  ) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection failed. Please ensure MongoDB Atlas Network Access allows connections (0.0.0.0/0).',
      },
      requestId: req.requestId,
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      details: !env.isProd || process.env.SHOW_ERROR_DETAILS === 'true' ? err.message : undefined,
    },
    requestId: req.requestId,
  });
}
