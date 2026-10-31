# Phase 2 Completion Report: Candidate Desktop Exam Components & Assigned Assessments

**Developer**: Developer C (Vimal Raj)  
**Role**: Candidate Desktop and Lockdown  
**Branch**: `phase-2/C-exam-components`  
**Date**: 2026-10-29

---

## 1. What Was Built

Extended `apps/candidate-desktop` with production-ready reusable exam components, real system check handshake, assigned assessments portal, instructions screen matching `UI_Sample.jpeg`, central error handling for all 10 SRS 8.3.3 error codes, and local rotating log files with zero secret disclosure:

1. **Assigned Assessments Screen (`FR-UI-001`, `UC-08`, `BR-002`, `BR-007`, `TC09`)**:
   - `AssignedAssessmentsScreen.tsx`: Displays candidate's assigned assessments with role category, overall duration, total marks, start/end availability window, attempt limit, and attempts remaining.
   - Authoritative eligibility computation and badges (`isEligible`: true/false with reasons: "Window closed", "Window not open yet", "Max attempts exhausted").
   - Integrated with real backend `GET /candidate/assessments` endpoint via `apiClient.getAssignedAssessments()`, with graceful offline mock fallback.
   - Guaranteed TC09 compliance: candidate APIs and desktop UI never return or expose answer keys, options correct flags, or hidden test cases.

2. **Instructions Screen per UI Sample (`FR-UI-002`, `BR-015`, Screen 3)**:
   - `InstructionsScreen.tsx`: Summary rows for Total Questions, Total Duration, and Question Types.
   - Comprehensive rules list (prohibiting application switching, unauthorized background tools, external devices).
   - Mandatory `BR-015` and `FR-UI-002` monitoring and lockdown policy text informing candidates of audit tracking.
   - Mandatory acknowledgment checkbox unlocking "Start Test" action.
   - "Start Test" button calling `apiClient.startAssessment()` with in-flight loading state.

3. **Real System Check Logic & HTTP 426 Handling (`FR-LAB-001` - `FR-LAB-006`, `FR-LAB-003`, `SRS 8.3.3`)**:
   - `SystemCheckScreen.tsx`: Real connectivity check, server version handshake with `X-Client-Version: 1.1.0`.
   - Intercepts HTTP 426 / `UNSUPPORTED_CLIENT` and renders a prominent, red callout instructing the candidate to contact lab staff immediately.
   - Verifies persistent application-managed device ID (`FR-LAB-002`) and scans for prohibited background processes (`FR-LAB-006`).
   - Diagnostic re-check trigger for network / application recovery.

4. **Reusable Exam Components (`FR-QB-003`, `FR-TIME-001`..`008`, `FR-UI-004`..`006`, `FR-ANS-009`, `Decision 1`)**:
   - `SingleChoiceRenderer.tsx`: Single-choice MCQ with option letters (A, B, C, D) and radio accessibility.
   - `MultipleSelectRenderer.tsx`: Multi-select MCQ with checkboxes and selection array.
   - `TrueFalseRenderer.tsx`: True / False selection cards with distinct active and hover states.
   - `ShortAnswerRenderer.tsx`: Text input with character count and length clamping.
   - `TimerComponent.tsx`: Server-driven countdown timer with clock drift correction. Enforces **TC-01 logic**: display never decides acceptance; changing local computer clock does not alter the server deadline.
   - `QuestionStatusPanel.tsx`: Read-only question status palette in sequential mode (`Decision 1`, `FR-UI-005`).
   - `SubmitNextButton.tsx`: Double-click protection with `idle`, `in-flight`, `retry` (preserving `Idempotency-Key` per Rule 3 & `FR-ANS-009`), and `success` states.

5. **Central Error Handler & Local Rotating Log File (`SRS 8.3.3`, `FR-AUD-007`, `NFR-MNT-005`, `Rule 5`, `Rule 9`)**:
   - `errorHandler.ts`: Comprehensive error mapping for all 10 error codes (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_ELIGIBLE`, `INVALID_STATE`, `QUESTION_EXPIRED`, `DUPLICATE_REQUEST`, `UNSUPPORTED_CLIENT`, `RATE_LIMITED`, `VALIDATION_FAILED`, `INTERNAL_ERROR`).
   - `logger.ts` and `electron/main.ts`: Structured JSON logging to rotating file (`candidate-desktop.log` with max 2MB size and 3 file backups) in `userData/logs/`.
   - Strict sensitive data scrubber stripping passwords, bearer tokens, JWTs, and secrets.

---

## 2. Endpoints, Screens & Modules Added

| Component / Module              | Path                                                       | Purpose                                                                                   |
| :------------------------------ | :--------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| **Assigned Assessments Screen** | `src/screens/AssignedAssessmentsScreen.tsx`                | Eligibility, availability windows, attempts remaining, status (`FR-UI-001`)               |
| **Instructions Screen**         | `src/screens/InstructionsScreen.tsx`                       | Summary metrics, rules, BR-015 policy, mandatory acknowledgment (`FR-UI-002`)             |
| **System Check Screen**         | `src/screens/SystemCheckScreen.tsx`                        | Handshake, 426 UNSUPPORTED_CLIENT handling, prohibited app scanner (`FR-LAB-003`)         |
| **Exam Screen**                 | `src/screens/ExamScreen.tsx`                               | Integrated exam interface with question renderers, timer, palette, and retry button       |
| **Single Choice Renderer**      | `src/components/exam/renderers/SingleChoiceRenderer.tsx`   | Single MCQ option selection with radio accessibility (`FR-QB-003`)                        |
| **Multiple Select Renderer**    | `src/components/exam/renderers/MultipleSelectRenderer.tsx` | Multi MCQ option selection with checkboxes (`FR-QB-003`)                                  |
| **True/False Renderer**         | `src/components/exam/renderers/TrueFalseRenderer.tsx`      | True/False cards with distinct states (`FR-QB-003`)                                       |
| **Short Answer Renderer**       | `src/components/exam/renderers/ShortAnswerRenderer.tsx`    | Text answer with character counter (`FR-QB-003`)                                          |
| **Timer Component**             | `src/components/exam/TimerComponent.tsx`                   | Server deadline, drift correction, TC-01 display never decides acceptance (`FR-TIME-001`) |
| **Question Status Panel**       | `src/components/exam/QuestionStatusPanel.tsx`              | Read-only palette in sequential mode (`Decision 1`, `FR-UI-005`)                          |
| **Submit & Next Button**        | `src/components/exam/SubmitNextButton.tsx`                 | In-flight spinner & retry with preserved Idempotency-Key (`FR-UI-006`, `Rule 3`)          |
| **Central Error Handler**       | `src/services/errorHandler.ts`                             | Complete mapping for all 10 SRS 8.3.3 error codes with correlation IDs                    |
| **Structured Local Logger**     | `src/services/logger.ts` & `electron/main.ts`              | Rotating log files with automated secret scrubber (`Rule 5`, `FR-AUD-007`)                |
| **API Client Extensions**       | `src/services/apiClient.ts`                                | `getAssignedAssessments()`, `checkServerHandshake()`, `startAssessment()`                 |

---

## 3. SRS Requirements Covered

| SRS Requirement ID      | Priority | Description                                                                            | Implementation Status                                                               |
| :---------------------- | :------- | :------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `FR-UI-001`             | Must     | Post-login assigned assessments dashboard with eligibility and start window            | **Done** (`AssignedAssessmentsScreen.tsx` & real endpoint)                          |
| `FR-UI-002`             | Must     | Mandatory instructions display with lockdown notice and explicit acknowledgment        | **Done** (Guarded checkbox and BR-015 policy in `InstructionsScreen.tsx`)           |
| `FR-UI-003`             | Must     | Single question presentation per screen in sequential examination mode                 | **Done** (`ExamScreen.tsx` with renderers)                                          |
| `FR-UI-004`             | Must     | Prominent server-synchronized countdown timer with low-time warning                    | **Done** (`TimerComponent.tsx` with amber/red thresholds)                           |
| `FR-UI-005`             | Must     | Read-only question status palette in sequential mode; Previous button hidden           | **Done** (`QuestionStatusPanel.tsx` and `ExamScreen.tsx` per Decision 1)            |
| `FR-UI-006`             | Must     | Explicit Submit and Next action with double-click protection and retry states          | **Done** (`SubmitNextButton.tsx` with in-flight/retry states)                       |
| `FR-TIME-001`           | Must     | Server authoritative timing; client clock never trusted for decisions                  | **Done** (`TimerComponent.tsx` drift correction & TC-01 logic)                      |
| `FR-TIME-008`           | Must     | Authoritative remaining-time synchronization API helper                                | **Done** (`timeSync.ts` clock offset compensation)                                  |
| `FR-TIME-009`           | Must     | Sequential question progression without revisiting past questions                      | **Done** (`flowMachine.ts` and `ExamScreen.tsx`)                                    |
| `FR-QB-003`             | Must     | Support for question formats: Single MCQ, Multi MCQ, True/False, Short Answer          | **Done** (Modular question renderer components)                                     |
| `FR-LAB-002`            | Must     | Unique application-managed device identifier persistence                               | **Done** (`device-identity.json` persistent UUID via bridge)                        |
| `FR-LAB-003`            | Must     | Installed client version verification; rejection of outdated versions with HTTP 426    | **Done** (`X-Client-Version: 1.1.0` & 426 handling in `SystemCheckScreen.tsx`)      |
| `FR-LAB-006`            | Must     | Detection and reporting of prohibited background applications                          | **Done** (IPC process inspector in `main.ts` & `SystemCheckScreen.tsx`)             |
| `BR-015`                | Must     | Candidates informed about monitoring, lockdown, and integrity policies before starting | **Done** (Explicit policy banner in `InstructionsScreen.tsx`)                       |
| `SRS 8.3.3`             | Must     | Standard Error Codes handling with correlation IDs                                     | **Done** (`errorHandler.ts` mapping all 10 error codes)                             |
| `NFR-MNT-005`           | Must     | Structured logging with correlation IDs and zero sensitive data                        | **Done** (`logger.ts` & rotating `candidate-desktop.log` in Electron)               |
| `NFR-SEC-005`           | Must     | Application bundle integrity and secret-free client builds                             | **Done** (Verified by bundle security audit test)                                   |
| `Rule 3` / `FR-ANS-009` | Must     | Mandatory client-generated Idempotency-Key on submissions; duplicate returns original  | **Done** (Preserved across retry states in `SubmitNextButton.tsx` & `apiClient.ts`) |

---

## 4. Tests Added & Verification Evidence

All 57 automated tests pass cleanly across 11 test suites:

1. **Question Renderers Test Suite (`src/components/exam/renderers/renderers.spec.tsx`)**:
   - `SingleChoiceRenderer`: Renders A, B, C options with radio roles, calls `onChange`, respects `disabled`.
   - `MultipleSelectRenderer`: Renders checkboxes, toggles items into and out of selection array, respects `disabled`.
   - `TrueFalseRenderer`: Renders TRUE and FALSE cards, calls `onChange` with `'true'` or `'false'`.
   - `ShortAnswerRenderer`: Renders textarea with character counter (`X / 500`), handles text input, respects `maxLength`.

2. **Server-Driven Timer Component Test Suite (`src/components/exam/TimerComponent.spec.tsx`)**:
   - Computes remaining seconds accurately from server deadline and clock offset.
   - **TC-01 Clock Manipulation**: Verifies altering the candidate computer's local clock does NOT change the authoritative server deadline calculation.
   - **TC-01 Logic**: Verifies display is strictly visual aid and never decides acceptance (past deadlines compute to 0 remaining).
   - Formats mm:ss and hh:mm:ss displays properly.
   - Fires `onExpire` callback when server deadline is reached.

3. **Question Status Panel Test Suite (`src/components/exam/QuestionStatusPanel.spec.tsx`)**:
   - Renders section headers (MCQ, Coding, SQL) and question numbers.
   - Enforces read-only behavior in sequential mode (items are disabled from arbitrary navigation per `Decision 1` & `FR-UI-005`).
   - Allows free navigation when sequential mode is explicitly disabled.
   - Renders status legend tokens (Answered, Current, Not Answered, Mark for Review).

4. **Submit & Next Button Test Suite (`src/components/exam/SubmitNextButton.spec.tsx`)**:
   - Renders idle state with "Submit & Next" text and triggers submit.
   - Renders "Submit Assessment" on the last question.
   - Prevents multiple clicks when in-flight (double-click protection per `FR-UI-006`).
   - Renders retry state upon network/server interruption and preserves `Idempotency-Key`.

5. **Central Error Handler Test Suite (`src/services/errorHandler.spec.ts`)**:
   - Validates that all 10 SRS 8.3.3 error codes are mapped with user-friendly messages and correlation IDs.
   - Handles `UNSUPPORTED_CLIENT` (426) with explicit "contact lab staff" instruction.
   - Handles `QUESTION_EXPIRED` (409) with auto-transition notice.
   - Falls back gracefully to `INTERNAL_ERROR` (500) on generic errors.

6. **Local Logger & Redaction Test Suite (`src/services/logger.spec.ts`)**:
   - Redacts password, token, and secret fields in strings.
   - Redacts `Authorization: Bearer <token>` headers.
   - Recursively scrubs sensitive object keys (`password`, `token`, `secret`, `auth`, `credential`).

7. **API Client & TC09 Test Suite (`src/services/apiClient.spec.ts`)**:
   - Validates `getAssignedAssessments()` returns assessment list.
   - **TC09 Verification**: Validates response contains zero answer keys, correct answer flags, or hidden test cases.
   - Validates client version handshake with `checkServerHandshake()`.
   - Validates idempotent submission cache and duplicate request handling.

8. **State Machine Test Suite (`src/state/flowMachine.spec.ts`)**:
   - Validates `LOGIN -> SYSTEM_CHECK -> ASSIGNED_ASSESSMENTS -> INSTRUCTIONS -> EXAM -> SUBMITTED`.
   - Validates `SELECT_ASSESSMENT` and `BACK_TO_ASSESSMENTS` transitions.

9. **Desktop Integration Test Suite (`src/App.test.tsx`)**:
   - Validates candidate login advances to System Check.
   - Validates System Check advances to Assigned Assessments.

10. **Bundle Security Audit Test Suite (`src/security/bundleSecrets.spec.ts`)**:
    - Scans all client source files for hardcoded secrets, database strings, private keys, and passwords.

**Test Execution Results**:

```text
 ✓ src/services/timeSync.spec.ts  (4 tests) 22ms
 ✓ src/state/flowMachine.spec.ts  (10 tests) 13ms
 ✓ src/services/apiClient.spec.ts  (9 tests) 39ms
 ✓ src/components/exam/QuestionStatusPanel.spec.tsx  (4 tests) 303ms
 ✓ src/components/exam/TimerComponent.spec.tsx  (5 tests) 226ms
 ✓ src/components/exam/renderers/renderers.spec.tsx  (10 tests) 571ms
 ✓ src/App.test.tsx  (3 tests) 1211ms
 ✓ src/security/bundleSecrets.spec.ts  (1 test) 38ms
 ✓ src/services/errorHandler.spec.ts  (4 tests) 13ms
 ✓ src/services/logger.spec.ts  (3 tests) 6ms
 ✓ src/components/exam/SubmitNextButton.spec.tsx  (4 tests) 283ms

 Test Files  11 passed (11)
      Tests  57 passed (57)
   Duration  14.71s
```

**Quality Gate Results**:

- `pnpm --filter @verisync/candidate-desktop lint`: Passed (0 errors, 0 warnings).
- `pnpm --filter @verisync/candidate-desktop typecheck`: Passed (0 TypeScript errors).
- `pnpm --filter @verisync/candidate-desktop build`: Passed (Production Vite + Electron distribution bundle generated cleanly).

---

## 5. What is Still Mocked / Stubbed

1. **Monaco Code Editor**: Rendered as syntax-highlighted code editor panel with run sample cases mock; full Monaco editor integration is scheduled for Phase 3 (`FR-CODE-002`).
2. **Hardware Proctoring**: Webcam and microphone checks remain feature-flagged (default **OFF** per `Decision 2` and SRS 1.4.2).
3. **OS-Level Multi-Display Kiosk Lockdown**: Desktop shell restrictions, single window instance, and CSP are active; Windows Assigned Access / AppLocker OS configuration scripts are ready in `deploy/kiosk` for physical lab machine validation in Phase 5 (`FR-LAB-005`, `FR-LAB-008`).

---

## 6. Open Questions / Next Phase Handoff

1. **Live Session State Reconnect (Phase 3)**: When a candidate reconnects after an unexpected network or terminal reboot during an active assessment, does the backend `POST /candidate/assessments/{id}/start` return the current active question attempt with its remaining deadline? (Client is prepared to resume the session).
2. **Monaco Language Runtimes (Phase 3)**: Will the candidate desktop bundle local Web Workers for Monaco editor language support (Python, Java, C++, JS) or load them statically from assets?

---

## 7. Instructions to Run

```bash
# 1. Install dependencies across monorepo
pnpm install

# 2. Run quality gates for candidate-desktop
pnpm --filter @verisync/candidate-desktop lint
pnpm --filter @verisync/candidate-desktop typecheck
pnpm --filter @verisync/candidate-desktop test

# 3. Build candidate desktop production bundle
pnpm --filter @verisync/candidate-desktop build

# 4. Launch Electron candidate desktop in development mode
pnpm dev:candidate
```
