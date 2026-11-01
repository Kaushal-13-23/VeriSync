# VeriSync System Architecture Document

## 1. Executive Summary

VeriSync is an enterprise-grade placement assessment platform architected for secure, tamper-evident technical evaluations across managed university computer laboratories and cloud environments. It guarantees rigorous exam integrity through strict server-authoritative controls, cryptographic audit chains, isolated technical sandboxes, and defense-in-depth kiosk protections.

---

## 2. Core Architectural Principles (Non-Negotiable Rules)

1. **Server Authority (Rule 1)**: The server is the exclusive authority for deadlines, answer acceptance, scoring, and authorization. Clients are strictly untrusted; client clocks are never consulted for decisions.
2. **Information Secrecy (Rule 2)**: Candidate-facing APIs never expose answer keys, hidden test cases, or expected outputs.
3. **Idempotency (Rule 3)**: Every answer and code submission carries an `Idempotency-Key` header. Repeated requests return the identical result and produce no duplicate records.
4. **Durable Persistence Before Acknowledgement (Rule 4)**: Accepted candidate submissions are durably committed to the database _before_ the HTTP acknowledgement is transmitted.
5. **Argon2id & Secret Hygiene (Rule 5)**: Passwords use Argon2id with 64 MB memory and 3 iterations. No secrets, tokens, or private keys exist in source control or logs; all credentials are read from environment variables or secrets managers.
6. **Parameterized Storage & RBAC (Rule 6)**: All SQL queries use parameterized queries (via Prisma ORM). Strict Role-Based Access Control (`SUPER_ADMIN`, `ADMIN`, `CANDIDATE`) is enforced on every protected endpoint.
7. **Tamper-Evident Auditing (Rule 7, SRS 10.1)**: Administrative overrides, score corrections, assessment publications, and session terminations are recorded in a SHA256 cryptographic hash-chained audit log with actor attribution and mandatory rationale.
8. **Isolated Code Runner (Rule 8)**: Candidate code execution is completely decoupled from the API process into an isolated sandbox service.
9. **Standardized UTC & Error Model (Rule 9)**: Timestamps are stored and exchanged in UTC ISO-8601 format. Errors adhere strictly to SRS 8.3.3 error payload conventions with traceable correlation IDs.

---

## 3. High-Level Component Architecture

```
                    +------------------------------------+
                    |        Managed Lab Computers       |
                    | Candidate Desktop (Lockdown Kiosk) |
                    +-----------------+------------------+
                                      |
                     HTTPS / WSS      | Mutual Device Binding (FR-AUTH-010)
                     Bearer JWT       | Approved Client Check (FR-LAB-001)
                                      v
                    +------------------------------------+
                    |       Ingress / Load Balancer      |
                    | Rate Limiting & TLS 1.3 Termination|
                    +-----------------+------------------+
                                      |
           +--------------------------+--------------------------+
           |                                                     |
           v                                                     v
+-----------------------+                             +----------------------+
|  VeriSync NestJS API  |                             |  Super Admin Web UI  |
| - Authentication/RBAC |                             | - Candidate Mgmt     |
| - Assessment Engine   |                             | - Assessment Config  |
| - Session Timers      |<============================| - Results & Reports  |
| - Evaluation Engine   |    Admin REST / GraphQL     | - Audit Trail Review |
| - Audit Chain Service |                             +----------------------+
+-----------+-----------+
            |
            |-- (Job Queue) --> +----------------------------------+
            |                   | Code Runner Sandbox (Isolated)   |
            |                   | Docker / gVisor Container Worker |
            |                   +----------------------------------+
            |
            +-----------------+
                              | Prisma ORM (Connection Pool tuned 60/inst)
                              v
                    +--------------------+
                    |  PostgreSQL 16 DB  |
                    | (18 core entities) |
                    +---------+----------+
                              |
                    +---------v----------+
                    | WAL Archive / PITR |
                    | (RPO <= 15 min)    |
                    +--------------------+
```

---

## 4. Module Decomposition

### 4.1 Authentication & Authorization (`apps/api/src/auth`)

- **JWT Lifecycles**: Short-lived Access Tokens (15 min) and Refresh Tokens (7 days).
- **Device & Version Binding (FR-AUTH-010, FR-LAB-001)**: Candidate tokens are cryptographically bound to registered lab device references (`X-Device-Id`) and approved client version hashes (`X-Client-Version`).
- **Server-Side Revocation (FR-AUTH-006, 007)**: Revoked JWT identifiers (`jti`) persisted in `revoked_tokens` table for instant session termination.

### 4.2 Assessment & Session Engine (`apps/api/src/sessions`, `apps/api/src/assessments`)

- **Server-Side State Machine**: `NOT_STARTED` -> `IN_PROGRESS` -> `SUBMITTED` / `AUTO_SUBMITTED` / `EXPIRED`.
- **Authoritative Timers (SRS 3.4)**: Deadlines calculated exclusively on the server (`deadlineAt = startedAt + durationSeconds`). Client timers act purely as informational visual countdowns.
- **Background Expiry Worker (`SessionExpiryWorker`)**: Polling sweep identifying expired sessions and questions every 10 seconds, backed by composite index `[attemptStatus, deadlineAt]`.

### 4.3 Technical Sandbox Services (`apps/api/src/coding`, `apps/api/src/sql`)

- **In-Memory SQLite Sandbox (FR-SQL-001..005)**: Executes candidate SQL against fresh isolated schemas. Enforces statement timeouts (5s) and query structure validation.
- **Isolated Code Runner (FR-CODE-001..014)**: Offloads candidate code to sandboxed processes; candidate code never runs in API process space.

### 4.4 Tamper-Evident Audit Ledger (`apps/api/src/audit`)

- Implements blockchain-inspired SHA256 cryptographic chain:
  `currentHash = SHA256(previousHash || eventTimestamp || eventType || actorUserId || actionPayload || correlationId)`
- Immutable append-only storage in `audit_logs` table.

### 4.5 Observability & Probes (`apps/api/src/app.controller.ts`)

- **Probes**: `/health` (general), `/health/ready` (database connectivity probe), `/health/live` (process liveness).
- **Prometheus Metrics**: `/api/v1/metrics` exporting session counters, memory statistics, uptime, and HTTP request metrics.
