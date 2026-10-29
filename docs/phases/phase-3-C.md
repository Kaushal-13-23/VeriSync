# Phase 3 Completion Report: Candidate Desktop Exam Experience, Timing, and Idempotent Submissions

**Developer**: Developer C (Vimal Raj)  
**Role**: Candidate Desktop and Lockdown  
**Branch**: `phase-3/C-sessions-timing-exam`  
**Date**: 2026-10-29  

---

## 1. What Was Built

Implemented the complete candidate examination experience in `apps/candidate-desktop`, adhering strictly to `docs/design/UI_Sample.jpeg` (Screen 4: Exam Interface, Screen 5: Submitted Screen), `docs/DECISIONS.md`, and all non-negotiable SRS requirements:

1. **Top Bar & Server-Synchronized Timing (`TimerComponent.tsx`, `ConnectionBanner.tsx`)**:
   - Assessment title presentation and candidate identifier display.
   - Authoritative countdown timer driven exclusively by server deadline (`FR-TIME-001`, `FR-TIME-003`, `FR-UI-004`).
   - Drift correction via `TimeSyncService` continuously recalculating remaining seconds against estimated server time (`TC-01`).
   - Prominent "End Test" danger button opening an explicit confirmation modal.

2. **Sequential Question Presentation & Read-Only Status Panel (`ExamScreen.tsx`, `QuestionStatusPanel.tsx`)**:
   - Question Presentation for all supported question formats (`FR-QB-003`, `FR-UI-003`):
     - Single Choice MCQ (`MCQ_SINGLE` / `single_choice`) via `SingleChoiceRenderer`.
     - Multiple Select MCQ (`MCQ_MULTIPLE` / `multiple_select`) via `MultipleSelectRenderer`.
     - True/False (`TRUE_FALSE` / `true_false`) via `TrueFalseRenderer`.
     - Short Answer (`SHORT_ANSWER` / `short_answer`) via `ShortAnswerRenderer`.
     - Technical Questions (`CODING` and `SQL`) with code editor area and sample case runner.
   - Read-Only Question Status Panel (`Decision 1`, `FR-UI-005`): In default sequential mode, the question palette functions strictly as an unclickable status monitor (`ANSWERED`, `CURRENT`, `NOT_ANSWERED`). Candidates cannot click numbers to jump arbitrarily.
   - Hidden Previous Button (`Decision 1`, `FR-UI-004`): The "Previous" navigation button is strictly hidden in sequential examination mode.
   - Local Mark for Review (`Decision 4`): Handled purely on the client as a local visual indicator. Does not alter server attempt state machine, does not submit answers, and does not pause/extend deadlines (`FR-ANS-005`).
   - Clear Response: Resets selected response for the active question locally.

3. **Submit and Next Action with Double-Click & Idempotency Protection (`SubmitNextButton.tsx`, `apiClient.ts`)**:
   - Mandatory Client-Generated `Idempotency-Key` (UUIDv4) sent on every answer submission (`Rule 3`, `FR-ANS-009`).
   - In-flight double-click protection (`FR-UI-006`): Submit button transitions to `in-flight` state (spinner, `aria-busy="true"`, disabled) to prevent concurrent duplicate submissions.
   - Authoritative acknowledgement display (`FR-ANS-006`, `Rule 4`): Displays success checkmark only upon server response receipt.
   - Retry on Lost Responses (`TC-04`, `Rule 3`): If network drops or a response is lost, the button switches to `retry` state while preserving the exact same `Idempotency-Key` in memory (`currentKeyRef`). Re-clicking resubmits with the identical key, returning the original accepted response without creating duplicate records.

4. **Authoritative Timeout Handling (`FR-TIME-004`, `FR-TIME-005`, `FR-UI-007`, `TC-05`)**:
   - Visual timeout alert notification toast rendered when question time expires or upon receiving HTTP 409 `QUESTION_EXPIRED`.
   - Automatic progression: Automatically advances to the server-provided next question attempt without blocking candidate progression (`FR-TIME-005`).
   - Overall Assessment Timeout: Automatically triggers final submission when overall assessment duration expires (`FR-TIME-007`).

5. **Reconnect and Authoritative Resumption (`FR-TIME-010`, `FR-ANS-007`, `TC-07`)**:
   - Connection recovery handler: Automatically fetches authoritative state via `GET /candidate/sessions/:id/status` and `GET /candidate/sessions/:id/current-question` on network return (`online` event) or mount.
   - Continuous Server Deadline Progression (`FR-TIME-010`): Server deadlines continue running during disconnection; client remaining time reflects elapsed time without resetting countdown timer.
   - Local unsubmitted drafts remain local drafts and are never treated as submitted (`FR-ANS-005`).
   - Manual "Sync" action in header allows candidates to re-synchronize status on demand.

6. **Final Assessment Submission & Submitted Successfully Screen (`SubmittedScreen.tsx`, `App.tsx`, `flowMachine.ts`)**:
   - End Test confirmation dialog preventing accidental early submission (`Decision 4`).
   - Submits via `POST /candidate/sessions/:id/final-submit`.
   - Screen 5 ("Submitted Successfully") faithfully matches `docs/design/UI_Sample.jpeg`:
     - Candidate ID
     - Test Name
     - Total Questions
     - Questions Answered count
     - Submitted On timestamp in UTC (`Rule 9`)
     - "Close Application" action securely invoking Electron kiosk exit bridge (`closeApp()`).

---

## 2. Endpoints, Screens, and Modules Added or Updated

### Screens & Components (`apps/candidate-desktop/src/`):
- `screens/ExamScreen.tsx`: Complete exam interface integrating timer, question area, read-only status panel, idempotent submit, timeout handling, reconnection sync, and final submit confirmation.
- `screens/SubmittedScreen.tsx`: Updated submission confirmation screen displaying candidate ID, assessment title, total questions, answered count, UTC submitted timestamp, and Close Application action.
- `state/flowMachine.ts`: Updated flow reducer to capture `FinalSubmitResponseDto` and transition between `EXAM` and `SUBMITTED`.
- `App.tsx`: Wired exam completion flow and metadata propagation to `SubmittedScreen`.

### Services & API Client (`apps/candidate-desktop/src/services/`):
- `services/apiClient.ts`:
  - `startSession(assessmentId)`: Calls `POST /candidate/assessments/:id/start` with client version and device ID.
  - `getCurrentQuestion(sessionId)`: Calls `GET /candidate/sessions/:id/current-question`.
  - `getSessionStatus(sessionId)`: Calls `GET /candidate/sessions/:id/status`.
  - `submitSessionAnswer(sessionId, dto, idempotencyKey)`: Calls `POST /candidate/sessions/:id/answers` with mandatory `Idempotency-Key`.
  - `saveDraft(sessionId, dto)`: Calls `PUT /candidate/sessions/:id/draft`.
  - `finalSubmitSession(sessionId)`: Calls `POST /candidate/sessions/:id/final-submit`.
  - `sendHeartbeat(sessionId)`: Calls `POST /candidate/sessions/:id/heartbeat`.
- `services/mockApi.ts`: Expanded local mock engine to support all Phase 3 OpenAPI types, idempotency caching, deadline expirations, and status transitions for seamless offline and unit testing.

---

## 3. SRS Requirement Traceability

| Requirement ID | Description | Implementation Details |
| :--- | :--- | :--- |
| `FR-TIME-001` | Authoritative backend timing | Client clocks are untrusted; timer uses drift compensation against server deadline |
| `FR-TIME-003` | Authoritative question deadline | Capped by overall assessment deadline; synchronized via API |
| `FR-TIME-004` | Rejection of late answers | HTTP 409 `QUESTION_EXPIRED` handled gracefully with timeout notice |
| `FR-TIME-005` | Automatic question finalization | Auto-advances to next question upon timeout |
| `FR-TIME-007` | Overall deadline precedence | Overall deadline expiration triggers automatic final submission |
| `FR-TIME-008` | Authoritative remaining-time sync | `getSessionStatus` synchronizes clock offset, overall time, and active question |
| `FR-TIME-009` | Sequential question progression | Previous questions cannot be revisited once submitted |
| `FR-TIME-010` | Continuous deadline progression | Deadlines continue running during candidate disconnection; no timer resets |
| `FR-ANS-001` | Active question attempt acceptance | Submissions accepted only for current attempt sequence |
| `FR-ANS-003` | Durable database persistence | Server commits before acknowledgement; client requires ack to confirm |
| `FR-ANS-005` | Local draft autosave | Drafts saved without altering attempt state machine or extending deadlines |
| `FR-ANS-006` | Server acknowledgement display | Green success checkmark shown only upon server response receipt |
| `FR-ANS-007` | Safe connection recovery | Active attempt recovered without duplicating accepted submissions |
| `FR-ANS-008` | Assessment completion marking | Session locked upon final submission; further modifications prevented |
| `FR-ANS-009` | Client Idempotency-Key | Mandatory UUID header on every submission; repeats return original ack |
| `FR-UI-003` | Sequential single question view | One question rendered per screen in sequential examination mode |
| `FR-UI-004` | Countdown timer with warnings | Synchronized countdown timer with yellow warning (< 5m) and red critical (< 1m) |
| `FR-UI-005` | Read-only question palette | Palette numbers are unclickable in sequential mode; Previous button hidden |
| `FR-UI-006` | Double-click protection | In-flight state disables submit button and displays loading spinner |
| `FR-UI-007` | Visual timeout notice | Alert toast displayed when question expires with auto-transition |
| `FR-UI-008` | Connection status indicator | Connection banner displays live connectivity status and sync button |
| `FR-UI-009` | Final submission summary | Submitted screen displays candidate ID, test title, total questions, timestamp |
| `FR-QB-003` | Question formats support | Renderers for MCQ Single, MCQ Multiple, True/False, Short Answer, Coding, SQL |
| `Rule 1` | Server authority | Display is visual aid only; server alone decides acceptance |
| `Rule 2` | Zero answer key leakage | Candidate desktop representations exclude all correct answers and hidden cases |
| `Rule 3` | Idempotent submissions | Persistent `Idempotency-Key` preserved across retries |
| `Rule 4` | Durable persistence | Acknowledged submissions committed before ack |
| `Rule 9` | Standardized UTC timestamps | ISO-8601 UTC timestamps across all API payloads and screens |

---

## 4. Tests Added & Verification Evidence

Added comprehensive test suites in `apps/candidate-desktop/src/tests/e2e-phase3.spec.tsx` and updated `apps/candidate-desktop/src/services/apiClient.spec.ts`:

### 1. TC-04 (Idempotency & Retries):
- Validated that duplicate answer submission with identical `Idempotency-Key` returns original acceptance without duplicate records.
- Validated that `SubmitNextButton` enters in-flight state and disables double clicks.
- Validated that `Idempotency-Key` is preserved in memory and reused when retrying lost responses.

### 2. TC-05 (Question Expiry & Auto-advance):
- Validated that submitting after question deadline is rejected by API with HTTP 409 `QUESTION_EXPIRED`.
- Validated that `ExamScreen` catches `QUESTION_EXPIRED`, displays visual timeout alert, and automatically advances to next question.

### 3. TC-07 (Session Recovery After Disconnection):
- Validated that disconnected session resumes in `ACTIVE` state upon reconnection.
- Validated that server deadline continues progressing during disconnection (no timer reset or pause).
- Validated that answered questions remain marked `ANSWERED` in the read-only palette.
- Validated that candidate can resume and submit active question with a fresh idempotency key.

### 4. Final Submission Flow:
- Validated End Test confirmation dialog, final submission commit, and transition to `SubmittedScreen`.
- Validated that `SubmittedScreen` renders candidate ID, assessment title, total questions, answered count, and Close Application action.

### Automated Test Suite Execution:

```bash
$ pnpm --filter @verisync/candidate-desktop test

 ✓ src/state/flowMachine.spec.ts (10 tests)
 ✓ src/services/apiClient.spec.ts (15 tests)
 ✓ src/components/exam/QuestionStatusPanel.spec.tsx (4 tests)
 ✓ src/components/exam/TimerComponent.spec.tsx (5 tests)
 ✓ src/components/exam/renderers/renderers.spec.tsx (10 tests)
 ✓ src/App.test.tsx (3 tests)
 ✓ src/security/bundleSecrets.spec.ts (1 test)
 ✓ src/tests/e2e-phase3.spec.tsx (7 tests)
 ✓ src/services/timeSync.spec.ts (4 tests)
 ✓ src/services/errorHandler.spec.ts (4 tests)
 ✓ src/services/logger.spec.ts (3 tests)
 ✓ src/components/exam/SubmitNextButton.spec.tsx (4 tests)

 Test Files  12 passed (12)
      Tests  70 passed (70)
   Duration  15.30s
```

### Typecheck & Lint Verification:

```bash
$ pnpm --filter @verisync/candidate-desktop typecheck
$ tsc --noEmit
# Exit status: 0 (No TypeScript errors)

$ pnpm --filter @verisync/candidate-desktop lint
$ eslint "src/**/*.{ts,tsx}" "electron/**/*.ts"
# Exit status: 0 (0 errors, 0 warnings)

$ pnpm --filter @verisync/candidate-desktop build
# Vite production build: dist/ and dist-electron/ generated cleanly
```

---

## 5. What Is Still Mocked

- **Coding Sandbox Execution (`services/code-runner`)**: Monaco code editor and code execution are simulated in candidate-desktop; real Docker/gVisor runner is owned by Dev B.
- **Evaluation Queue (`FR-SCORE`)**: Automated objective scoring and evaluator queue will process completed attempts in Phase 4.

---

## 6. Open Questions

- None. All SRS requirements, state machine transitions, and timing constraints are fully specified and verified.

---

## 7. Instructions to Run

```bash
# 1. Install dependencies
pnpm install

# 2. Run quality checks on candidate desktop
pnpm --filter @verisync/candidate-desktop lint
pnpm --filter @verisync/candidate-desktop typecheck
pnpm --filter @verisync/candidate-desktop test
pnpm --filter @verisync/candidate-desktop build

# 3. Launch candidate desktop application in development mode
pnpm --filter @verisync/candidate-desktop dev
```
