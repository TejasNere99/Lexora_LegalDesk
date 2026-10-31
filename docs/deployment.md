# Lexora LegalDesk — Deployment & Zero-Cost Production Guide

## 1. Hosting Architecture Overview

Lexora LegalDesk is architected for modern cloud deployment with two supported zero-cost deployment paths:

| Deployment Model | Architecture | Recommended Providers | Best For |
|---|---|---|---|
| **Path A: Unified Full-Stack (Simplest)** | Single service: Express serves the API on `/api/*` and the pre-built React PWA on `/` | **Render** (Free Web Service) or **Railway** | Single URL, zero cross-domain cookie issues, 1-click deploy |
| **Path B: Decoupled (Edge + Cloud)** | Frontend on static edge CDN + Backend REST API on container | Frontend on **Vercel** / **Netlify**<br/>Backend on **Render** / **Railway** | Faster global CDN edge delivery, separate scaling |
| **Database** | Managed replica set with automated backups | **MongoDB Atlas** (M0 Free Tier, 512 MB) | Always hosted on MongoDB Atlas |
| **Email Service** | Transactional HTTPS API | **Brevo** (Free Tier: 300 emails/day) | Password resets & team invites |

---

## 2. Automated Pre-Deployment Verification

Before triggering any deployment, run the automated production audit tool:

```bash
npm run check:deploy
```

This validates:
- Node.js runtime version (>= 18)
- Token secrets length (>= 32 characters)
- MongoDB Atlas cluster connectivity and seeded data
- Brevo email API key & sender verification
- Frontend production bundle (`frontend/dist/index.html`)
- PWA Service Worker caching rules (`frontend/dist/sw.js`)
- Client-side SPA routing redirect files (`_redirects`, `vercel.json`, `Procfile`)

---

## 3. Deployment Path A: Unified Full-Stack on Render (Recommended)

In this model, your backend and frontend are hosted together on a single Render Web Service at zero cost.

### Steps:
1. Push your repository to **GitHub** or **GitLab**.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service** (or connect your repo using the included [`render.yaml`](../render.yaml) Blueprint).
4. Configure service settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/v1/health`
5. Add Environment Variables in the Render dashboard:
   ```env
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your-mongodb-atlas-connection-string
   ACCESS_TOKEN_SECRET=generate-a-random-secret-min-32-chars
   REFRESH_TOKEN_SECRET=generate-another-random-secret-min-32-chars
   COOKIE_SECURE=true
   BREVO_API_KEY=xkeysib-your-brevo-api-key
   BREVO_SENDER_EMAIL=your-verified-brevo-email@domain.com
   BREVO_SENDER_NAME=Lexora LegalDesk
   PASSWORD_RESET_PROVIDER=brevo
   TIMEZONE=UTC
   ```
6. Click **Deploy Web Service**.
   Render will install dependencies, build the frontend (`frontend/dist`), and start the Express server which serves both the REST API and the responsive PWA!

---

## 4. Deployment Path B: Decoupled (Vercel Frontend + Render Backend)

### Step 1: Deploy Backend to Render
1. Create a Web Service on Render pointing to your repository.
2. Root directory: Leave as root or set `backend`.
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `npm start`
5. Configure Environment Variables:
   - `NODE_ENV=production`
   - `MONGODB_URI=your-mongodb-atlas-connection-string`
   - `FRONTEND_URL=https://your-app.vercel.app` *(Must match your Vercel URL)*
   - `ACCESS_TOKEN_SECRET=...`
   - `REFRESH_TOKEN_SECRET=...`
   - `COOKIE_SECURE=true`
   - `BREVO_API_KEY=...`
   - `BREVO_SENDER_EMAIL=...`
   - `PASSWORD_RESET_PROVIDER=brevo`
6. Note your backend URL (e.g., `https://lexora-api.onrender.com`).

### Step 2: Deploy Frontend to Vercel
1. Import your repository into [Vercel](https://vercel.com).
2. Set **Root Directory:** `frontend`
3. Framework Preset: `Vite` (automatically detected)
4. Add Environment Variable:
   - `VITE_API_URL=https://lexora-api.onrender.com` *(Your Render backend URL)*
5. Click **Deploy**.
   Vercel will build the frontend and apply [`vercel.json`](../frontend/vercel.json) rewrites for client-side routing.

---

## 5. First-Time Practice Administrator Bootstrap

Once your production service is deployed, you can bootstrap the practice administrator account if you haven't already seeded one:

```bash
# In your deployment environment shell or via local script targeting production DB:
BOOTSTRAP_ADMIN_EMAIL=managingpartner@yourchambers.com \
BOOTSTRAP_ADMIN_PASSWORD=YourSecurePassphrase!2026 \
BOOTSTRAP_ADMIN_NAME="Advocate Asha Menon" \
BOOTSTRAP_TEAM_NAME="Menon & Associates Chambers" \
npm run bootstrap-admin
```

---

## 6. Health Check & Monitoring

Verify your deployment status at:
`GET https://<your-service-url>/api/v1/health`

**Expected Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "service": "lexora-legaldesk",
    "environment": "production",
    "time": "2026-10-31T17:00:00.000Z",
    "database": {
      "status": "ok",
      "connection": "connected"
    },
    "timezone": "UTC"
  },
  "message": "Health check"
}
```

---

## 7. Production Security Checklist

- [x] Passwords hashed with `bcrypt` (12 rounds)
- [x] HttpOnly, SameSite, Secure cookies for access & refresh tokens
- [x] Cryptographic CSRF protection with double-submit cookie validation
- [x] Helmet security headers & Content-Security-Policy enabled
- [x] Rate limiting enabled on authentication (20 req/15m) and general API (400 req/15m)
- [x] Dynamic CORS protection rejecting unauthorized origins
- [x] MongoDB NoSQL query sanitization (`express-mongo-sanitize`)
- [x] Case-level authorization policies enforcing chambers access boundaries
- [x] Graceful shutdown on `SIGTERM` and `SIGINT`
- [x] Pre-deployment verification script (`npm run check:deploy`)
