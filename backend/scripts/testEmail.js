import { env } from '../src/config/env.js';
import { getEmailServiceStatus, sendTransactionalEmail } from '../src/services/mail.service.js';
import { buildPasswordResetEmail } from '../src/templates/emailTemplates.js';

async function main() {
  const targetEmail = process.argv[2] || process.env.TEST_EMAIL_RECIPIENT;
  const status = getEmailServiceStatus();

  console.log('====================================================');
  console.log('   Lexora LegalDesk — Email Service Diagnostic Tool');
  console.log('====================================================');
  console.log('Configured Provider :', status.provider.toUpperCase());

  if (status.provider === 'brevo-api') {
    console.log('Connection Method   : Brevo v3 Transactional REST API (HTTPS :443)');
    console.log('Sender Name         :', status.senderName);
    console.log('Sender Email        :', status.senderEmail);
    console.log('API Key Status      : Configured (' + env.brevo.apiKey.slice(0, 8) + '...' + ')');

    // Test API Key validity against Brevo
    try {
      console.log('\nVerifying Brevo API key connection...');
      const accRes = await fetch('https://api.brevo.com/v3/account', {
        headers: { accept: 'application/json', 'api-key': env.brevo.apiKey },
      });
      if (accRes.ok) {
        const acc = await accRes.json();
        console.log('✅ Brevo Authentication: SUCCESS');
        console.log('   Account Email       :', acc.email);
        console.log('   Account Plan        :', acc.plan?.[0]?.type || 'Free / Standard');
      } else if (accRes.status === 403) {
        console.log('✅ Brevo Authentication: Valid Transactional API Key');
      } else {
        const errText = await accRes.text();
        console.warn('⚠️  Brevo response status', accRes.status, ':', errText);
      }
    } catch (e) {
      console.warn('⚠️  Could not reach Brevo API:', e.message);
    }
  } else if (status.provider === 'smtp') {
    console.log('Connection Method   : SMTP Relay (Nodemailer)');
    console.log('SMTP Host           :', status.host);
    console.log('SMTP Port           :', status.port);
    console.log('From Header         :', status.from);
  } else {
    console.log('Mode                : Local Dev Mailbox Fallback');
    console.log('Mailbox File        :', status.filePath);
    console.log('\n💡 Tip: To send real emails via Brevo:');
    console.log('   Set BREVO_API_KEY in your .env file.');
  }

  if (!targetEmail) {
    console.log('\nℹ️  To send a live test email, provide a recipient address:');
    console.log('   npm run test:email -- your-email@example.com\n');
    return;
  }

  console.log(`\nDispatching test email to: ${targetEmail}...`);

  const sampleTemplate = buildPasswordResetEmail({
    name: 'Counsel',
    resetUrl: `${env.frontendUrl}/reset-password?token=test-diagnostic-token`,
  });

  const result = await sendTransactionalEmail({
    to: targetEmail,
    subject: `[Diagnostic] ${sampleTemplate.subject}`,
    text: sampleTemplate.text,
    html: sampleTemplate.html,
  });

  if (result.delivered) {
    console.log('✅ Test email delivered successfully!');
    console.log('   Provider  :', result.provider);
    if (result.messageId) console.log('   Message ID:', result.messageId);
  } else {
    console.log('ℹ️  Result:', result);
    if (result.provider === 'dev-mailbox') {
      console.log('   Logged email payload to .dev-mailbox.json');
    }
  }
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
