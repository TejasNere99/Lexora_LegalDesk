import { randomToken } from '../utils/crypto.js';

export function requestId(req, res, next) {
  req.requestId = req.get('x-request-id') || randomToken(12);
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('Cache-Control', 'no-store');
  next();
}
