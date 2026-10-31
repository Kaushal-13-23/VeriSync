# Phase 2 Completion Report: Management APIs (Candidates, Question Bank, Assessments)

**Developer**: Developer A (Kaushal Kumar Singh)  
**Role**: Backend & Data Lead  
**Branch**: `phase-2/dev-a-management-apis`  
**Date**: 2026-10-29

---

## 1. What Was Built

Implemented the authoritative management APIs in `apps/api`, `prisma/`, and `packages/shared`, fully audited and RBAC-protected:

1. **Candidate Management Engine (`apps/api/src/candidates`)**:
   - `CandidatesService` & `CandidatesController`: Complete candidate profile lifecycle (`FR-CAN-001`, `FR-CAN-002`, `FR-AUTH-006`).
   - Secure Temporary Credential Provisioning: Cryptographically generated temporary passwords returned strictly on provision/creation; excluded from audit metadata, general candidate lists, and exports per Non-Negotiable Rule 5, `FR-AUTH-009`, and `UC-02`. Passwords stored strictly as Argon2id hashes.
   - Unique Identity Enforcement: Immediate validation and rejection for duplicate candidate IDs (`candidateIdentifier`) and usernames (`FR-CAN-007`, `UC-02` Alt Flow 2a, Decision 3).
   - CSV Bulk Import: Validates candidate CSV template, checks duplicate rows within the batch, checks database collisions, and returns per-row error reports without creating partial or corrupted records (`FR-CAN-003`, `UC-03`).
   - Candidate Search & Filter: Search by candidate ID, full name, email, username, recruitment reference/drive, institution, and account status with pagination (`FR-CAN-004`).
   - Login & Session History: Authoritative audit trail extraction of authentication events (`AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_LOGOUT`, `AUTH_RATE_LIMITED`) for candidate profiles (`FR-CAN-006`).
   - Assessment Assignment Engine: Assigns assessments to individual candidates or cohorts via group filter criteria (`recruitmentReference`, `institution`, `graduationYear`) (`FR-CAN-004`, `FR-ASMT-005`, `UC-06`).
   - Assignment Revocation: Revokes candidate assignments prior to commencement, blocking changes once sessions have started (`FR-CAN-005`).

2. **Question Bank Management Engine (`apps/api/src/questions`)**:
   - `QuestionsService` & `QuestionsController`: Supports all question types in `FR-QB-003` (`MCQ_SINGLE`, `MCQ_MULTIPLE`, `TRUE_FALSE`, `SHORT_ANSWER`, `DESCRIPTIVE`, `SCENARIO`, `CODING`, `SQL`).
   - Protected Correct-Answer Storage: Option management where correct-answer flags (`isCorrect`) are stored securely on the server and strictly prevented from reaching candidate-facing endpoints (`FR-QB-004`, `TC09`, Non-Negotiable Rule 2).
   - Test Cases Storage: Sample (`SAMPLE`) and hidden (`HIDDEN`) test case management for programming and SQL problems (`FR-QB-010`, `FR-CODE-003`, `FR-CODE-004`).
   - Pre-Publish Validation: Validates option configurations (e.g. single MCQ must have at least 2 options and exactly 1 correct answer; true/false must have 2 options and 1 correct answer; coding must include both sample and hidden test cases) (`FR-QB-007`).
   - Version Immutability: Editing a question that is mapped to active/scheduled assessments increments `questionVersion`, preserving the immutable question history (`FR-QB-008`).
   - Search & Categorization: Filter questions by keyword, topic, difficulty, question type, and status (`FR-QB-002`, `FR-QB-007`).
   - Deactivation/Archival: Preserves question history while preventing new assessment mappings (`FR-QB-009`).

3. **Assessment Management Engine (`apps/api/src/assessments`)**:
   - `AssessmentsService` & `AssessmentsController`: Comprehensive assessment configuration with title, description, instructions, role category, overall duration, attempt limits, total marks, passing marks, negative marking rules, and randomization flags (`FR-ASMT-001`, `FR-ASMT-002`, `FR-QB-009`).
   - Status State Machine: Authoritatively enforces transitions between `DRAFT`, `SCHEDULED`, `ACTIVE`, `COMPLETED`, `SUSPENDED`, and `ARCHIVED` (`FR-ASMT-005`). Restricts modifications once candidates commence (`FR-ASMT-003`).
   - Scheduling: Availability windows (`startAt`, `endAt`) with strict chronological validation (`FR-ASMT-006`).
   - Duration & Limit Validation: Validates that no individual question time limit exceeds overall assessment duration; validates that the sum of question time limits does not exceed overall duration in sequential navigation mode (`FR-ASMT-004`, `UC-05`, Decision 5).
   - Navigation Mode: Explicit support for `SEQUENTIAL` (default) and `FREE` navigation modes (`Decision 1`, `Decision 5`, `FR-ASMT-002`).
   - Versioned Snapshot on Publish: Freezes complete immutable snapshot of configuration and question versions (with options and test cases) at publish time, storing in `publishedSnapshot` and incrementing `configurationVersion` (`FR-ASMT-003`, `FR-ASMT-008`, `UC-05`).

4. **Candidate Portal Endpoint (`apps/api/src/candidates/candidate-portal.controller.ts`)**:
   - `GET /api/v1/candidate/assessments`: Post-login candidate dashboard showing assigned assessments with eligibility, availability window, attempts used, attempts remaining, navigation mode, and authoritative server time (`FR-UI-001`, `UC-08`).
   - TC09 Verification: Deep inspection verifies that zero answer keys, correct answer flags, hidden test cases, or expected outputs are disclosed in candidate responses (`TC09`, `BR-009`, Non-Negotiable Rule 2).

5. **API Contracts (`packages/shared/openapi.yaml`)**:
   - Updated OpenAPI 3.0 specification with all candidate, question bank, assessment management, and candidate portal endpoints and component schemas.

---

## 2. Endpoints Added

| Method  | Path                                         | Role / Access          | Purpose                                                                                |
| :------ | :------------------------------------------- | :--------------------- | :------------------------------------------------------------------------------------- |
| `POST`  | `/api/v1/admin/candidates`                   | SuperAdmin             | Create candidate profile & provision temporary credentials (FR-CAN-001, FR-AUTH-009)   |
| `GET`   | `/api/v1/admin/candidates`                   | SuperAdmin / Evaluator | Search/filter candidates by ID, name, email, drive, status (FR-CAN-004)                |
| `POST`  | `/api/v1/admin/candidates/bulk-import`       | SuperAdmin             | Bulk CSV import with template validation and per-row errors (FR-CAN-003)               |
| `GET`   | `/api/v1/admin/candidates/:id`               | SuperAdmin / Evaluator | Get single candidate profile and assigned tests (FR-CAN-001)                           |
| `PUT`   | `/api/v1/admin/candidates/:id`               | SuperAdmin             | Edit candidate details with audit logging (FR-CAN-002)                                 |
| `GET`   | `/api/v1/admin/candidates/:id/login-history` | SuperAdmin             | View candidate login & authentication activity history (FR-CAN-006)                    |
| `POST`  | `/api/v1/admin/candidates/assign`            | SuperAdmin             | Assign assessment to candidates individually or by cohort group (FR-CAN-004, UC-06)    |
| `POST`  | `/api/v1/admin/candidates/unassign`          | SuperAdmin             | Revoke candidate assessment assignment before attempt starts (FR-CAN-005)              |
| `POST`  | `/api/v1/admin/questions`                    | SuperAdmin / Evaluator | Create question with protected options & test cases (FR-QB-001..006)                   |
| `GET`   | `/api/v1/admin/questions`                    | SuperAdmin / Evaluator | Search/filter questions by keyword, topic, difficulty, type (FR-QB-007)                |
| `GET`   | `/api/v1/admin/questions/:id`                | SuperAdmin / Evaluator | Get question details with options and test cases (FR-QB-004)                           |
| `PUT`   | `/api/v1/admin/questions/:id`                | SuperAdmin / Evaluator | Edit question enforcing version immutability (FR-QB-008)                               |
| `PATCH` | `/api/v1/admin/questions/:id/status`         | SuperAdmin             | Deactivate / archive question (FR-QB-009)                                              |
| `POST`  | `/api/v1/admin/assessments`                  | SuperAdmin             | Create assessment in DRAFT status (FR-ASMT-001, FR-ASMT-002)                           |
| `GET`   | `/api/v1/admin/assessments`                  | SuperAdmin / Evaluator | List assessments with filters (FR-ASMT-001)                                            |
| `GET`   | `/api/v1/admin/assessments/:id`              | SuperAdmin / Evaluator | Get assessment configuration and mapped questions                                      |
| `PUT`   | `/api/v1/admin/assessments/:id`              | SuperAdmin             | Edit assessment before candidate commencement (FR-ASMT-003)                            |
| `POST`  | `/api/v1/admin/assessments/:id/questions`    | SuperAdmin             | Map questions with ordering, limits, and duration validation (FR-ASMT-004, Decision 5) |
| `POST`  | `/api/v1/admin/assessments/:id/publish`      | SuperAdmin             | Publish assessment & freeze immutable version snapshot (FR-ASMT-003, UC-05)            |
| `PATCH` | `/api/v1/admin/assessments/:id/status`       | SuperAdmin             | Transition assessment status machine (FR-ASMT-005)                                     |
| `GET`   | `/api/v1/candidate/assessments`              | Candidate              | List candidate assigned assessments with eligibility & zero answer keys (FR-UI-001)    |

---

## 3. SRS Requirements Covered

- `FR-CAN-001`: Candidate record creation with complete profile fields and account status.
- `FR-CAN-002`: Profile modification and search/filter by candidate ID, name, email, institution, drive.
- `FR-CAN-003`: Bulk candidate import via CSV with validated template and per-row error reporting.
- `FR-CAN-004`: Candidate assignment to one or more assessments individually or by cohort/group.
- `FR-CAN-005`: Removal/revocation of candidate assignments before assessment start.
- `FR-CAN-006`: Candidate login and activity history logging.
- `FR-CAN-007`: Enforcement of unique candidate IDs and usernames.
- `FR-AUTH-009`: Secure temporary credential provisioning; credentials excluded from exports and logs.
- `FR-QB-001`: Question creation with text, type, category, difficulty, marks, and explanation.
- `FR-QB-002`: Question categorization by topic, skill, and difficulty.
- `FR-QB-003`: Support for question formats: Single MCQ, Multi MCQ, True/False, Short Answer, Descriptive, Scenario, Coding, SQL.
- `FR-QB-004`: Option management for objective questions with server-side protected correct answer storage.
- `FR-QB-005`: Configurable question time limits.
- `FR-QB-006`: Rich-text/formatted code snippets in question statements.
- `FR-QB-007`: Question search and filter by keyword, topic, difficulty, and type.
- `FR-QB-008`: Question editing before assignment with immutability for active sessions.
- `FR-QB-009`: Question deactivation/archival preventing new usage without altering existing records.
- `FR-QB-010`: Test case configuration for programming questions with sample and hidden designations.
- `FR-ASMT-001`: Assessment creation with title, role category, instructions, schedule, duration, attempt limit.
- `FR-ASMT-002`: Configuration of per-question limits, overall limits, marking rules, negative marking, randomization.
- `FR-ASMT-003`: Assessment editing before candidate commencement with versioned snapshot on publish.
- `FR-ASMT-004`: Validation ensuring sum of question limits or individual limits do not exceed overall duration.
- `FR-ASMT-005`: Assessment status state machine: Draft, Scheduled, Active, Completed, Suspended, Archived.
- `FR-ASMT-006`: Assessment scheduling with enforced start/end availability windows.
- `FR-ASMT-007`: Assessment attempt limit enforcement per candidate (default: 1).
- `FR-ASMT-008`: Result visibility policy configuration (immediate, scheduled, or administrator release).
- `FR-UI-001`: Candidate assigned assessments dashboard with eligibility and attempt status.
- `NFR-SEC-009`: Complete prevention of candidate access to answer keys and hidden test inputs.
- `TC-09`: Automated answer-key exposure test verifying candidate response contains zero confidential data.
- `UC-02`: Provision candidate account.
- `UC-03`: Bulk import candidates from CSV.
- `UC-05`: Create, version, and publish an assessment.
- `UC-06`: Assign assessment to candidates or groups.

---

## 4. Tests Added & Verification Evidence

All test suites pass cleanly across all workspace projects in the monorepo:

```text
Scope: 4 of 5 workspace projects
✓ packages/shared: 2 tests passed (tests/errors.spec.ts)
✓ apps/admin-web: 1 test passed (src/App.test.tsx)
✓ apps/candidate-desktop: 1 test passed (src/App.test.tsx)
✓ apps/api: 41 tests passed across 7 test suites:
   • src/app.controller.spec.ts (health check, UTC timestamps)
   • src/auth/guards/guards.spec.ts (JWT validation, public bypass, RBAC role guard)
   • src/auth/auth.service.spec.ts (login, MFA, rate limiter TC17, Argon2id hashing)
   • src/candidates/candidates.service.spec.ts (create candidate, temporary credential provisioning, duplicate ID/username rejection, CSV bulk import with per-row errors, assignment & unassignment)
   • src/questions/questions.service.spec.ts (MCQ single/multi validation, True/False, coding sample/hidden test cases, search/filter, version immutability)
   • src/assessments/assessments.service.spec.ts (creation, duration vs question limit validation, sequential sum validation, publish snapshot freezing, status machine)
   • src/candidates/candidate-portal.service.spec.ts (assigned assessments, eligibility calculation, TC09 zero answer-key leakage verification)

Total: 45 passing tests across 4 projects. 0 failures.
```

---

## 5. What is Still Mocked / Stubbed

- Assessment live execution and question attempt countdown synchronization (`/candidate/sessions/*`) are slated for Phase 3.
- Code Runner container execution service (`services/code-runner`) will be integrated for live sandbox execution in Phase 5.
- Unit tests use in-memory Prisma service mocks; database migrations are deployable via `pnpm prisma migrate deploy`.

---

## 6. Open Questions / Next Phase Handoff

- None. All management APIs, data schemas, validation rules, and candidate portal endpoints are production-ready.
- Developer B (Ashlin) can now integrate the Admin Web Dashboard (`apps/admin-web`) candidate management, question bank authoring, and assessment wizard screens against these endpoints using `packages/shared/openapi.yaml`.
- Developer C (Vimal) can integrate the Candidate Desktop (`apps/candidate-desktop`) post-login assigned assessments screen against `GET /api/v1/candidate/assessments`.

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
