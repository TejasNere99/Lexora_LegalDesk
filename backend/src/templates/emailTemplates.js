/**
 * Lexora LegalDesk — Responsive Transactional Email Templates
 * Curated brand tokens: Primary #6C4CF1, Navy #26304A, Background #F8F9FC, Accent #EBE7FE
 */

function baseLayout({ title, previewText, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F9FC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #26304A; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #F8F9FC; padding: 32px 16px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(38, 48, 74, 0.05); }
    .header { background: #26304A; padding: 24px 32px; text-align: left; }
    .brand-title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.3px; }
    .brand-tagline { color: #A0AEC0; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.8px; }
    .content { padding: 32px; }
    .h1 { font-size: 20px; font-weight: 700; color: #26304A; margin: 0 0 16px 0; line-height: 1.3; }
    .p { font-size: 15px; color: #4A5568; line-height: 1.6; margin: 0 0 20px 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #6C4CF1; color: #ffffff !important; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 28px; border-radius: 8px; box-shadow: 0 2px 8px rgba(108, 76, 241, 0.35); }
    .box { background-color: #F4F1FD; border-left: 4px solid #6C4CF1; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #4338CA; line-height: 1.5; }
    .fallback { font-size: 12px; color: #718096; word-break: break-all; margin-top: 24px; padding-top: 18px; border-top: 1px solid #EDF2F7; }
    .footer { background-color: #F8F9FC; padding: 20px 32px; text-align: center; font-size: 12px; color: #A0AEC0; border-top: 1px solid #EDF2F7; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#F8F9FC;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText || title}
  </div>
  <table class="wrapper" role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table class="container" role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td class="header">
              <h1 class="brand-title">⚖️ Lexora LegalDesk</h1>
              <p class="brand-tagline">Private Legal Practice Management</p>
            </td>
          </tr>
          <tr>
            <td class="content">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p style="margin: 0 0 6px 0;"><strong>Lexora LegalDesk</strong> • Confidential & Privileged Legal Workspace</p>
              <p style="margin: 0;">This email is intended exclusively for the addressed recipient. If received in error, please discard immediately.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPasswordResetEmail({ name, resetUrl }) {
  const displayName = name ? `Hello ${name},` : 'Hello,';
  const subject = 'Reset your Lexora LegalDesk password';
  const previewText = 'Instructions to reset your Lexora LegalDesk account password.';

  const contentHtml = `
    <h2 class="h1">Password Reset Request</h2>
    <p class="p">${displayName}</p>
    <p class="p">We received a request to reset the password for your Lexora LegalDesk account. Click the button below to choose a new, secure password.</p>
    
    <div class="btn-container">
      <a href="${resetUrl}" target="_blank" class="btn">Reset Password</a>
    </div>

    <div class="box">
      <strong>Security Notice:</strong> This reset link is single-use and will expire in <strong>1 hour</strong>. If you did not initiate this request, no action is required and your account remains secure.
    </div>

    <div class="fallback">
      Button not working? Copy and paste this URL into your browser:<br/>
      <a href="${resetUrl}" style="color: #6C4CF1;">${resetUrl}</a>
    </div>
  `;

  const text = `${displayName}

We received a request to reset your Lexora LegalDesk password.
Use this link within 1 hour to set a new password:
${resetUrl}

If you did not request this change, you can safely ignore this email.`;

  const html = baseLayout({
    title: subject,
    previewText,
    contentHtml,
  });

  return { subject, html, text };
}

export function buildInvitationEmail({ inviterName, role, inviteUrl }) {
  const roleName = role === 'admin' ? 'Managing Partner (Administrator)' : 'Associate / Counsel (Lawyer)';
  const subject = 'Invitation to join Lexora LegalDesk';
  const previewText = 'You have been invited to join the chambers on Lexora LegalDesk.';

  const inviterText = inviterName
    ? `<strong>${inviterName}</strong> has invited you to join the chambers on`
    : 'You have been invited to join the chambers on';

  const contentHtml = `
    <h2 class="h1">Welcome to the Chambers</h2>
    <p class="p">${inviterText} <strong>Lexora LegalDesk</strong> as a <strong>${roleName}</strong>.</p>
    <p class="p">Our team uses Lexora LegalDesk to manage clients, court hearings, matter registers, deadlines, and confidential case files in a unified, synchronized workspace.</p>

    <div class="btn-container">
      <a href="${inviteUrl}" target="_blank" class="btn">Accept Invitation & Set Password</a>
    </div>

    <div class="box">
      <strong>Important:</strong> This invitation link is unique to your email address and expires in <strong>72 hours</strong>.
    </div>

    <div class="fallback">
      If the button above does not open, visit this link directly:<br/>
      <a href="${inviteUrl}" style="color: #6C4CF1;">${inviteUrl}</a>
    </div>
  `;

  const text = `Hello,

You have been invited to join the chambers on Lexora LegalDesk as ${roleName}.
Please click the link below within 72 hours to accept your invitation and set up your password:
${inviteUrl}

Welcome to the team!`;

  const html = baseLayout({
    title: subject,
    previewText,
    contentHtml,
  });

  return { subject, html, text };
}
