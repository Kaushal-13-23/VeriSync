# Phase 6 Completion Report: Lockdown, Security Hardening, and Lab Device Registry

**Developer**: Developer A (Kaushal Kumar Singh)  
**Role**: Backend & Data Lead  
**Branch**: `phase-6/A-Lockdown-and-security-hardening`  
**Date**: 2026-11-01

---

## 1. What Was Built

Implemented end-to-end security hardening, lab device lifecycle management, candidate token device-binding, client lockdown event ingestion, OWASP API Top 10 protections, tamper-evident SHA-256 audit hash chaining, and CI security scanning in `apps/api`, `packages/shared`, `prisma/`, and `.github/workflows/`:

1. **Lab Devices Registry & Lifecycle Management (`apps/api/src/devices/`)**:
   - Implemented database persistence and registry APIs for authorized lab computers (`FR-LAB-001`, `FR-LAB-002`).
   - Supports `deviceReference`, `hostname`, `ipAddress`, `macAddress`, `location`, `approvedClientVersion`, `deviceStatus` (`ACTIVE`, `INACTIVE`, `SUSPENDED`, `BLOCKED`), and administrative `notes`.
   - **Device Status Management (`FR-LAB-004`)**: Endpoints to activate, suspend, or block lab devices with mandatory actor audit logging and administrative reasons (`Rule 7`).
   - **Approved Client Version Policy (`FR-LAB-003`, `FR-CONF-001`)**: Enforces per-device and platform-wide approved client versions. Rejects outdated or mismatched candidate clients with HTTP `426 Upgrade Required` (`UNSUPPORTED_CLIENT`).
   - **Dynamic System Policies Endpoint (`FR-CONF-004`)**: `GET /api/v1/system/policies` allows candidate clients to query approved client versions, minimum supported thresholds, and active lockdown policies dynamically upon boot.

2. **Candidate Token Device & Client Version Binding (`FR-AUTH-010`, `TC-08`, `TC-16`)**:
   - **Login & Session Start Binding**: During login (`AuthService.login`) and exam session initialization (`SessionsService.startSession`), candidate tokens bind the authorized `deviceId` and verified `clientVersion` into the signed JWT access token (`TokenService`).
   - **Runtime Cross-Device Enforcement (`JwtAuthGuard`)**: Rejects requests where the incoming `x-device-id` header does not match the token's bound `deviceId` with `403 FORBIDDEN` (`ApiErrorCode.FORBIDDEN`, `TC-08`).
   - **Runtime Client Version Enforcement (`JwtAuthGuard`)**: Rejects requests where the reported `x-client-version` does not match the session token with `426 Upgrade Required` (`ApiErrorCode.UNSUPPORTED_CLIENT`, `TC-16`).

3. **Client Lockdown Event Ingestion (`apps/api/src/devices/devices.service.ts`, `FR-LAB-006`, `BR-015`, SRS 11.4)**:
   - `POST /api/v1/candidate/lockdown-events`: Ingests desktop kiosk integrity events (`FOCUS_LOST`, `EXIT_ATTEMPT`, `PROHIBITED_PROCESS_DETECTED`, `SHORTCUT_TRIPPED`, `WINDOW_BLUR`, `FULLSCREEN_EXIT`, `CLIPBOARD_ACCESSED`).
   - **Non-punitive Telemetry (`BR-015`, SRS 11.4)**: Ingests events into `audit_logs` for human proctor review without treating an isolated event as conclusive proof of cheating; zero automated marks deductions or session terminations are applied.

4. **Cryptographic Tamper-Evident Audit Storage (`apps/api/src/audit/`, `FR-AUD-004`, `NFR-SEC-009`, `NFR-SEC-010`)**:
   - **SHA-256 Hash Chaining**: Every audit log row records `previousHash` and `currentHash = SHA-256(previousHash|timestamp|actor|eventType|affectedEntity|outcome|correlationId|metadata)`.
   - **Genesis Root**: First audit log anchors to a 64-zero genesis hash (`0000000000000000000000000000000000000000000000000000000000000000`).
   - **Integrity Verification Engine (`AuditService.verifyAuditChainIntegrity`)**: `GET /api/v1/admin/audit/verify-chain` verifies hash continuity across all records. Any manual database tampering, unauthorized row modification, or row deletion immediately flags `valid: false` with the exact `brokenEntryId`.
   - **Database Role Enforcement (`FR-AUD-005`)**: PostgreSQL audit table enforces append-only semantics; runtime app roles are prevented from executing `UPDATE` or `DELETE` on `audit_logs`.

5. **OWASP API Security Top 10 Hardening (`apps/api/src/main.ts`, `NFR-SEC-006`, `NFR-SEC-007`)**:
   - **Security Headers (Helmet)**: Strict Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and Referrer-Policy: strict-origin-when-cross-origin.
   - **Strict CORS Policy**: Whitelist-based origin validation matching allowed domains or rejecting unapproved cross-origin requests.
   - **Payload Request Size Limits**: Enforced 1MB request body limit on JSON and URL-encoded bodies to prevent payload buffer flooding attacks.
   - **Rate Limiting & Brute-Force Lockout (`NFR-SEC-007`, `TC-17`)**: 5 consecutive failed login attempts locks out candidate accounts with HTTP `429 RATE_LIMITED` and exponential cooldown.
   - **Internal Leakage Prevention (`AllExceptionsFilter`)**: Catches all unhandled exceptions, logs internal stack traces with correlation IDs, and sanitizes outgoing responses ensuring zero internal stack traces or database driver details reach clients (`NFR-REL-005`).

6. **CI/CD Dependency & Secret Scanning (`.github/workflows/ci.yml`, `NFR-SEC-011`, `Rule 5`)**:
   - Added automated `pnpm audit --audit-level=high` step to fail builds on vulnerable dependencies.
   - Added automated secret scanning step checking for hardcoded private keys, tokens, or plaintext credentials (`Rule 5`).

---

## 2. Endpoints Added

| Method  | Path                                | Role / Access | Purpose                                                                             |
| :------ | :---------------------------------- | :------------ | :---------------------------------------------------------------------------------- |
| `POST`  | `/api/v1/admin/devices`             | `SUPER_ADMIN` | Register a new authorized lab device (FR-LAB-001, FR-LAB-002)                       |
| `GET`   | `/api/v1/admin/devices`             | `SUPER_ADMIN` | List all registered lab devices with status and search filters (FR-LAB-001)         |
| `GET`   | `/api/v1/admin/devices/:id`         | `SUPER_ADMIN` | Get device details and recent assessment session history (FR-LAB-001)               |
| `PATCH` | `/api/v1/admin/devices/:id/status`  | `SUPER_ADMIN` | Update device status (`ACTIVE`, `INACTIVE`, `SUSPENDED`, `BLOCKED`) (FR-LAB-004)    |
| `PATCH` | `/api/v1/admin/devices/:id/version` | `SUPER_ADMIN` | Update approved client version for a device with audit justification (FR-LAB-003)   |
| `POST`  | `/api/v1/candidate/lockdown-events` | `CANDIDATE`   | Ingest client lockdown security events into audit trail (FR-LAB-006, BR-015)        |
| `GET`   | `/api/v1/system/policies`           | Authenticated | Retrieve approved client version and lockdown policy thresholds (FR-CONF-004)       |
| `GET`   | `/api/v1/admin/audit/verify-chain`  | `SUPER_ADMIN` | Verify cryptographic SHA-256 hash chain across all audit logs (FR-AUD-004, NFR-SEC) |
| `GET`   | `/api/v1/admin/audit`               | `SUPER_ADMIN` | Search and filter tamper-evident audit logs (FR-AUD-006)                            |

---

## 3. SRS Requirement IDs Covered

- `FR-AUTH-010`: Binding of candidate tokens to registered lab device and client version (`TC-08`, `TC-16`).
- `FR-LAB-001`: Registry of authorized lab devices (device ID, hostname, IP, MAC, location, status).
- `FR-LAB-002`: Persistent device reference tracking per physical lab computer.
- `FR-LAB-003`: Installed client version verification on connection; rejection of outdated versions with `426 Upgrade Required`.
- `FR-LAB-004`: Device status lifecycle management (`ACTIVE`, `INACTIVE`, `SUSPENDED`, `BLOCKED`).
- `FR-LAB-006`: Logging and reporting of security integrity events (`FOCUS_LOST`, `EXIT_ATTEMPT`, `PROHIBITED_PROCESS_DETECTED`) without automated penalties (`BR-015`, SRS 11.4).
- `FR-CONF-001`: Platform and device approved client version thresholds.
- `FR-CONF-002`: Strict runtime input validation and configuration bounds checking.
- `FR-CONF-003`: Audited configuration changes with mandatory administrative reason and actor.
- `FR-CONF-004`: Dynamic retrieval of system operational policies by clients.
- `FR-AUD-004`: Standardized audit schema with SHA-256 hash chaining.
- `FR-AUD-005`: Write-only / append-only audit log protection.
- `FR-AUD-006`: Audit log search and filter by actor, event type, and correlation ID.
- `NFR-SEC-003`: Least-privilege RBAC enforced across every API endpoint (`authorization-matrix.spec.ts`).
- `NFR-SEC-006`: OWASP API Security Top 10 hardening (CORS, CSP, Helmet, rate limits, request size limits).
- `NFR-SEC-007`: Strict input validation and rate limiting on authentication and sensitive endpoints (`TC-17`).
- `NFR-SEC-009`: Complete prevention of candidate access to answer keys and hidden test cases (`TC-09`, `Rule 2`).
- `NFR-SEC-010`: Tamper-evident audit storage with SHA-256 hash chaining (`audit-chain.spec.ts`).
- `NFR-SEC-011`: Automated dependency vulnerability and secret scanning in CI/CD pipeline.
- `NFR-SEC-012`: Secrets managed exclusively via environment variables.
- `NFR-REL-005`: Structured error responses with correlation IDs and zero leaked stack traces.

---

## 4. Tests Added

1. **`src/devices/devices.service.spec.ts` (12 tests)**:
   - Device registration with metadata and audit logging (`FR-LAB-001`).
   - Duplicate device reference prevention (`409 INVALID_STATE`).
   - Device status updates (`ACTIVE`, `BLOCKED`, `SUSPENDED`) with audit logging (`FR-LAB-002`).
   - Approved version update and audit trail (`FR-LAB-003`).
   - Client version rejection with HTTP `426 UNSUPPORTED_CLIENT` (`TC-16`).
   - Blocked and suspended device access denial (`FR-LAB-004`).
   - Lockdown event telemetry ingestion with zero automatic candidate penalty (`FR-LAB-006`, `BR-015`).
   - System operational policies query (`FR-CONF-004`).

2. **`src/audit/audit-chain.spec.ts` (6 tests)**:
   - Genesis audit entry initialization with 64-zero previous hash (`FR-AUD-004`).
   - Cryptographic chaining of sequential records (`previousHash -> currentHash`).
   - Pristine audit chain verification (`valid: true`).
   - Tamper detection on modified metadata (`valid: false`, `brokenEntryId`).
   - Tamper detection on altered previous hash (`valid: false`, `brokenEntryId`).
   - Tamper detection on deleted intermediate row (`valid: false`, `brokenEntryId`).

3. **`src/auth/security-hardening.spec.ts` (7 tests)**:
   - `TC-08 Cross-candidate access / device binding`: Token bound to Device A used with Device B header rejected with `403 FORBIDDEN`.
   - `TC-09 Answer-key exposure prevention`: Candidate views contain zero `isCorrect`, `explanation`, or hidden test inputs/outputs (`Rule 2`).
   - `TC-15 Second session / concurrent active session denial`: Candidate starting concurrent session while one is active rejected with `409 INVALID_STATE` (`BR-007`).
   - `TC-16 Unsupported client version`: Outdated client version rejected with `426 UPGRADE_REQUIRED` (`FR-LAB-003`).
   - `TC-17 Brute-force rate limiting`: 5 failed login attempts trigger lockout with `429 RATE_LIMITED` and retry-after header.

4. **`src/auth/authorization-matrix.spec.ts` (29 tests)**:
   - Comprehensive matrix test executing all roles (`SUPER_ADMIN`, `TECHNICAL_EVALUATOR`, `CANDIDATE`) against all 9 resource categories.
   - Verifies unauthenticated requests to protected endpoints return `401 UNAUTHENTICATED`.
   - Verifies unauthorized roles receive `403 FORBIDDEN`.
   - Verifies authorized roles pass successfully.

---

## 5. What Is Still Mocked

- **Kiosk Electron OS Lockdown**: Developer B / C owns `apps/candidate-desktop` and `deploy/kiosk`; backend APIs are fully prepared with `POST /candidate/lockdown-events` and `GET /system/policies` for the desktop client to report into.
- **Hardware MAC Address Validation**: The backend records and tracks MAC addresses reported during device registration; physical Ethernet ARP/DHCP packet inspection at the router level is handled by the deployment environment.

---

## 6. Open Questions

- None for Phase 6. All SRS security requirements, non-negotiable rules, OWASP Top 10 guidelines, and test cases (`TC08`, `TC09`, `TC15`, `TC16`, `TC17`, authorization matrix) are fully satisfied and passing.

---

## 7. Instructions to Run

```bash
# 1. Generate Prisma Client & Build Packages
pnpm prisma:generate
pnpm build:packages

# 2. Run Typecheck & Linter
pnpm --filter @verisync/api typecheck
pnpm --filter @verisync/api lint
pnpm format:check

# 3. Run Phase 6 Specific Test Suites
pnpm --filter @verisync/api test src/devices/devices.service.spec.ts
pnpm --filter @verisync/api test src/audit/audit-chain.spec.ts
pnpm --filter @verisync/api test src/auth/security-hardening.spec.ts
pnpm --filter @verisync/api test src/auth/authorization-matrix.spec.ts

# 4. Run Monorepo Test Suite
pnpm test
```
