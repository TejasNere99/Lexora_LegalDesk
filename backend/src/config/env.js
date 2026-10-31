import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requiredInProduction(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (process.env.NODE_ENV === 'production' && !process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseSender(from = '') {
  const match = from.match(/^(?:([^<]+)\s*<)?([^>]+)>?$/);
  if (match) {
    return {
      name: (match[1] || 'Lexora LegalDesk').trim(),
      email: match[2].trim(),
    };
  }
  return { name: 'Lexora LegalDesk', email: from || 'noreply@localhost' };
}

const mailFromRaw = process.env.MAIL_FROM || 'Lexora LegalDesk <noreply@localhost>';
const parsedFrom = parseSender(mailFromRaw);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lexora_legaldesk',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  accessTokenSecret: requiredInProduction(
    'ACCESS_TOKEN_SECRET',
    'dev-only-access-token-secret-change-before-production-use',
  ),
  refreshTokenSecret: requiredInProduction(
    'REFRESH_TOKEN_SECRET',
    'dev-only-refresh-token-secret-change-before-production-use',
  ),
  accessCookieName: process.env.ACCESS_COOKIE_NAME || 'lexora_at',
  refreshCookieName: process.env.SESSION_COOKIE_NAME || 'lexora_rt',
  csrfCookieName: process.env.CSRF_COOKIE_NAME || 'lexora_csrf',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  passwordResetProvider: process.env.PASSWORD_RESET_PROVIDER || 'none',
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || process.env.MAIL_FROM_EMAIL || parsedFrom.email,
    senderName: process.env.BREVO_SENDER_NAME || process.env.MAIL_FROM_NAME || parsedFrom.name,
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: mailFromRaw,
  },
  timezone: process.env.TIMEZONE || 'UTC',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};
