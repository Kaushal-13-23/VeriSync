# VeriSync Phase 2 Report: Developer B (Ashlin Siddharth)

**Role**: Frontend & Execution Lead (Developer B)  
**Branch**: `phase-2/B-admin-management`  
**Owned Subsystem**: `apps/admin-web`  
**Date**: October 29, 2026  
**Status**: Completed, 100% Green CI (Build, Lint, Typecheck, 30 Vitest Tests, Prettier)

---

## 1. What Was Built

In Phase 2, Developer B implemented the complete administration management interfaces against the VeriSync management API (backed by MSW v3 mocks aligned strictly with `packages/shared/openapi.yaml` and Dev A's backend endpoints).

### 1.1 Candidate Management Module (`FR-CAN-001..007`, `FR-AUTH-005`, `FR-AUTH-009`)

- **Candidate Roster Table** (`apps/admin-web/src/components/candidates/CandidateTable.tsx`):
  - Roster displaying Candidate ID (e.g. `CAN-2026-001`), full name, username, email, institution, drive, account status chip (`ACTIVE`, `INACTIVE`, `LOCKED`), and tests assigned badge.
  - Interactive row actions: View Detail Drawer, Edit Profile, Deactivate/Activate toggle, and Reset Password.
  - Pagination bar matching `docs/design/UI_Sample.jpeg` styling (_"Showing 1-6 of N candidates"_) with configurable items-per-page (6, 10, 25).
- **Multi-Parameter Search & Filters** (`apps/admin-web/src/components/candidates/CandidateFilters.tsx`):
  - Debounced keyword search across ID, candidate name, username, and email.
  - Recruitment Drive filter dropdown (e.g. `Autumn Campus 2026`, `Lateral Drive 2026`, `Internship Hiring 2026`).
  - Account status filter dropdown (`ALL`, `ACTIVE`, `INACTIVE`, `LOCKED`).
- **Add & Edit Candidate Modal** (`apps/admin-web/src/components/candidates/CandidateFormModal.tsx`):
  - Complete candidate registration form with client validation for ID, name, username, email format, institution, qualification, and graduation year (2000–2035).
  - Displays generated one-time temporary credentials upon enrollment with single-click clipboard copying (`FR-AUTH-005`).
- **Candidate Detail Slide-Out Drawer** (`apps/admin-web/src/components/candidates/CandidateDetailDrawer.tsx`):
  - 3-tab slide-out panel:
    - _Overview_: Personal details, academic affiliation, and recruitment drive.
    - _Assigned Tests_: Card list of allocated assessments with status badges (`READY`, `ACTIVE`, `SUBMITTED`, `EXPIRED`) and score breakdown.
    - _Login History_ (`FR-CAN-006`): Authoritative UTC ISO-8601 audit timeline showing IP addresses, user agents, and session outcomes (`SUCCESS` / `FAILED`).
- **CSV Bulk Candidate Import & Error Reporting** (`apps/admin-web/src/components/candidates/CsvImportModal.tsx`):
  - Drag-and-drop CSV upload with `.csv` format validation.
  - Downloadable standardized sample CSV template (`downloadSampleCsv`).
  - Robust header-aware CSV parser supporting standard column orders.
  - Interactive import summary and **Downloadable Error Report (CSV)** (`FR-CAN-003`) listing row numbers, candidate IDs, invalid fields, and failure reasons.
- **Authoritative Password Reset & Account Deactivation** (`apps/admin-web/src/components/candidates/ResetPasswordModal.tsx`):
  - Password reset generating secure temporary credentials with mandatory password change enforcement on next candidate login (`FR-AUTH-009`).
  - Confirmation modal for account deactivation that prevents new logins while preserving historical audit logs (`FR-AUTH-006`).

---

### 1.2 Question Bank Repository (`FR-QB-001..010`, `Rule 2`)

- **Question Table & Categorization** (`apps/admin-web/src/components/questions/QuestionTable.tsx`):
  - Repository table with difficulty chips (`Easy` = emerald, `Medium` = amber, `Hard` = rose), question type badges, topic badges, marks/negative marks, and archive status.
  - Interactive row actions: Edit Question and Archive/Restore Toggle (`FR-QB-009`).
- **Filter Controls** (`apps/admin-web/src/components/questions/QuestionFilters.tsx`):
  - Search by question text and topic keywords.
  - Topic dropdown, difficulty dropdown, and question type dropdown.
- **Dynamic Question Authoring Modal** (`apps/admin-web/src/components/questions/QuestionFormModal.tsx`):
  - Dynamic type switcher supporting:
    - `MCQ_SINGLE` (Single choice with radio button to mark correct answer)
    - `MCQ_MULTIPLE` (Multiple choice with checkboxes to select multiple correct answers)
    - `TRUE_FALSE` (True / False selector with correct answer radio)
    - `SHORT_ANSWER` (Exact keyword / short prompt grading)
    - `SCENARIO` (System design / case study grading)
    - `DESCRIPTIVE` (Long-form answer with evaluator rubric)
    - `CODING` & `SQL` (Placeholders with informational badge for Phase 5 code-runner execution)
  - Dynamic Options Editor: Add option (up to 8), remove option, re-indexing, option text validation, and automatic pruning of trailing empty options.
  - Protected evaluator solution notes (admin-only, never exposed to candidates per `Rule 2`).

---

### 1.3 4-Step Create Assessment Wizard & Catalog (`FR-ASMT-001..008`, `Decision 5`, `FR-CAN-004`)

- **4-Step Wizard Container** (`apps/admin-web/src/components/assessments/AssessmentWizard.tsx`):
  - **Step 1: Basic Details** (`FR-ASMT-001`, `FR-ASMT-004`): Assessment title, role category, duration in minutes, candidate instructions, and schedule window validation (`startAt < endAt`).
  - **Step 2: Select Questions** (`FR-ASMT-001`, `FR-ASMT-002`): Browse and search repository, toggle question inclusion, re-order sequence (Up / Down buttons), configure individual per-question timers (in seconds), and set marks override.
  - **Step 3: Settings & Anti-Cheat Rules** (`Decision 5`):
    - Negative marking toggle and custom penalty value (`FR-SCORE-002`).
    - Randomize question presentation order (`FR-ASMT-002`).
    - Randomize MCQ option choices (`FR-ASMT-002`).
    - Navigation mode selection: `SEQUENTIAL` (strict question-by-question flow) vs `FREE` (freely revisit questions).
    - Result visibility policy: `IMMEDIATE`, `SCHEDULED`, or `ADMIN_RELEASE` (`FR-ASMT-008`).
    - Passing score and attempt limit configuration (`FR-ASMT-007`).
  - **Step 4: Review & Publish** (`FR-ASMT-003`, `Decision 5`):
    - **Blocking client-side validation**: Asserts that $\sum \text{question timers} \le \text{overallDuration} \times 60$. Displays prominent blocking duration violation banner if exceeded.
    - Save as Draft button (`status: 'DRAFT'`).
    - Publish Assessment button with confirmation dialog explaining the immutable version snapshot freeze (`FR-ASMT-003`).
- **Assessments Catalog & Cohort Assignment** (`apps/admin-web/src/components/assessments/AssessmentsList.tsx`, `AssignAssessmentModal.tsx`):
  - Grid card catalog showing status chips (`DRAFT`, `SCHEDULED`, `ACTIVE`, `COMPLETED`, `SUSPENDED`, `ARCHIVED`), question count, duration, and assigned candidate count.
  - Cohort Assignment Modal (`FR-CAN-004`): Assign candidates individually or by entire recruitment drive cohort.

---

## 2. Endpoints, Screens, and Modules Added

### Screens / Views Added

- `CandidatesView.tsx`: Main candidate roster, filtering, pagination, drawer, and modals.
- `QuestionBankView.tsx`: Question repository table, multi-tier filters, and authoring modal.
- `AssessmentsView.tsx`: Assessments catalog with view switcher to the 4-step wizard.
- `AssessmentWizard.tsx`: 4-step wizard container (_1. Basic Details, 2. Select Questions, 3. Settings, 4. Review & Publish_).
- `AssignAssessmentModal.tsx`: Candidate and recruitment drive cohort assignment modal.

### API Clients Added (`apps/admin-web/src/api/`)

- `candidatesApi`: `getCandidates`, `getCandidateById`, `createCandidate`, `updateCandidate`, `setCandidateStatus`, `resetPassword`, `importCsv`, `assignAssessment`, `unassignAssessment`.
- `questionsApi`: `getQuestions`, `getQuestionById`, `createQuestion`, `updateQuestion`, `archiveQuestion`.
- `assessmentsApi`: `getAssessments`, `getAssessmentById`, `createAssessment`, `updateAssessment`, `mapQuestions`, `publishAssessment`, `setStatus`.

### MSW v3 Mock Handlers Added (`apps/admin-web/src/mocks/handlers.ts`)

- 18 mock endpoints covering Candidate CRUD, CSV import with per-row errors, Question Bank authoring and archiving, Assessment creation, question mapping, publishing, status updates, and cohort assignment.

---

## 3. SRS Requirement IDs Covered

| Requirement ID    | Description                                                                                          | Status   |
| :---------------- | :--------------------------------------------------------------------------------------------------- | :------- |
| **`FR-CAN-001`**  | Candidate record creation with complete profile fields and account status                            | **Done** |
| **`FR-CAN-002`**  | Profile modification and search/filter by candidate ID, name, email, institution, drive              | **Done** |
| **`FR-CAN-003`**  | Bulk candidate import via CSV with validated template and per-row error reporting                    | **Done** |
| **`FR-CAN-004`**  | Candidate assignment to assessments individually or by recruitment drive cohort                      | **Done** |
| **`FR-CAN-005`**  | Account deactivation and assignment removal with confirmation                                        | **Done** |
| **`FR-CAN-006`**  | Candidate login and activity history inspection in slide-out drawer (UTC ISO-8601)                   | **Done** |
| **`FR-CAN-007`**  | Enforcement of unique candidate IDs and usernames in UI/forms                                        | **Done** |
| **`FR-QB-001`**   | Question creation with text, type, category, difficulty, marks, and explanation                      | **Done** |
| **`FR-QB-002`**   | Question categorization by topic, skill, and difficulty                                              | **Done** |
| **`FR-QB-003`**   | Support for Single MCQ, Multi MCQ, True/False, Short Answer, Descriptive, Scenario                   | **Done** |
| **`FR-QB-004`**   | Option management with server-side protected correct answer storage                                  | **Done** |
| **`FR-QB-005`**   | Configurable question time limits in seconds                                                         | **Done** |
| **`FR-QB-006`**   | Rich-text / formatted code snippet preview in question statements                                    | **Done** |
| **`FR-QB-007`**   | Question search and filter by keyword, topic, difficulty, and type                                   | **Done** |
| **`FR-QB-008`**   | Question editing before assignment with immutability for active sessions                             | **Done** |
| **`FR-QB-009`**   | Question deactivation/archival preventing new usage without altering existing records                | **Done** |
| **`FR-ASMT-001`** | Assessment creation with title, role category, instructions, schedule, duration, attempt limit       | **Done** |
| **`FR-ASMT-002`** | Configuration of per-question limits, overall limits, marking rules, negative marking, randomization | **Done** |
| **`FR-ASMT-003`** | Versioned immutable snapshot freeze on publish                                                       | **Done** |
| **`FR-ASMT-004`** | Validation ensuring sum of question limits do not exceed overall duration                            | **Done** |
| **`FR-ASMT-005`** | Assessment status state machine (Draft, Scheduled, Active, Completed, Suspended, Archived)           | **Done** |
| **`FR-ASMT-006`** | Assessment scheduling with enforced start/end availability windows                                   | **Done** |
| **`FR-ASMT-007`** | Assessment attempt limit enforcement per candidate (default: 1)                                      | **Done** |
| **`FR-ASMT-008`** | Result visibility policy configuration (Immediate, Scheduled, Admin Release)                         | **Done** |
| **`FR-AUTH-005`** | Super Admin candidate password reset with temporary credential generation                            | **Done** |
| **`FR-AUTH-006`** | Account deactivation preventing new sessions and enforcing session revocation                        | **Done** |
| **`FR-AUTH-009`** | Secure temporary credential provisioning; credentials excluded from exports and logs                 | **Done** |
| **`NFR-USE-004`** | Confirmation dialogs for destructive or irreversible actions (deactivation, publish freeze)          | **Done** |

---

## 4. Tests Added

### Vitest Unit & Integration Suites (`apps/admin-web/src/tests/`)

1. **`Candidates.test.tsx` (7 tests)**:
   - `[FR-CAN-001]` renders candidate roster table with ID, status chips, and test assignments.
   - `[FR-CAN-001]` filters candidates by keyword search.
   - `[FR-CAN-002, FR-AUTH-005]` opens Add Candidate modal and creates candidate with temporary password.
   - `[FR-CAN-006]` opens candidate detail drawer displaying login history and assigned tests.
   - `[FR-CAN-005]` deactivates an active candidate account with confirmation.
   - `[FR-AUTH-005, FR-AUTH-009]` resets candidate password and presents copyable temporary password.
   - `[FR-CAN-003]` opens CSV import modal, downloads template, and handles import result error reporting.
2. **`QuestionBank.test.tsx` (4 tests)**:
   - `[FR-QB-001, FR-QB-004]` renders question table with difficulty chips, types, and marks.
   - `[FR-QB-004]` filters questions by topic and difficulty.
   - `[FR-QB-002, FR-QB-005]` authors new question with options editor and marks correct answer.
   - `[FR-QB-003]` toggles archive status on question.
3. **`AssessmentWizard.test.tsx` (5 tests)**:
   - `[FR-ASMT-001, FR-ASMT-006]` renders assessments catalog list with status chips and candidate counts.
   - `[FR-ASMT-001..004, Decision 5]` completes 4-step wizard and saves draft assessment.
   - `[Decision 5]` blocks publication and warns when per-question timers exceed overall duration.
   - `[FR-ASMT-003]` confirms immutable snapshot freeze and publishes assessment.
   - `[FR-CAN-004]` assigns candidate cohort to assessment from catalog view.

### Playwright E2E Smoke Tests (`apps/admin-web/e2e/smoke.spec.ts`)

- Updated smoke test suite navigating across Dashboard, Candidates, Question Bank, and Assessments tabs.

### Total Test Suite Results

- **8 test files, 30 tests passed (100% green)**
- Duration: 4.40s

---

## 5. What Is Still Mocked

- In development mode without a running backend, MSW v3 intercepts calls to `/api/v1/admin/candidates`, `/api/v1/admin/questions`, and `/api/v1/admin/assessments`.
- The real API client (`apps/admin-web/src/api/client.ts`) is fully connected to `VITE_API_BASE_URL` (defaulting to `http://localhost:4000/api/v1`).
- Coding sandbox compilation and execution tests for programming questions remain mocked/placeholders for Phase 5 (`services/code-runner`).

---

## 6. Open Questions & Alignment

- **None**: All endpoints and payloads conform exactly to Dev A's Phase 2 backend contracts in `packages/shared/openapi.yaml` and `docs/DECISIONS.md (Decision 5)`.

---

## 7. Instructions to Run and Validate

### Start Development Server

```bash
pnpm --filter @verisync/admin-web dev
```

Open [http://localhost:5173](http://localhost:5173). Log in using `admin@verisync.internal` / `Password123!` and MFA code `123456`. Navigate between **Dashboard**, **Candidates**, **Question Bank**, and **Assessments** via the navy sidebar.

### Run Quality Gates

```bash
# Typecheck
pnpm --filter @verisync/admin-web typecheck

# Lint
pnpm --filter @verisync/admin-web lint

# Prettier Style Check
pnpm exec prettier --check "apps/admin-web/**/*.{ts,tsx,js,json,css,html}"

# Unit & Integration Tests
pnpm --filter @verisync/admin-web test

# Production Bundle Build
pnpm --filter @verisync/admin-web build
```
