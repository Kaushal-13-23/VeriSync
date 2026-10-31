# Phase 3 Completion Report: Exam Runtime, Timing, and Submission Engine

**Developer**: Developer A (Kaushal Kumar Singh)  
**Role**: Backend & Data Lead  
**Branch**: `phase-3/dev-a-sessions-timing-exam`  
**Date**: 2026-10-29

---

## 1. What Was Built

Implemented the server-authoritative examination runtime engine in `apps/api`, `prisma/`, and `packages/shared`, adhering strictly to SRS Sections 3.2, 3.3, 3.4, 5.5, 5.6, and all non-negotiable security rules:

1. **Session Lifecycle & Eligibility Engine (`apps/api/src/sessions/sessions.service.ts`)**:
   - `startSession`: Validates candidate account status (`ACTIVE`), assignment presence, availability window, attempt limits (`FR-ASMT-006`), approved client version (`FR-LAB-003`, `TC-16`), and device status (`FR-LAB-004`).
   - Single Active Session Enforcement: Authoritatively prevents concurrent active attempts per assignment (`BR-007`, `TC-15`), returning `409 INVALID_STATE`.
   - Per-Session Randomization: Dynamically randomizes question ordering and option presentation per candidate session when enabled (`FR-QB-009`, `FR-ASMT-002`).
   - Question 1 Activation & Capped Deadlines: Automatically initializes and activates the first question attempt with deadline = `serverNow + timeLimitSeconds`, capped by the overall assessment deadline (`FR-TIME-002`, `FR-TIME-003`, `FR-TIME-007`).

2. **Server-Authoritative Question Delivery & Status Synchronization**:
   - `getCurrentQuestion`: Delivers active question in sequential mode with server-computed deadline and remaining time (`FR-UI-003`). Strictly strips all answer keys, option `isCorrect` flags, hidden test cases (`visibility === 'HIDDEN'`), and internal paths (`Rule 2`, `BR-009`, `TC-09`).
   - `getSessionStatus`: Authoritative server clock synchronization, overall remaining seconds, current question remaining seconds, and read-only question palette progression (`ANSWERED`, `CURRENT`, `NOT_ANSWERED`) (`FR-TIME-008`, `FR-UI-004`, `FR-UI-005`).
   - Disconnection Recovery: If a disconnected/crashed client reconnects, the session automatically transitions from `INTERRUPTED` back to `ACTIVE` while keeping authoritative server deadlines running continuously without pauses (`BR-010`, `TC-07`, `FR-TIME-010`, `UC-12`).

3. **Idempotent Answer Submission Pipeline (`apps/api/src/sessions/sessions.service.ts`)**:
   - `submitAnswer`: Accepts answers only for candidate's active question attempt (`FR-ANS-001`).
   - Sequential Progression: Submissions for pending/future questions return `409 INVALID_STATE` (`FR-ANS-001`, `BR-003`, `TC-02`).
   - Deadline Enforcement: Late submissions arriving after the server deadline return `409 QUESTION_EXPIRED`, mark the question `TIMED_OUT`, and auto-advance (`FR-TIME-004`, `TC-03`).
   - Idempotency & Concurrency: Mandatory `Idempotency-Key` header (`FR-ANS-009`, `TC-04`, `TC-05`). Duplicate or retried submissions return the original acknowledgement without creating duplicate records or double scoring.
   - Durable Persistence: Commits the answer and transitions question attempt state to `SUBMITTED` within a durable database transaction before acknowledging (`NFR-REL-002`, `Rule 4`).
   - Automatic Progression: Automatically advances and activates the next question in sequence with a fresh deadline (`FR-TIME-005`).

4. **Draft Autosave & Final Assessment Submission**:
   - `saveDraft`: Allows candidates to autosave drafts for subjective/coding questions without submitting or extending deadlines (`FR-ANS-005`).
   - `finalSubmit`: Explicit candidate submission finalizing any active questions, transitioning session to `SUBMITTED`, marking assignment `COMPLETED`, and locking out further changes (`FR-ANS-008`, `UC-13`, `Decision 4`).

5. **Administrative Session Overrides Engine**:
   - `adminOverride`: SuperAdmin overrides (`EXTEND`, `REOPEN`, `PAUSE`, `RESUME`, `CANCEL`) requiring a mandatory, non-empty reason (`BR-012`, `UC-12`, `FR-TIME-011`). Fully recorded in immutable append-only `audit_logs`.

6. **Background Expiry Worker (`apps/api/src/sessions/session-expiry.worker.ts`)**:
   - Periodic 2-second background sweeper scanning active sessions and question attempts.
   - Timed-out Question Handling: Finalizes expired questions as `TIMED_OUT` and auto-advances (`FR-TIME-005`, `FR-TIME-006`).
   - Simultaneous Deadline Tie-Breaking: When a question deadline and overall session deadline expire together, the overall deadline takes precedence and transitions session to `EXPIRED` (`FR-TIME-007`, `TC-06`).
   - Interruption Detection: Flags active sessions as `INTERRUPTED` if client heartbeat is lost for > 60 seconds (`BR-010`, `UC-12`).
   - Opportunistic In-Band Expiry: API calls synchronously trigger expiry checks, ensuring 0ms latency on client operations.

7. **API Contracts (`packages/shared/openapi.yaml`) & Types (`packages/shared/src/types.ts`)**:
   - Fully documented OpenAPI 3.0 endpoints for session startup, active question retrieval, status sync, heartbeat, answer submission, draft saving, final submit, and admin overrides.

---

## 2. Endpoints Added

| Method | Path                                              | Role / Access | Purpose                                                                                             |
| :----- | :------------------------------------------------ | :------------ | :-------------------------------------------------------------------------------------------------- |
| `POST` | `/api/v1/candidate/assessments/:id/start`         | Candidate     | Start assessment session, version & device check, activate question 1 (UC-08, BR-007, TC-15, TC-16) |
| `GET`  | `/api/v1/candidate/sessions/:id/current-question` | Candidate     | Get active question & deadline, zero answer keys or hidden tests (FR-UI-003, TC-08, TC-09)          |
| `GET`  | `/api/v1/candidate/sessions/:id/status`           | Candidate     | Authoritative remaining time sync, palette status, connection recovery (FR-TIME-008, TC-07)         |
| `POST` | `/api/v1/candidate/sessions/:id/heartbeat`        | Candidate     | Periodic keepalive & heartbeat monitoring (BR-010, UC-12)                                           |
| `POST` | `/api/v1/candidate/sessions/:id/answers`          | Candidate     | Submit answer with `Idempotency-Key`, durable commit before ack (FR-ANS-001..009, TC-01..05)        |
| `PUT`  | `/api/v1/candidate/sessions/:id/draft`            | Candidate     | Autosave response draft without extending deadline (FR-ANS-005)                                     |
| `POST` | `/api/v1/candidate/sessions/:id/final-submit`     | Candidate     | Final assessment submission and session locking (FR-ANS-008, UC-13)                                 |
| `POST` | `/api/v1/admin/sessions/:id/override`             | SuperAdmin    | Audited administrative session override (EXTEND, REOPEN, PAUSE, RESUME, CANCEL) (BR-012, UC-12)     |

---

## 3. SRS Requirements Covered

- `FR-TIME-001`: Authoritative backend timing; client clock never trusted for deadline decisions.
- `FR-TIME-002`: Server-recorded start timestamp for assessment sessions and question attempts.
- `FR-TIME-003`: Authoritative question deadline computation capped by overall assessment deadline.
- `FR-TIME-004`: Immediate rejection of answers arriving after the server-computed deadline (`409 QUESTION_EXPIRED`).
- `FR-TIME-005`: Automatic question finalization upon timeout with configured auto-advance policy.
- `FR-TIME-006`: Background expiry worker handling timed-out questions and expired sessions.
- `FR-TIME-007`: Overall assessment deadline precedence over remaining question time on simultaneous expiration.
- `FR-TIME-008`: Authoritative remaining-time synchronization API endpoint.
- `FR-TIME-009`: Enforcement of sequential question progression without revisiting past questions.
- `FR-TIME-010`: Continuous deadline progression during candidate disconnection; no deadline pauses.
- `FR-TIME-011`: Audited administrative session extension/reopening overrides with mandatory reason.
- `FR-ANS-001`: Answer acceptance only for the candidate's currently active question attempt.
- `FR-ANS-002`: Verification of session, question attempt state, deadline, and payload structure.
- `FR-ANS-003`: Durable database persistence of accepted answers before sending acknowledgement.
- `FR-ANS-004`: Invalidation of subsequent answer modifications once an answer is accepted.
- `FR-ANS-005`: Local draft autosave for long-form answers without extending deadlines or submitting.
- `FR-ANS-006`: Authoritative server acknowledgement; client displays success only upon receipt.
- `FR-ANS-007`: Safe connection recovery without duplicating accepted submissions.
- `FR-ANS-008`: Assessment completion marking with prevention of further changes.
- `FR-ANS-009`: Mandatory client-generated `Idempotency-Key` on all submissions; duplicate keys return original result.
- `FR-LAB-003`: Installed client version verification on connection; rejection of outdated versions with 426 (`TC-16`).
- `FR-LAB-004`: Lab device status enforcement (blocking rejected devices with 403).
- `FR-AUD-002`: Audit logging for candidate session events (`SESSION_START`, `QUESTION_SUBMIT`, `SESSION_SUBMIT`).
- `NFR-REL-002`: Durable database transaction commits before submission acknowledgement.
- `NFR-REL-003`: Idempotent API endpoints preventing duplicate records on network retries.
- `NFR-REL-004`: Seamless candidate session recovery following crash or reconnection.
- `NFR-PERF-004`: Background expiry worker latency under 1000ms from scheduled deadline.

---

## 4. Tests Added & Verification Evidence

Added comprehensive test suite in `apps/api/src/sessions/sessions.service.spec.ts` (18 new test cases, total 59 tests in API, 63 monorepo-wide):

1. **TC-01 (Clock Manipulation)**:
   - Validates that changing the client's local clock forward or backward has zero impact on server deadlines; acceptance depends strictly on server time.
2. **TC-02 (Skip Question via API)**:
   - Validates that submitting an answer for a future/pending question attempt returns `409 INVALID_STATE` and creates no database record.
3. **TC-03 (Late Answer Submission)**:
   - Validates that an answer arriving after the server deadline is rejected with `409 QUESTION_EXPIRED`, marks the question `TIMED_OUT`, and auto-advances.
4. **TC-04 (Duplicate Submission with Same Idempotency Key)**:
   - Validates that sending the same answer twice with one idempotency key produces exactly one stored answer and returns the original accepted result.
5. **TC-05 (Lost Acknowledgement Retry)**:
   - Validates that network retries after dropped responses return the original acknowledgement without creating duplicate submissions.
6. **TC-06 (Simultaneous Deadlines Tie-Breaking)**:
   - Validates that when a question deadline coincides with or exceeds the overall deadline, the overall deadline takes precedence and transitions session to `EXPIRED`.
7. **TC-07 (Disconnect During Question)**:
   - Validates that disconnecting a candidate session (`INTERRUPTED`) and reconnecting resumes session to `ACTIVE`; the remaining time reflects the disconnected interval without resetting deadlines.
8. **TC-15 (Second Active Session Prevention)**:
   - Validates that starting a second session on another lab machine while one is already active is rejected with `409 INVALID_STATE`.
9. **TC-16 (Unsupported Client Version)**:
   - Validates that connecting with a retired or unsupported client version returns `426 UNSUPPORTED_CLIENT`.
10. **Concurrency Tests**:
    - Validates parallel concurrent submissions with identical idempotency keys; all resolve safely to the identical accepted result without duplicate records.
11. **Draft Autosave & Final Submit**:
    - Validates that saving drafts persists payload without changing deadlines; final submission transitions session to `SUBMITTED` and assignment to `COMPLETED`.
12. **Admin Overrides (BR-012)**:
    - Validates `EXTEND`, `REOPEN`, `PAUSE`, `RESUME`, `CANCEL` with mandatory reason validation and append-only audit logging.
13. **Session Expiry Background Worker**:
    - Validates periodic scanning and processing of expired sessions and missed heartbeats.

### Automated Test Suite Execution:

```bash
$ pnpm test
packages/shared: 2 passed
apps/admin-web: 1 passed
apps/candidate-desktop: 1 passed
apps/api: 59 passed (8 test suites)
Total: 63 passed across 4 projects
```

---

## 5. What Is Still Mocked

- **Coding Sandbox Execution (`services/code-runner`)**: Code evaluation remains delegated to the isolated execution runner owned by Dev B (`services/code-runner`). In `apps/api`, code submissions are recorded and queued in `coding_submissions`.
- **Automated Objective Scoring & Negative Marking (`FR-SCORE`)**: Scored in Phase 4 when candidate sessions complete and evaluation jobs run.

---

## 6. Open Questions

- None. All SRS requirements, state machine transitions, and timing constraints are fully specified and verified.

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

# 3. Start development API server
pnpm dev:api
```
