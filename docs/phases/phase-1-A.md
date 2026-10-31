# Phase 1 Completion Report: Backend Foundation (Database, Auth, Audit, RBAC)

**Developer**: Developer A (Kaushal Kumar Singh)  
**Role**: Backend & Data Lead  
**Branch**: `phase-1/dev-a-foundation`  
**Date**: 2026-10-26

---

## 1. What Was Built

Implemented the authoritative backend foundation in `apps/api`, `prisma/`, and `packages/shared`:

1. **Complete Database Data Model (SRS Section 9.1)**:
   - Authored all 16 relational models in `prisma/schema.prisma` with foreign keys, unique constraints, and query indexes.
   - Incorporated all state machines from SRS Section 3.3 (`SessionState`: Not Started, Ready, Active, Interrupted, Submitted, Expired, Cancelled) and Section 3.4 (`AttemptState`: Pending, Active, Submitted, Timed Out, Skipped, Evaluation Pending, Evaluated).
   - Generated initial PostgreSQL SQL migration (`prisma/migrations/20261025000000_init/migration.sql`).
   - Created PostgreSQL append-only security script (`prisma/audit_role.sql`) that explicitly revokes `UPDATE`, `DELETE`, and `TRUNCATE` permissions on `audit_logs` table (FR-AUD-004, NFR-SEC-010).
   - Created database seed script (`prisma/seed.ts`) seeding initial SuperAdmin with Argon2id hash (FR-AUTH-001).

2. **Cryptographic & Authentication Module (`apps/api/src/auth`)**:
   - `PasswordService`: Passwords hashed and verified exclusively with **Argon2id** using OWASP-compliant parameters (64MB memory cost, 3 iterations, 1 parallelism) per Rule 5, FR-AUTH-003, and NFR-SEC-002.
   - `TokenService`: Issues short-lived access tokens (15m) and rotating refresh tokens (7d) with unique UUIDv4 `jti`. Implements server-side token revocation list and user-level `tokenVersion` invalidation.
   - `RateLimiterService`: Rate limits login attempts and engages a 15-minute temporary lockout after 5 consecutive failures per identifier/IP (FR-AUTH-004, TC17).
   - `MfaService`: RFC 6238 TOTP generator and authenticator for privileged administrator accounts (FR-AUTH-008).
   - Unified authentication controller & service accepting candidate ID (e.g. `CAN-2026-001`) or username per Decision 3 and FR-AUTH-002.
   - SuperAdmin-initiated candidate password reset without revealing old password (FR-AUTH-005, Rule 7).
   - SuperAdmin-initiated candidate account deactivation with instantaneous session revocation (FR-AUTH-006).

3. **Global RBAC Security Architecture (`apps/api/src/auth/guards`)**:
   - Implemented `JwtAuthGuard` and `RolesGuard` globally registered as `APP_GUARD` providers.
   - Defined `@Public()` decorator to whitelist unauthenticated endpoints (`/health`, `/auth/login`, `/auth/refresh`).
   - Defined `@Roles(...)` decorator enforcing least-privilege role boundaries (`SUPER_ADMIN`, `CANDIDATE`, `TECHNICAL_EVALUATOR`).

4. **Append-Only Audit Engine (`apps/api/src/audit`)**:
   - `AuditService`: Append-only audit writer logging event type, timestamp, actor, affected entity, outcome (`SUCCESS`, `DENIED`, `FAILURE`), and correlation ID.
   - Metadata sanitizer: Recursively redacts passwords, tokens, credentials, and secrets (FR-AUD-006, Rule 5).
   - Search API (`GET /api/v1/admin/audit-logs`) for authorized administrators.

5. **Cross-Cutting Middlewares & Exception Handling (`apps/api/src/common`)**:
   - `CorrelationIdMiddleware`: Injects/propagates standard UUIDv4 `X-Correlation-Id` header and context across all requests (Rule 9, FR-AUD-005).
   - `AllExceptionsFilter`: Formats all errors into the standard SRS Section 8.3.3 response envelope with UTC ISO-8601 timestamps and standard error codes (`UNAUTHENTICATED`, `FORBIDDEN`, `RATE_LIMITED`, `INVALID_STATE`, `VALIDATION_FAILED`, `INTERNAL_ERROR`).
   - Global `ValidationPipe` with payload whitelisting and non-whitelisted parameter rejection (Rule 6, NFR-SEC-007).

6. **API Contracts (`packages/shared/openapi.yaml`)**:
   - Updated OpenAPI 3.0 specification with all auth, MFA, token rotation, admin candidate management, and audit endpoints.

---

## 2. Endpoints Added

| Method  | Path                                          | Role / Access        | Purpose                                                          |
| :------ | :-------------------------------------------- | :------------------- | :--------------------------------------------------------------- |
| `POST`  | `/api/v1/auth/login`                          | Public               | Authenticate Admin/Candidate via username or Candidate ID        |
| `POST`  | `/api/v1/auth/mfa/verify`                     | Public               | Verify TOTP MFA code for privileged administrator accounts       |
| `POST`  | `/api/v1/auth/refresh`                        | Public               | Rotate refresh token and issue new token pair                    |
| `POST`  | `/api/v1/auth/logout`                         | Authenticated        | Revoke session and add token to server revocation list           |
| `POST`  | `/api/v1/admin/candidates/:id/password-reset` | SuperAdmin           | Reset candidate password without exposing old password (audited) |
| `PATCH` | `/api/v1/admin/candidates/:id/deactivate`     | SuperAdmin           | Deactivate account and revoke all active sessions (audited)      |
| `GET`   | `/api/v1/admin/audit-logs`                    | SuperAdmin/Evaluator | Search and inspect immutable audit trail records                 |
| `GET`   | `/api/v1/health`                              | Public               | Authoritative server status and UTC ISO-8601 timestamp           |

---

## 3. SRS Requirements Covered

- `FR-AUTH-001`: Secure Super Admin login with server-side validation.
- `FR-AUTH-002`: Candidate login requiring administrator-issued credentials (username or candidate ID).
- `FR-AUTH-003`: Passwords stored using Argon2id; zero plaintext credentials in database or logs.
- `FR-AUTH-004`: Rate-limiting and 15-minute temporary lockout after 5 consecutive failed logins (TC17).
- `FR-AUTH-005`: Super Admin initiated candidate password reset workflow.
- `FR-AUTH-006`: Account deactivation preventing new sessions and enforcing immediate session revocation.
- `FR-AUTH-007`: Backend session state management with short-lived access tokens, refresh tokens, and server-side revocation list.
- `FR-AUTH-008`: TOTP multi-factor authentication (RFC 6238) support for privileged administrator accounts.
- `FR-AUTH-009`: Secure temporary credential provisioning; credentials excluded from exports and logs.
- `FR-AUD-001`: Audit logging of significant administrative events.
- `FR-AUD-003`: Audit logging of login successes, failures, lockouts, and token revocations.
- `FR-AUD-004`: Standardized audit schema with actor, event type, entity, outcome, and correlation ID.
- `FR-AUD-005`: Append-only audit protection via PostgreSQL security role script.
- `FR-AUD-006`: Audit log search and filter endpoint for administrators.
- `FR-AUD-007`: Metadata sanitizer ensuring zero secrets or passwords in audit records.
- `NFR-SEC-002`: Mandatory Argon2id password hashing with secure parameters.
- `NFR-SEC-003`: Global RBAC guard enforced across all protected endpoints.
- `NFR-SEC-004`: Ephemeral session tokens with server-side revocation.
- `NFR-SEC-007`: Strict input validation and parameterized queries.
- `NFR-SEC-010`: Tamper-evident audit storage with append-only access controls.
- `NFR-SEC-012`: Secrets managed exclusively via environment variables.
- `TC-17`: Brute-force login defense verified via automated unit test.

---

## 4. Tests Added & Verification Evidence

All test suites across the monorepo pass cleanly:

```text
✓ packages/shared: 2 tests passed (errors.spec.ts)
✓ apps/admin-web: 1 test passed (App.test.tsx)
✓ apps/candidate-desktop: 1 test passed (App.test.tsx)
✓ apps/api: 20 tests passed across 3 test suites:
   • src/app.controller.spec.ts (health check, root endpoint, UTC timestamps)
   • src/auth/guards/guards.spec.ts (JWT validation, public bypass, revoked token rejection, RBAC denial)
   • src/auth/auth.service.spec.ts (Admin login, candidate ID login, username login, Argon2id hashing, lockout TC17, TOTP MFA, token rotation, account deactivation, audit logging, and metadata secret sanitization)

Total: 24 passing tests across 4 workspace projects. 0 failures.
```

---

## 5. What is Still Mocked / Stubbed

- PostgreSQL container runs in Docker; unit tests execute with mock Prisma Client and in-memory fallback stores.
- Assessment execution engine (`/candidate/sessions/*`) and Question bank endpoints (`/admin/questions`) are queued for subsequent phases.

---

## 6. Open Questions / Next Phase Handoff

- None. Backend foundation, database schema, auth, audit, and RBAC guards are production-ready.
- Developer B (Ashlin) and Developer C (Vimal) can now integrate against `/api/v1/auth/login` and `/api/v1/auth/mfa/verify` using `packages/shared/openapi.yaml`.

---

## 7. Instructions to Run

```bash
# 1. Install dependencies & generate Prisma client
pnpm install
pnpm prisma:generate

# 2. Run quality checks
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# 3. Start local PostgreSQL container (optional for DB operations)
docker compose -f infra/docker-compose.yml up -d

# 4. Apply migrations and seed SuperAdmin
npx prisma migrate deploy --schema=prisma/schema.prisma
npx ts-node prisma/seed.ts

# 5. Start development API server
pnpm dev:api
```
