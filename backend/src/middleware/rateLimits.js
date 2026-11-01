import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait and try again.' },
  },
});

export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' },
  },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});
