# Lexora LegalDesk — System Architecture & Technical Specification

## 1. Product Overview & Identity

**Lexora LegalDesk** is a private, multi-tenant legal practice management workspace designed specifically for a collaborative team of five advocates/lawyers in chambers.

- **Tagline:** One workspace. Every case. A team in sync.
- **Mascot:** **LexBuddy**, an intelligent, friendly owl lawyer dressed in dark navy robes with white legal bands.
- **Core Workflow Domains:** Clients, Cases/Matters, Court Hearings, Practice Tasks, Client Interactions, Team Management, and Practice Insights.

---

## 2. Technical Stack

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (Client)                    │
│  React 18 + Vite + Tailwind CSS + TanStack Query       │
│  React Router v7 + Framer Motion + Lucide React        │
│  Installable PWA (vite-plugin-pwa + Workbox)           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST API / Cookies
┌───────────────────────────▼────────────────────────────┐
│                    Backend (API)                       │
│  Node.js + Express 4                                   │
│  Helmet (CSP) + CORS + CSRF Middleware                 │
│  express-mongo-sanitize + express-rate-limit           │
│  JSON Web Tokens (JWT) + Bcrypt                        │
└───────────────────────────┬────────────────────────────┘
                            │ Mongoose ODM
┌───────────────────────────▼────────────────────────────┐
│                   Database (Storage)                   │
│  MongoDB (Self-hosted or MongoDB Atlas Cluster)        │
└────────────────────────────────────────────────────────┘
```

### Frontend Architecture
- **Framework:** React 18 with Vite 6
- **Routing:** React Router v7 with lazy page chunking and authenticated `AppShell`
- **State & Caching:** `@tanstack/react-query` for server state management with automatic background refetching and cache invalidation
- **Design System:** Custom brand tokens configured via Tailwind CSS (`#6C4CF1` primary purple, `#26304A` navy, `#FFF8ED` warm background)
- **Icons & Motion:** Lucide React and Framer Motion (with strict `prefers-reduced-motion` compliance)
- **PWA & Offline:** Progressive Web App with service worker registered via `vite-plugin-pwa`. Static app assets are cached for instant offline rendering, while confidential case data uses `NetworkOnly` caching to protect sensitive legal client records.

### Backend Architecture
- **Server:** Node.js with Express 4 (ES Modules)
- **Security Middleware:** `helmet` for Content Security Policy, `cors` for credentials allowlist, `cookieParser`, `express-mongo-sanitize` for NoSQL injection prevention, `express-rate-limit` for DDoS and brute-force mitigation
- **Validation:** Server-side request validation using Zod schemas for every incoming mutation
- **Response Format:** Uniform standard envelopes:
  - Success: `{ success: true, data: { ... }, message: "..." }`
  - Error: `{ success: false, error: { code: "...", message: "..." }, requestId: "..." }`

---

## 3. Data Model Architecture (MongoDB / Mongoose)

The data model is organized around workspace multi-tenancy and explicit matter authorization:

1. **User:**
   - Identity, normalized email, hashed password (`bcrypt`), workspace role (`admin` or `lawyer`), `teamId`, `isActive` boolean, and `timezone`.
2. **Team:**
   - Practice tenant entity (`name`, `createdBy`, timestamps).
3. **Case (Legal Matter):**
   - Practice tracking ID formatted as `LEX-YYYY-XXXX` generated sequentially via `Counter`.
   - Title, petition/case number, case type, court/forum, jurisdiction, linked clients (`clientIds`), opposing party, lead lawyer (`assignedLawyerId`), explicitly authorized lawyers (`authorizedUserIds`), status (`active`, `pending`, `on_hold`, `closed`, `archived`), priority, filing date, next hearing date, and internal notes.
4. **Client:**
   - Entity/individual name, contact phone, email, assigned lawyer, internal consultation notes, next follow-up date, and archive flag.
5. **Hearing:**
   - Linked `caseId`, scheduled date/time, court/room, hearing type, preparation notes, recorded court order/outcome, and cancellation flag.
6. **HearingHistory:**
   - Full immutable log tracking every modification to scheduled hearing dates with preceding date, updated date, changing user, and mandatory reason for change.
7. **Task:**
   - Action item title, instructions, linked `caseId`, linked `clientId`, `assignedTo` user, due date, priority, status (`todo`, `in_progress`, `completed`, `cancelled`), and completion metadata.
8. **Interaction:**
   - Client communication history (calls, meetings, court conferences, consultations), summary, and follow-up requirements.
9. **Session:**
   - Active device sessions storing hashed refresh tokens, expiry dates, IP, user-agent, and revocation timestamps.
10. **AuditLog:**
    - Tamper-traceable activity history capturing `actorId`, `action`, `entityType`, `entityId`, timestamp, and sanitized metadata.
11. **Invitation & PasswordReset:**
    - Secure, short-lived tokens for colleague onboarding and password recovery.

---

## 4. Case-Level Authorization & Scoping

Access control operates strictly on the backend:

1. **Workspace Boundary:** Every database query checks `teamId: req.user.teamId`. Cross-team record leakage is impossible.
2. **Matter-Level Authorization:** A lawyer can only access cases where:
   - They are the assigned lead lawyer (`assignedLawyerId: req.user._id`), OR
   - They have been explicitly added to the authorized team list (`authorizedUserIds: req.user._id`), OR
   - They hold the `admin` role for practice management.
3. **Child Record Scoping:** Hearings, tasks, and client notes linked to a case inherit the parent matter's authorization checks. Direct ID access by an unauthorized user yields a clean 404 without leaking the document's existence.

---

## 5. Directory Structure & Key Files

```text
lexora-legaldesk/
├── frontend/
│   ├── public/
│   │   ├── icons/            # SVG and PWA PNG icons (192x192, 512x512)
│   │   ├── mascot/           # LexBuddy emotion assets (happy, focused, celebrating, reminder, thinking)
│   │   └── offline.html      # Safe offline fallback page
│   ├── src/
│   │   ├── app/              # Router, QueryClient, Auth Provider
│   │   ├── components/
│   │   │   ├── layout/       # AppShell (desktop & mobile navigation), InstallPrompt
│   │   │   ├── mascot/       # LexBuddy component with mood/size handling
│   │   │   └── ui/           # Reusable design primitives (Buttons, Cards, Modals, Badges, Tables)
│   │   ├── features/auth/    # AuthContext with HttpOnly session state
│   │   ├── hooks/            # useToast notification hook
│   │   ├── lib/              # api.js fetch client with CSRF token management
│   │   ├── pages/            # 17 responsive views (Dashboard, Cases, Clients, Hearings, Tasks, Team, etc.)
│   │   ├── test/             # Unit tests for formatters, UI primitives, and mascot
│   │   └── styles/           # Tailwind CSS tokens and base styles
├── backend/
│   ├── src/
│   │   ├── config/           # db.js, env.js
│   │   ├── controllers/      # REST endpoint handlers for all resources
│   │   ├── middleware/       # Auth, CSRF, rateLimits, validate, errorHandler
│   │   ├── models/           # Mongoose schemas with validation and indexing
│   │   ├── routes/           # Versioned /api/v1 router
│   │   ├── services/         # Access control, audit, auth, mail
│   │   ├── utils/            # Crypto, http status helpers, async handler
│   │   └── validators/       # Strict Zod validation schemas
│   ├── tests/                # Automated integration tests (access.test.js, auth.test.js)
│   └── scripts/              # bootstrapAdmin.js, seedDev.js
├── docs/                     # Architecture, security, deployment, and backup guides
├── package.json              # Monorepo workspaces manifest
└── .env.example              # Environment configuration template
```
