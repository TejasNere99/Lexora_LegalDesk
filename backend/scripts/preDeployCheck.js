import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { getEmailServiceStatus } from '../src/services/mail.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runCheck() {
  console.log('===============================================================');
  console.log('   🚀 Lexora LegalDesk — Pre-Deployment Production Audit');
  console.log('===============================================================');

  let passed = true;
  const issues = [];
  const warnings = [];

  // 1. Environment & Node Version
  const nodeVer = process.version;
  const majorNode = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
  if (majorNode >= 18) {
    console.log(`[PASS] Node.js Runtime: ${nodeVer} (>= 18 required)`);
  } else {
    passed = false;
    issues.push(`Node.js version is ${nodeVer}. Production requires Node.js >= 18.`);
    console.error(`[FAIL] Node.js Runtime: ${nodeVer} (Outdated)`);
  }

  // 2. Secret Keys Length
  if (env.accessTokenSecret && env.accessTokenSecret.length >= 32) {
    console.log('[PASS] ACCESS_TOKEN_SECRET: Valid length (>= 32 chars)');
  } else {
    passed = false;
    issues.push('ACCESS_TOKEN_SECRET must be at least 32 characters in production.');
    console.error('[FAIL] ACCESS_TOKEN_SECRET: Missing or too short');
  }

  if (env.refreshTokenSecret && env.refreshTokenSecret.length >= 32) {
    console.log('[PASS] REFRESH_TOKEN_SECRET: Valid length (>= 32 chars)');
  } else {
    passed = false;
    issues.push('REFRESH_TOKEN_SECRET must be at least 32 characters in production.');
    console.error('[FAIL] REFRESH_TOKEN_SECRET: Missing or too short');
  }

  // 3. MongoDB Atlas Connectivity
  console.log('\nChecking MongoDB Atlas connection...');
  try {
    const conn = await mongoose.createConnection(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
    }).asPromise();
    const isAtlas = env.mongoUri.includes('mongodb.net');
    console.log(`[PASS] MongoDB Connection: Connected (${isAtlas ? 'MongoDB Atlas Cluster' : 'Local MongoDB'})`);

    const userCount = await conn.collection('users').countDocuments();
    const caseCount = await conn.collection('cases').countDocuments();
    console.log(`       Database verified: ${userCount} users, ${caseCount} cases registered.`);
    await conn.close();
  } catch (err) {
    passed = false;
    issues.push(`MongoDB connection failed: ${err.message}`);
    console.error(`[FAIL] MongoDB Connection: ${err.message}`);
  }

  // 4. Email Service (Brevo)
  console.log('\nChecking Email Service configuration...');
  const mailStatus = getEmailServiceStatus();
  if (mailStatus.provider === 'brevo-api') {
    console.log('[PASS] Email Provider: Brevo v3 Transactional API (Configured)');
    console.log(`       Sender: ${mailStatus.senderName} <${mailStatus.senderEmail}>`);
  } else if (mailStatus.provider === 'smtp') {
    console.log(`[PASS] Email Provider: SMTP Relay (${mailStatus.host}:${mailStatus.port})`);
  } else {
    warnings.push('No live email provider configured (BREVO_API_KEY). Emails will log to .dev-mailbox.json.');
    console.warn('[WARN] Email Provider: Offline Dev Mailbox fallback active');
  }

  // 5. Frontend Production Build Artifacts
  console.log('\nChecking Frontend production build artifacts...');
  const distDir = path.resolve(__dirname, '../../frontend/dist');
  const indexHtml = path.join(distDir, 'index.html');
  const swJs = path.join(distDir, 'sw.js');

  if (fs.existsSync(indexHtml)) {
    console.log('[PASS] Frontend Bundle: Built successfully (frontend/dist/index.html found)');
  } else {
    passed = false;
    issues.push('frontend/dist/index.html is missing. Run "npm run build" before deploying.');
    console.error('[FAIL] Frontend Bundle: Missing. Run "npm run build".');
  }

  if (fs.existsSync(swJs)) {
    console.log('[PASS] PWA Service Worker: Generated (frontend/dist/sw.js found)');
  } else {
    warnings.push('PWA Service Worker (dist/sw.js) not found. PWA offline caching will be unavailable.');
    console.warn('[WARN] PWA Service Worker: Missing');
  }

  // 6. SPA Routing & Deployment Files
  console.log('\nChecking SPA redirect files...');
  const redirectsFile = path.resolve(__dirname, '../../frontend/public/_redirects');
  const vercelJson = path.resolve(__dirname, '../../frontend/vercel.json');
  const procfile = path.resolve(__dirname, '../../Procfile');

  if (fs.existsSync(redirectsFile)) {
    console.log('[PASS] Netlify/Render redirects: frontend/public/_redirects present');
  } else {
    warnings.push('frontend/public/_redirects missing');
  }

  if (fs.existsSync(vercelJson)) {
    console.log('[PASS] Vercel routing: frontend/vercel.json present');
  }

  if (fs.existsSync(procfile)) {
    console.log('[PASS] Procfile: Present for unified PaaS deploy');
  }

  console.log('\n===============================================================');
  if (passed) {
    console.log('✅ ALL PRODUCTION CHECKS PASSED — READY FOR DEPLOYMENT!');
    if (warnings.length > 0) {
      console.log('\nNotices:');
      warnings.forEach((w) => console.log('  ⚠️  ' + w));
    }
  } else {
    console.error('❌ ISSUES FOUND BEFORE DEPLOYMENT:');
    issues.forEach((i) => console.error('  🛑 ' + i));
  }
  console.log('===============================================================\n');

  process.exit(passed ? 0 : 1);
}

runCheck().catch((err) => {
  console.error('Unexpected check error:', err);
  process.exit(1);
});

