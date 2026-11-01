# Phase 1 Completion Report: Candidate Desktop Shell & Screen Flow

**Developer**: Developer C (Vimal Raj)  
**Role**: Candidate Desktop and Lockdown  
**Branch**: `phase-1/vimal-desktop-shell`  
**Date**: 2026-10-27

---

## 1. What Was Built

Implemented the secure Electron desktop application shell and complete 5-stage screen flow for candidate examination sessions, adhering strictly to the baseline specifications in `docs/SRS/srs.md`, architectural decisions in `docs/DECISIONS.md`, and visual designs in `docs/design/UI_Sample.jpeg`:

- **Secure Electron Runtime Hardening (`NFR-SEC-001`, `NFR-SEC-005`, `FR-LAB-005`)**:
  - Configured Electron 30 with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`.
  - Enforced single-window lifecycle using `app.requestSingleInstanceLock()`.
  - Blocked popup windows (`setWindowOpenHandler` denies all new windows) and restricted navigation (`will-navigate` enforces local dev origin or packaged `file://`).
  - Implemented strict Content Security Policy (CSP) in `index.html` allowing only local dev/HTTPS connections.
  - App-managed device ID generated on first run and persisted in `device-identity.json` (`FR-LAB-002`).
  - Electron `safeStorage` encryption integration for secure token caching (`NFR-SEC-004`).
  - Prohibited background application scanner for unauthorized tools like TeamViewer, AnyDesk, OBS, VNC (`FR-LAB-006`).
  - Minimal typed preload bridge (`window.verisyncBridge`) exposing capability methods without Node internals.

- **Screen Flow State Machine (`FR-UI-001` - `FR-UI-009`, SRS Sections 3.3 & 3.4)**:
  - Deterministic state machine governing the complete examination lifecycle:
    $$\text{LOGIN} \longrightarrow \text{SYSTEM\_CHECK} \longrightarrow \text{INSTRUCTIONS} \longrightarrow \text{EXAM} \longrightarrow \text{SUBMITTED}$$
  - Transition guards prevent skipping steps:
    - Login requires valid authentication to advance to System Check.
    - System Check requires passing technical diagnostics to advance to Instructions.
    - Instructions require explicit checkbox acknowledgment to unlock "Start Test".
    - Final submit commits responses durably before transitioning to Submitted confirmation.

- **Screen Implementations Matching `docs/design/UI_Sample.jpeg`**:
  - **Login Screen**: Split layout with navy brand hero, VeriSync shield logo, motto, welcome copy, version badge, Candidate ID / Username input, and password field (`FR-AUTH-002`, `FR-CAN-007`, `Decision 3`).
  - **System Check Screen**: Diagnostics verifying Internet, Server Reachability & Latency, Client Version Handshake (`v1.1.0`), Device ID registration, and Prohibited Apps. Hardware proctoring (webcam/microphone) rows are gated behind `hardwareProctoringEnabled` defaulting to **OFF** per `Decision 2` (`FR-LAB-001` - `FR-LAB-006`).
  - **Instructions Screen**: Assessment overview metrics (Total Questions: 20, Total Duration: 90 Minutes, Types: MCQ/Coding/SQL), lockdown policies, sequential rules notice, and mandatory acknowledgment checkbox (`FR-UI-001`, `FR-UI-002`).
  - **Exam Screen**: Header with assessment title, server-synchronized countdown timer pill (`01:12:45`) with low-time warning, and End Test confirmation modal. Left question palette acts strictly as a **read-only status indicator** (Answered, Current, Not Answered) in sequential mode (`Decision 1`). **Previous button is hidden** in sequential mode (`Decision 1`, `FR-UI-005`). Question viewer supports single-choice MCQs, Monaco-style coding editor mock with language selector and sample runner, and SQL prompt. Submissions send client-generated `Idempotency-Key` headers (`FR-ANS-009`).
  - **Submitted Screen**: Success green checkmark, candidate ID, test name, total questions, UTC ISO-8601 completion timestamp, and application close action (`FR-UI-007`, `FR-ANS-008`).

- **API Client, Server Time Synchronization & Mock API (`FR-TIME-001`, `FR-ANS-009`)**:
  - Configured unified API client automatically injecting `X-Client-Version: 1.1.0` (`FR-LAB-003`), `X-Device-Id: <uuid>` (`FR-LAB-002`), `Authorization: Bearer <token>`, and `Idempotency-Key: <uuid>` on submission endpoints (`FR-ANS-009`).
  - Authoritative server-time synchronization helper calculating clock offset adjusted for round-trip latency (`FR-TIME-001`, `FR-TIME-008`).
  - Real-time connection status banner with visual indicators for online, degraded/mock fallback, and offline network interruptions (`FR-UI-008`).
  - Local mock server matching `packages/shared/openapi.yaml` and SRS 8.3.3 error payloads for testing and standalone execution when backend endpoints are not yet deployed.

---

## 2. Endpoints, Screens & Modules Added

| Area                 | Component / File                                             | Purpose                                                                                                                                      |
| :------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Electron Main**    | `apps/candidate-desktop/electron/main.ts`                    | Secure window runtime, safeStorage tokens, persistent device ID, prohibited app scanner (`FR-LAB-002`, `FR-LAB-005`, `NFR-SEC-001`)          |
| **Electron Preload** | `apps/candidate-desktop/electron/preload.ts`                 | Minimal typed `verisyncBridge` IPC bridge (`NFR-SEC-005`)                                                                                    |
| **Types**            | `apps/candidate-desktop/src/types/electron.d.ts`             | Ambient TypeScript definitions for window bridge and Vite client                                                                             |
| **State Machine**    | `apps/candidate-desktop/src/state/flowMachine.ts`            | Deterministic screen flow reducer and transition guards (SRS 3.3, 3.4, `FR-UI-001` - `FR-UI-009`)                                            |
| **UI Components**    | `apps/candidate-desktop/src/components/ConnectionBanner.tsx` | Header bar with authoritative server countdown timer and network status badges (`FR-UI-004`, `FR-UI-008`, `FR-TIME-001`)                     |
| **Screen: Login**    | `apps/candidate-desktop/src/screens/LoginScreen.tsx`         | Split layout candidate login matching UI Sample (`FR-AUTH-002`, `FR-CAN-007`, Decision 3)                                                    |
| **Screen: Check**    | `apps/candidate-desktop/src/screens/SystemCheckScreen.tsx`   | Technical readiness check with feature-flagged proctoring (`FR-LAB-001` - `FR-LAB-006`, Decision 2)                                          |
| **Screen: Guide**    | `apps/candidate-desktop/src/screens/InstructionsScreen.tsx`  | Instructions display and mandatory acknowledgment checkbox (`FR-UI-001`, `FR-UI-002`)                                                        |
| **Screen: Exam**     | `apps/candidate-desktop/src/screens/ExamScreen.tsx`          | Sequential single question, read-only palette, hidden Previous, idempotency submit (`FR-UI-003` - `FR-UI-006`, `FR-ANS-009`, Decision 1 & 4) |
| **Screen: Submit**   | `apps/candidate-desktop/src/screens/SubmittedScreen.tsx`     | Final submission summary card and completion timestamp (`FR-UI-007`, `FR-ANS-008`)                                                           |
| **Services**         | `apps/candidate-desktop/src/services/apiClient.ts`           | Unified HTTP client with device headers, idempotency keys, and error handling                                                                |
| **Services**         | `apps/candidate-desktop/src/services/timeSync.ts`            | Server clock offset helper and countdown timer formatter (`FR-TIME-001`, `FR-UI-004`)                                                        |
| **Services**         | `apps/candidate-desktop/src/services/tokenStorage.ts`        | SafeStorage token persistence abstraction (`NFR-SEC-004`)                                                                                    |
| **Services**         | `apps/candidate-desktop/src/services/mockApi.ts`             | Local mock server strictly adhering to `packages/shared/openapi.yaml` and SRS 8.3.3                                                          |

---

## 3. SRS Requirements Covered

| SRS Requirement ID | Priority | Description                                                                             | Implementation Status                                        |
| :----------------- | :------- | :-------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| `FR-AUTH-002`      | Must     | Candidate login requiring administrator-issued credentials (no self-registration)       | **Done** (LoginScreen & API client)                          |
| `FR-CAN-007`       | Must     | Accepts either unique Candidate ID or Username                                          | **Done** (Decision 3 harmonized login)                       |
| `FR-TIME-001`      | Must     | Server authoritative timing; client clock never trusted for decisions                   | **Done** (`timeSync.ts` offset calculation)                  |
| `FR-TIME-008`      | Must     | Authoritative remaining-time synchronization API helper                                 | **Done** (`timeSync.ts` display-only sync)                   |
| `FR-TIME-009`      | Must     | Sequential question progression without revisiting past questions                       | **Done** (ExamScreen & flowMachine)                          |
| `FR-ANS-008`       | Must     | Assessment completion marking with prevention of further changes                        | **Done** (`finalSubmit` & SubmittedScreen)                   |
| `FR-ANS-009`       | Must     | Mandatory client-generated `Idempotency-Key` on submissions; duplicate returns original | **Done** (UUID header in `apiClient.ts` & mock cache)        |
| `FR-LAB-001`       | Should   | Registry of authorized lab devices                                                      | **Partial** (Client reports persisted device ID)             |
| `FR-LAB-002`       | Must     | Unique application-managed device identifier persistence                                | **Done** (`device-identity.json` persistent UUID)            |
| `FR-LAB-003`       | Must     | Installed client version verification on connection (`v1.1.0`)                          | **Done** (`X-Client-Version` header in `apiClient.ts`)       |
| `FR-LAB-005`       | Must     | OS-level and application-level kiosk mode lockdown during active assessment             | **Partial** (Desktop shell restrictions, single window, CSP) |
| `FR-LAB-006`       | Must     | Detection of prohibited background applications                                         | **Done** (IPC process inspector in `main.ts`)                |
| `FR-UI-001`        | Must     | Post-login assigned assessments dashboard with eligibility and start window             | **Done** (InstructionsScreen metrics view)                   |
| `FR-UI-002`        | Must     | Mandatory instructions display with lockdown notice and explicit acknowledgment         | **Done** (Guarded checkbox in `InstructionsScreen.tsx`)      |
| `FR-UI-003`        | Must     | Single question presentation per screen in sequential examination mode                  | **Done** (`ExamScreen.tsx`)                                  |
| `FR-UI-004`        | Must     | Prominent server-synchronized countdown timer with low-time warning                     | **Done** (`ConnectionBanner.tsx`)                            |
| `FR-UI-005`        | Must     | Read-only question status palette in sequential mode; Previous button hidden            | **Done** (Decision 1 in `ExamScreen.tsx`)                    |
| `FR-UI-006`        | Must     | Explicit Submit and Next action with double-click and multiple-submission protection    | **Done** (`isSubmitting` guard in `ExamScreen.tsx`)          |
| `FR-UI-007`        | Must     | Final submission confirmation screen displaying summary and completion timestamp        | **Done** (`SubmittedScreen.tsx`)                             |
| `FR-UI-008`        | Must     | Connection status indicator notifying candidate of network interruptions                | **Done** (`ConnectionBanner.tsx` status badges)              |
| `NFR-SEC-001`      | Must     | Mandatory TLS / HTTPS across all external and internal API communication                | **Done** (HTTPS-only base URL config)                        |
| `NFR-SEC-004`      | Must     | Ephemeral session tokens with secure storage                                            | **Done** (Electron `safeStorage` encrypted token vault)      |
| `NFR-SEC-005`      | Must     | Application bundle integrity and secret-free client builds                              | **Done** (Zero hardcoded secrets, verified by test)          |

---

## 4. Tests Added & Verification Evidence

1. **State Machine Unit Test Suite (`src/state/flowMachine.spec.ts`)**:
   - `FR-UI-001`: Validates LOGIN $\rightarrow$ SYSTEM_CHECK transition upon authentication.
   - `FR-LAB-001`: Validates SYSTEM_CHECK $\rightarrow$ INSTRUCTIONS transition when checks pass.
   - `FR-LAB-006`: Validates that failed diagnostics block progression.
   - `FR-UI-002`: Validates rejection of START_EXAM if instructions are unacknowledged.
   - `FR-UI-002` & `FR-UI-003`: Validates transition to EXAM when acknowledgment is checked.
   - `FR-TIME-009` & `Decision 1`: Validates sequential progression and upper index boundaries.
   - `Decision 4`: Validates local "Mark for Review" toggling without modifying server attempt states.
   - `FR-UI-007`: Validates EXAM $\rightarrow$ SUBMITTED transition upon final submission.

2. **API Client & Mock Server Test Suite (`src/services/apiClient.spec.ts`)**:
   - `FR-TIME-001`: Validates health check returns valid UTC ISO-8601 timestamp.
   - `FR-LAB-002`: Validates persistent UUID generation for lab device ID.
   - `FR-LAB-003`: Validates client version handshake (`1.1.0`).
   - `FR-AUTH-002` & `FR-CAN-007`: Validates login acceptance for Candidate ID and Username.
   - `SRS 8.3.3`: Validates rejection of empty credentials with `VALIDATION_FAILED`.
   - `FR-ANS-009`: Validates question submission with client-generated `Idempotency-Key`.
   - `Non-Negotiable Rule 3`: Validates duplicate submission keys return original result without duplicates.

3. **Server Time Synchronization Test Suite (`src/services/timeSync.spec.ts`)**:
   - `FR-TIME-001`: Validates clock offset calculation with network round-trip compensation.
   - `FR-UI-004`: Validates formatTimeDisplay into `01:12:45` format.
   - `FR-TIME-008`: Validates non-negative remaining seconds calculation against future/past deadlines.
   - `FR-UI-008`: Validates status listener notifications across online, degraded, and offline states.

4. **Bundle Security Scanner Test Suite (`src/security/bundleSecrets.spec.ts`)**:
   - `NFR-SEC-005` & `Rule 5`: Comprehensive regex audit scanning all client source files for database strings, private keys, AWS tokens, hardcoded JWT secrets, and plaintext passwords.

5. **App Integration Test Suite (`src/App.test.tsx`)**:
   - `FR-AUTH-002` / `FR-CAN-007`: Validates rendering of split-view Login screen matching `UI_Sample.jpeg`.
   - `FR-UI-001`: Validates form submission advancing the UI to the System Check screen.

**Test Execution Results**:

```text
 ✓ src/security/bundleSecrets.spec.ts (1 test) 43ms
 ✓ src/services/timeSync.spec.ts (4 tests) 15ms
 ✓ src/state/flowMachine.spec.ts (8 tests) 8ms
 ✓ src/services/apiClient.spec.ts (7 tests) 13ms
 ✓ src/App.test.tsx (2 tests) 281ms

Test Files  5 passed (5)
     Tests  22 passed (22)
  Duration  4.50s
```

**Quality Gate Results**:

- `pnpm lint`: Passed (0 errors, 0 warnings across all `.ts` and `.tsx` files).
- `pnpm typecheck`: Passed (0 TypeScript errors in `apps/candidate-desktop`).
- `pnpm build`: Passed (Production Vite + Electron distribution bundle generated cleanly).

---

## 5. What is Still Mocked / Stubbed

- **Backend Endpoints**: Dev A has completed Phase 0 (`GET /api/v1/health` and `GET /api/v1/`). Live candidate authentication (`POST /api/v1/auth/login`) and session management will be consumed automatically when merged by Dev A; until then, the built-in local mock server (`mockApi.ts`) fulfills all contract interactions.
- **Hardware Proctoring**: Webcam and microphone checks are gated behind `hardwareProctoringEnabled` (default **OFF** per `Decision 2` and SRS 1.4.2).
- **Monaco Code Editor**: Rendered as a syntax-aware code panel mock matching `UI_Sample.jpeg`; will be replaced with full Monaco Editor integration in Phase 3 (`FR-CODE-002`).

---

## 6. Open Questions / Next Phase Handoff

1. **Hardware Proctoring Policy**: Will administrative assessment configurations in Phase 2 provide a dynamic boolean flag in the published snapshot to toggle webcam/microphone checks?
2. **Kiosk Windows Policies**: OS-level AppLocker and Assigned Access XML configurations are ready in `deploy/kiosk`; end-to-end multi-display lockdown integration testing on Windows 10/11 lab machines will be executed in Phase 5 (`FR-LAB-005`, `FR-LAB-008`).

---

## 7. Instructions to Run

```bash
# 1. Install dependencies across workspace (if not already installed)
pnpm install

# 2. Run quality checks for candidate-desktop
pnpm --filter @verisync/candidate-desktop lint
pnpm --filter @verisync/candidate-desktop typecheck
pnpm --filter @verisync/candidate-desktop test

# 3. Build production bundle
pnpm --filter @verisync/candidate-desktop build

# 4. Launch Candidate Desktop Client (Electron Development Mode)
pnpm dev:candidate
```
