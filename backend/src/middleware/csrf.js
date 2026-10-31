import { env } from '../config/env.js';
import { randomToken, timingSafeEqual } from '../utils/crypto.js';
import { AppError } from '../utils/http.js';

export function setCsrfCookie(res) {
  const token = randomToken(24);
  res.cookie(env.csrfCookieName, token, {
    httpOnly: false,
    sameSite: env.cookieSecure ? 'none' : 'lax',
    secure: env.cookieSecure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function csrfProtect(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookie = req.cookies?.[env.csrfCookieName];
  const header = req.get('x-csrf-token');
  if (!cookie || !header || !timingSafeEqual(cookie, header)) {
    return next(new AppError('Request could not be verified', { status: 403, code: 'CSRF_REJECTED' }));
  }
  next();
}
