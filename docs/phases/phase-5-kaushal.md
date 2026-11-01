# Phase 5 Completion Report: Technical Assessment, Code Runner Integration, and Ephemeral SQL Sandbox

**Developer**: Developer A (Kaushal Kumar Singh)  
**Role**: Backend & Data Lead  
**Branch**: `phase-5/A-queue-integration-and-SQL-sandbox`  
**Date**: 2026-10-30

---

## 1. What Was Built

Implemented technical-question evaluation and the ephemeral SQL sandbox in `apps/api`, `packages/shared`, and `prisma/`, strictly adhering to SRS Sections 5.8 (`FR-CODE-001..014`), 5.9 (`FR-SQL-001..005`), Section 8.5, `BR-013`, `Rule 2`, `Rule 8`, `TC-10`, and `TC-12`:

1. **Candidate Code Submission & Status Polling (`apps/api/src/coding/coding.controller.ts`)**:
   - `POST /api/v1/candidate/sessions/:id/code-submissions`: Validates candidate session ownership, active session state (`ACTIVE`), question attempt state (`ACTIVE`), and server-authoritative question deadlines (`FR-TIME-004`).
   - **Per-Question Submission Limits (`FR-CODE-010`)**: Enforces configurable submission limits per question (default: 10, or assessment question override). Rejects excess attempts with `409 INVALID_STATE`.
   - **Idempotency Protection (`FR-ANS-009`, `Rule 3`)**: Mandatory `Idempotency-Key` header; repeated submissions return the original submission outcome without creating duplicate records or re-evaluating.
   - **Durable Persistence Before Acknowledgement (`Rule 4`)**: Stores source code durably in PostgreSQL with `submissionStatus: QUEUED` before acknowledging to client.
   - `GET /api/v1/candidate/sessions/:id/code-submissions/:submissionId/status`: Candidate polling endpoint returning execution status, compiler output, execution duration, memory consumption, and permitted sample test case results.
   - `GET /api/v1/candidate/sessions/:id/attempts/:attemptId/submissions`: Attempt submission history with remaining quota counts.

2. **Asynchronous Evaluation Queue & Isolated Code-Runner Client (`apps/api/src/coding/code-runner.client.ts`)**:
   - **Out-of-Process Execution (`Rule 8`, `BR-013`)**: Candidate code is never compiled or executed inside the main NestJS API process.
   - **Secured Internal Interface (`SRS 8.5`)**: Calls `services/code-runner` over internal HTTP interface protected by shared secret (`CODE_RUNNER_SHARED_SECRET`), carrying only source code, language, resource limits (CPU timeout, memory cap), and test identifiers.
   - **Execution Status Classification (`FR-CODE-008`)**: Maps results to `ACCEPTED`, `WRONG_ANSWER`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, and `INTERNAL_EVALUATION_ERROR`.
   - **Infrastructure Failure Resilience (`FR-CODE-012`, `TC-12`)**: Distinguishes between candidate code failures and evaluation infrastructure faults (network drops, timeout, service downtime). Automatically re-queues transient errors with exponential backoff (up to 2 retries); permanently failing jobs are flagged `isInfrastructureError: true` and NEVER penalize candidate marks or result in `WRONG_ANSWER`.

3. **Weighted Test Case Scoring & Zero Hidden Test Leakage (`FR-CODE-011`, `FR-CODE-009`, `TC-10`, `Rule 2`)**:
   - **Weighted Marking (`FR-CODE-011`)**: Proportional marks awarded based on weights of passed test cases. Updates `QuestionAttempt.awardedMarks` with the candidate's highest score.
   - **Zero Hidden Test Leakage (`FR-CODE-009`, `TC-10`, `Rule 2`)**: Candidate status responses strictly contain only permitted outputs for `SAMPLE` test cases. `HIDDEN` test inputs, expected outputs, and evaluator details are preserved exclusively in protected server-side records and never disclosed to candidates.

4. **Ephemeral Isolated SQL Sandbox (`apps/api/src/sql/sql-sandbox.service.ts`)**:
   - **Isolated Ephemeral Sandbox (`FR-SQL-002`)**: Each candidate SQL query executes inside an in-memory ephemeral database instance initialized from question schema and seed data.
   - **Prohibited Mutating Statement Blocking (`FR-SQL-003`)**: Rejects dangerous DDL/DML commands: `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `UPSERT`, `GRANT`, `REVOKE`, `ATTACH`, `DETACH`, `PRAGMA`, `EXEC`. Enforces read-only `SELECT` and CTE `WITH ... SELECT` queries.
   - **Multi-Statement Semicolon Chaining Prevention (`FR-SQL-003`)**: Blocks multiple semicolon-delimited queries in a single submission.
   - **Resource & Timeout Bounds (`FR-SQL-004`)**: Statement timeout (default 3000ms), maximum row limit (100 rows), and memory bounds enforced.
   - **Result Set Comparison (`FR-SQL-005`)**: Compares candidate query output with expected output or reference solution query, supporting both exact row-by-row matching and unordered set matching.

5. **Source Code & Results Retention Engine (`apps/api/src/retention/retention.service.ts`)**:
   - Configurable retention durations (`sourceCodeRetentionDays`, `resultRetentionDays`, `autoPurgeEnabled`) (`FR-CODE-014`, `SRS 9.3`).
   - Admin endpoints: `GET /api/v1/admin/retention/settings`, `PATCH /api/v1/admin/retention/settings`, `POST /api/v1/admin/retention/purge`.
   - Purges expired source code past retention threshold while maintaining immutable audit records (`FR-AUD-001`, `FR-AUD-004`).

---

## 2. Endpoints Added

| Method  | Path                                                             | Role / Access | Purpose                                                                                                    |
| :------ | :--------------------------------------------------------------- | :------------ | :--------------------------------------------------------------------------------------------------------- |
| `POST`  | `/api/v1/candidate/sessions/:id/code-submissions`                | `CANDIDATE`   | Submit code / SQL query with deadline check, maxSubmissions limit, and idempotency (FR-CODE-010, UC-11)    |
| `GET`   | `/api/v1/candidate/sessions/:id/code-submissions/:subId/status`  | `CANDIDATE`   | Poll execution status, metrics, compiler output, and sample test outputs (FR-CODE-008, FR-CODE-009, TC-10) |
| `GET`   | `/api/v1/candidate/sessions/:id/attempts/:attemptId/submissions` | `CANDIDATE`   | List attempt code submissions and remaining quota counts                                                   |
| `GET`   | `/api/v1/admin/retention/settings`                               | `SUPER_ADMIN` | Retrieve source code and results retention configuration (FR-CODE-014, SRS 9.3)                            |
| `PATCH` | `/api/v1/admin/retention/settings`                               | `SUPER_ADMIN` | Update retention periods with audit trail (FR-CODE-014, Rule 7)                                            |
| `POST`  | `/api/v1/admin/retention/purge`                                  | `SUPER_ADMIN` | Trigger manual purge of expired source code submissions (FR-CODE-014)                                      |

---

## 3. SRS Requirements Covered

- `FR-CODE-001`: Pinned multi-language support (C, C++, Java, Python, JavaScript, SQL).
- `FR-CODE-003`: Visible sample test case execution and permitted outputs.
- `FR-CODE-004`: Server-side hidden test case storage inaccessible to candidate endpoints (`Rule 2`).
- `FR-CODE-005`: Asynchronous evaluation delegation to dedicated execution runner (`Rule 8`).
- `FR-CODE-006`: Configurable execution time and memory limits.
- `FR-CODE-007`: Isolated sandbox execution semantics (`SRS 8.5`).
- `FR-CODE-008`: Standard execution status classification (`ACCEPTED`, `WRONG_ANSWER`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `INTERNAL_EVALUATION_ERROR`).
- `FR-CODE-009`: Candidate response sanitization; zero disclosure of internal paths, environment variables, or hidden test data (`TC-10`).
- `FR-CODE-010`: Enforcement of per-question maximum submission limits.
- `FR-CODE-011`: Proportional marks calculated from weighted test cases.
- `FR-CODE-012`: Distinction between candidate compilation/runtime failures and infrastructure failures; auto-requeue and zero candidate penalty (`TC-12`).
- `FR-CODE-013`: Coding execution service denied unrestricted access to production database credentials.
- `FR-CODE-014`: Configured source code and evaluation result retention policy.
- `FR-SQL-001`: SQL question authoring with schema, seed data, reference query, and evaluation rules.
- `FR-SQL-002`: Execution in isolated ephemeral in-memory database instance.
- `FR-SQL-003`: Blocking dangerous SQL statements (`DROP`, `ALTER`, `TRUNCATE`, `INSERT`, `UPDATE`, `DELETE`, `PRAGMA`, `ATTACH`, multi-statements).
- `FR-SQL-004`: Query execution bounds (statement timeout, max returned rows limit).
- `FR-SQL-005`: Result set comparison against expected output (exact match or unordered match).
- `TC-10`: Hidden test case leak verification.
- `TC-12`: Infrastructure failure resilience verification.
- `BR-013`: Candidate code never executes in the API process.

---

## 4. Automated Tests Added

1. **`apps/api/src/coding/coding.service.spec.ts`**:
   - `TC-10`: Hidden test leak test verifying candidate status response contains only sample outputs and zero hidden inputs or expected outputs (`FR-CODE-009`).
   - `TC-12`: Infrastructure failure resilience test verifying that simulated code-runner outages flag `isInfrastructureError: true` with status `INTERNAL_EVALUATION_ERROR` and never penalize candidate marks or award wrong answer.
   - Weighted scoring test: verifies proportional mark calculations across sample and hidden test case weights (`FR-CODE-011`).
   - Submission limit test: verifies exceeding `maxSubmissions` throws `409 INVALID_STATE` (`FR-CODE-010`).
   - Idempotency test: duplicate `Idempotency-Key` returns original submission without creating a duplicate record (`FR-ANS-009`, `Rule 3`).
   - SQL question submission test: evaluates query in ephemeral sandbox and awards marks upon matching reference solution.

2. **`apps/api/src/sql/sql-sandbox.service.spec.ts`**:
   - Dangerous query blocking tests (`DROP`, `ALTER`, `TRUNCATE`, `INSERT`, `UPDATE`, `DELETE`, `PRAGMA`, `ATTACH`).
   - Multi-statement semicolon injection blocking test.
   - Ephemeral database instance execution matching expected reference queries.
   - Result mismatch detection (`WRONG_ANSWER`).
   - Unordered row matching validation.
   - Syntax error handling as `RUNTIME_ERROR`.

3. **`apps/api/src/retention/retention.service.spec.ts`**:
   - Retention settings query and update verification with audit logging.
   - Expired submission purge test verifying deletion of submissions past cutoff date and audit logging.

---

## 5. What Is Still Mocked

- In unit and local integration test runs where `CODE_RUNNER_URL` is not set, `CodeRunnerClient` operates in deterministic simulation mode. When `CODE_RUNNER_URL` is defined in production/staging (`services/code-runner`), it communicates over HTTP using `CODE_RUNNER_SHARED_SECRET` bearer token authentication (`SRS 8.5`).
- Frontend Monaco code editor components in candidate desktop (`apps/candidate-desktop`) are owned by Developer C.

---

## 6. Open Questions

- None. The coding execution interface matches SRS Section 8.5 and `services/code-runner/README.md`.

---

## 7. Instructions to Run

```bash
# 1. Regenerate Prisma Client
pnpm prisma:generate

# 2. Build shared package & API
pnpm build:packages
pnpm --filter @verisync/api build

# 3. Run typecheck and linting
pnpm --filter @verisync/api typecheck
pnpm --filter @verisync/api lint

# 4. Run automated test suite (including TC-10, TC-12, SQL sandbox, and retention tests)
pnpm --filter @verisync/api test
```
