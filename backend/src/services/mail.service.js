import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const mailboxPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.dev-mailbox.json');

export function isBrevoApiConfigured() {
  return Boolean(env.brevo.apiKey);
}

export function isSmtpConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

export function getEmailServiceStatus() {
  if (isBrevoApiConfigured()) {
    return {
      provider: 'brevo-api',
      configured: true,
      senderEmail: env.brevo.senderEmail,
      senderName: env.brevo.senderName,
    };
  }
  if (isSmtpConfigured()) {
    return {
      provider: 'smtp',
      configured: true,
      host: env.smtp.host,
      port: env.smtp.port,
      from: env.smtp.from,
    };
  }
  return {
    provider: 'dev-mailbox',
    configured: false,
    filePath: mailboxPath,
  };
}

async function writeDevMailbox(payload) {
  if (env.isProd) return;
  let current = [];
  try {
    current = JSON.parse(await fs.readFile(mailboxPath, 'utf8'));
  } catch {
    current = [];
  }
  current.push({ ...payload, at: new Date().toISOString() });
  await fs.writeFile(mailboxPath, JSON.stringify(current, null, 2));
}

async function sendViaBrevoApi({ to, subject, text, html }) {
  const senderEmail = env.brevo.senderEmail || 'noreply@localhost';
  const senderName = env.brevo.senderName || 'Lexora LegalDesk';

  const body = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject,
    textContent: text,
  };

  if (html) {
    body.htmlContent = html;
  } else {
    body.htmlContent = `<div style="font-family:sans-serif;line-height:1.6;color:#26304A;">${text.replace(/\n/g, '<br/>')}</div>`;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': env.brevo.apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MailService] Brevo API error (${response.status}):`, errorText);
    if (env.isProd) {
      throw new Error(`Email delivery failed via Brevo (${response.status}): ${errorText}`);
    }
    await writeDevMailbox({ to, subject, text, html, error: errorText, provider: 'brevo-api-failed' });
    return { delivered: false, provider: 'brevo-api', error: errorText };
  }

  const result = await response.json().catch(() => ({}));
  return {
    delivered: true,
    provider: 'brevo-api',
    messageId: result.messageId,
  };
}

async function sendViaSmtp({ to, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });

  const info = await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
  });

  return {
    delivered: true,
    provider: 'smtp',
    messageId: info.messageId,
  };
}

/**
 * Dispatch a transactional email using Brevo REST API, SMTP relay, or local dev mailbox fallback.
 */
export async function sendTransactionalEmail({ to, subject, text, html }) {
  if (isBrevoApiConfigured()) {
    return sendViaBrevoApi({ to, subject, text, html });
  }

  if (isSmtpConfigured()) {
    return sendViaSmtp({ to, subject, text, html });
  }

  await writeDevMailbox({ to, subject, text, html });
  return { delivered: false, provider: 'dev-mailbox' };
}
