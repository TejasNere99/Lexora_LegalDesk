# Lexora LegalDesk — Security & Compliance Architecture

## 1. Security Philosophy & Legal Compliance

Legal practice management requires stringent data privacy standards. The application is built under the principle of **confidentiality by default**:
- Client records, case files, hearing preparations, and strategy notes must never be accessible across chambers or across unauthorized colleagues within the same practice.
- Data access must be verified server-side on every request.
- No public user registration is permitted; accounts are provisioned exclusively by practice administrators.

---

## 2. Authentication & Session Architecture

### Password Protection
- Passwords are securely hashed using `bcrypt` with an adaptive salt rounds factor (12 rounds).
- Minimum password length is enforced at 10 characters.
- Passwords are never returned through any API response (`select: false` on the Mongoose schema).

### Two-Tier Token Strategy
- **Short-Lived Access Tokens:** Signed using JWT (`RS256` or `HS256` with high-entropy secret), valid for 15 minutes. Contains subject user ID, team ID, role, and session ID (`sid`).
- **Rotating Refresh Sessions:** 30-day refresh tokens stored as cryptographic SHA-256 hashes in MongoDB. Stored on the browser as `HttpOnly`, `SameSite=Strict`, `Secure` (in production) cookies, completely inaccessible to malicious client-side JavaScript.
- **Session Revocation:** Changing passwords or deactivating an advocate's account immediately deletes or marks all active sessions revoked in MongoDB, instantly terminating access across all browser tabs and mobile devices.

### CSRF Defense
- Double-submit cookie pattern using `lexora_csrf` cookie paired with the `X-CSRF-Token` HTTP header on all state-changing mutations (`POST`, `PATCH`, `DELETE`).

---

## 3. Case-Level Authorization Pipeline

Every protected endpoint executes a strict server-side authorization sequence:

```
[ Incoming Request ]
         │
         ▼
1. Authenticate user from HttpOnly cookie session
         │
         ▼
2. Verify account is active (isActive === true)
         │
         ▼
3. Scope query to user's teamId (Workspace Isolation)
         │
         ▼
4. Verify explicit matter access:
   - Is user the assigned lead lawyer?
   - OR is user in the authorizedUserIds list?
   - OR is user an administrator?
         │
         ▼
5. Perform operation-specific privilege checks (e.g. only case owner/admin can alter permissions)
         │
         ▼
6. Validate input body with Zod schema allowlist (prevent mass assignment)
         │
         ▼
7. Execute database query safely (prevent NoSQL injection)
         │
         ▼
8. Append audit record to AuditLog collection
         │
         ▼
9. Return sanitized response
```

If a user attempts to access an unauthorized case by guessing or tampering with a MongoDB ID in the URL, the server returns a uniform `404 Not Found` without disclosing whether the record exists.

---

## 4. Web Application Security Defenses

| Vulnerability Vector | Defense Mechanism |
|---|---|
| **NoSQL Injection** | `express-mongo-sanitize` strips `$` and `.` operators from `req.body`, `req.query`, and `req.params`. All IDs are validated via `mongoose.Types.ObjectId.isValid`. |
| **Mass Assignment** | Strict Zod validation allowlists (`schemas.js`) discard unrecognized properties. Privileged attributes (`role`, `teamId`, `createdBy`, `__v`) cannot be altered via generic endpoints. |
| **Cross-Site Scripting (XSS)** | React automatic JSX escaping, `helmet` Content Security Policy headers, and absence of sensitive tokens in `localStorage`. |
| **Brute Force & DDoS** | Multi-tier rate limiting via `express-rate-limit`: strict limits on `/auth/login`, `/auth/forgot-password`, and general limits on all `/api/*` endpoints. |
| **HTTP Headers** | `helmet` configured with strict `frameAncestors: ["'none'"]` (clickjacking prevention), `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`. |
| **PWA Cache Leakage** | Service worker Workbox caching explicitly restricts caching to static bundles (`.js`, `.css`, `.svg`, `.png`). All `/api/*` endpoints use `NetworkOnly` caching and `Cache-Control: no-store` headers. |

---

## 5. Audit Logging Architecture

All security-sensitive operations are immutably logged to the `AuditLog` collection:
- Case creation, updates, and archiving
- Case access permissions granted or revoked
- Hearing date changes (including previous date, new date, and justification)
- Task completions and assignments
- Colleague invitations and account deactivations

**Privacy Guarantee:** Audit logs record actor ID, action name, target entity ID, and safe operational metadata. Confidential pleadings, full petition texts, or client communication bodies are never mirrored into logs.
