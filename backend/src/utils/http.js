import mongoose from 'mongoose';

export function sendSuccess(res, data = {}, message = 'Operation completed', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function sendError(res, { status = 400, code = 'BAD_REQUEST', message, requestId }) {
  return res.status(status).json({
    success: false,
    error: { code, message },
    requestId,
  });
}

export function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

export function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class AppError extends Error {
  constructor(message, { status = 400, code = 'BAD_REQUEST' } = {}) {
    super(message);
    this.name = 'AppError';
    this.isAppError = true;
    this.status = status;
    this.code = code;
  }
}

export function notFound() {
  return new AppError('Resource not found', { status: 404, code: 'NOT_FOUND' });
}

export function forbidden() {
  return new AppError('You do not have permission to complete this action', {
    status: 403,
    code: 'FORBIDDEN',
  });
}

export function unauthorized(message = 'Please sign in to continue') {
  return new AppError(message, { status: 401, code: 'UNAUTHENTICATED' });
}
