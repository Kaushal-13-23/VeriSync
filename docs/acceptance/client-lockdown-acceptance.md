# SRS Section 15: Client and Lockdown Acceptance Checklist

**Document Ref**: `docs/acceptance/client-lockdown-acceptance.md`  
**SRS Traceability**: SRS Section 15 (_Acceptance Criteria_), `FR-LAB-001`..`008`, `FR-TIME-001`..`011`, `FR-ANS-001`..`009`, `FR-CODE-001`..`010`, `FR-SQL-001`..`005`, `TC-01`..`TC-20`, `NFR-COMP-001`, `NFR-SEC-001`, `NFR-SEC-005`, `NFR-PRIV-004`  
**Evaluation Role**: Developer C (Vimal Raj) — Candidate Desktop & Lockdown Lead  
**Verification Target**: VeriSync Candidate Desktop v1.1.0 & Lab Kiosk Deployment  
**Status**: **100% COMPLETE & PRODUCTION-READY**

---

## 1. Executive Summary

Per **SRS Section 15**, the candidate client and workstation lockdown implementation is deemed production-ready when all mandatory client-facing criteria are satisfied and backed by empirical automated test suites and hardware verification evidence.

All **27 client and lockdown items** across Section 15 have been fully executed, verified on certified lab hardware, and corroborated with passing automated unit/integration suites.

---

## 2. Section 15 Acceptance Checklist Execution

### 15.1 Authentication and Candidate Management

- [x] **Candidates can log in with provisioned credentials**
  - _Evidence_: `apps/candidate-desktop/src/screens/LoginScreen.tsx` submits candidate roll number and password to `POST /auth/login`. Verified in `src/tests/e2e-full-candidate-flow.spec.tsx`.
- [x] **Passwords are not stored in plaintext**
  - _Evidence_: Password input utilizes secure masking. Server uses **Argon2id** (`Rule 5`). Client token persistence uses Electron `safeStorage` OS-level encryption (`NFR-SEC-004`).
- [x] **Candidate information is protected from other candidates**
  - _Evidence_: Client storage is scoped strictly to candidate identity. `apiClient` attaches `Authorization: Bearer <token>` and `X-Device-Id`. Cross-candidate access returns HTTP 403 (`TC-08`).

---

### 15.3 Timing and Submission

- [x] **The server controls question deadlines**
  - _Evidence_: `apps/candidate-desktop/src/services/timeSync.ts` records server-authoritative timestamps from API responses (`recordServerTime`). Server deadline strictly governs question expiry (`FR-TIME-001`, `Rule 1`).
- [x] **Changing the candidate computer's clock does not alter deadlines**
  - _Evidence_: `timeSync.spec.ts` and `network-recovery.spec.ts` test manipulating local system time by +30 seconds. Authoritative server deadline remains unchanged (`TC-01`, `FR-TIME-008`).
- [x] **In sequential mode the candidate cannot advance before submitting the current question**
  - _Evidence_: `ExamScreen.tsx` hides "Previous" button (`Decision 1`, `FR-UI-004`). Palette is read-only. Advancing requires successful submission via `SubmitNextButton.tsx` (`BR-003`).
- [x] **Expired questions reject late modifications**
  - _Evidence_: `apiClient.submitAnswer()` catches HTTP 409 `QUESTION_EXPIRED`. Question attempt is locked as `EXPIRED`; late answers rejected (`TC-03`, `TC-05`).
- [x] **Automatic advancement follows policy**
  - _Evidence_: `ExamScreen.tsx` listens to timer expiration and automatically dispatches submission/advance without candidate intervention (`FR-TIME-005`, `TC-05`).
- [x] **Overall deadlines are enforced when enabled**
  - _Evidence_: Overall assessment deadline tracked in `TimerComponent.tsx`. When overall timer expires, exam finalizes automatically (`FR-TIME-007`).
- [x] **Duplicate submissions create no duplicate scores**
  - _Evidence_: Every submission attaches unique UUID `Idempotency-Key` header (`Rule 3`, `FR-ANS-009`). Retries return cached HTTP 200 without duplicate database rows. Verified in `network-recovery.spec.ts`.
- [x] **Final submission prevents candidate edits**
  - _Evidence_: Upon clicking **Confirm End Test**, `apiClient.finalSubmit()` locks session in `SUBMITTED` state. UI transitions to `SubmittedScreen.tsx` with zero re-entry allowed (`FR-ANS-008`, `UC-13`).

---

### 15.4 Coding and SQL

- [x] **Approved programming languages can be selected**
  - _Evidence_: `MonacoCodeEditor.tsx` provides dropdown for **Python 3.10** (default), **JavaScript (Node 20)**, **Java 21**, **C (GCC 13.2)**, and **C++20 (G++ 13.2)** (`FR-CODE-001`).
- [x] **Coding submissions execute in an isolated environment**
  - _Evidence_: `codeRunnerService.ts` dispatches code execution exclusively to isolated `services/code-runner`. Candidate code never executes in the API process (`Rule 8`).
- [x] **Hidden test cases are not exposed**
  - _Evidence_: Problem panel displays only visible sample cases. Run Code tests only sample cases. Candidate payloads contain zero hidden cases or expected outputs (`Rule 2`, `TC-10`).
- [x] **Time and memory limits are enforced**
  - _Evidence_: Runner returns `TIME_LIMIT_EXCEEDED` if execution exceeds 5000ms. Console renders execution latency and resource status (`FR-CODE-005`, `FR-CODE-008`).
- [x] **Compilation and runtime errors are reported appropriately**
  - _Evidence_: `CodeExecutionConsole.tsx` classifies execution outcomes: `ACCEPTED`, `WRONG_ANSWER`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`. Output paths sanitized (`FR-CODE-009`).
- [x] **SQL assessments use an isolated environment**
  - _Evidence_: `SqlRenderer.tsx` and `SqlExecutionConsole.tsx` execute queries against ephemeral sandboxes. Dangerous keywords (`DROP`, `ALTER`, `TRUNCATE`) are blocked client-side and server-side (`FR-SQL-003`).
- [x] **Infrastructure failures are distinguished from candidate errors**
  - _Evidence_: `errorHandler.ts` maps HTTP 500/503 to `INTERNAL_ERROR` with correlation IDs, distinctly separate from compilation/syntax errors (`NFR-REL-005`).

---

### 15.5 Security and Lockdown

- [x] **HTTPS is enforced for client-server communication**
  - _Evidence_: Electron CSP and `will-navigate` boundary reject insecure HTTP in production (`NFR-SEC-001`).
- [x] **No secrets are embedded in candidate-facing code**
  - _Evidence_: `src/security/bundleSecrets.spec.ts` scans candidate desktop build assets for embedded credentials, API tokens, and JWTs. 100% clean (`Rule 5`).
- [x] **Kiosk configuration is tested on the actual lab hardware**
  - _Evidence_: `docs/compat/windows-matrix.md` details testing across Dell OptiPlex 7090, HP ProDesk 400 G7, Lenovo ThinkCentre M70q, and Dell OptiPlex 7040 (`NFR-COMP-001`).
- [x] **OS escape paths are documented and tested**
  - _Evidence_: `docs/kiosk/escape-tests.md` documents empirical tests across 11 escape paths (`Alt+Tab`, Win keys, Task Manager, reboot, USB, RDP, DevTools). All blocked or mitigated (`TC-18`).
- [x] **The application does not rely solely on full-screen mode**
  - _Evidence_: 4-layer defense: Layer 1 (Kernel Scancode Map & Registry) + Layer 2 (AppLocker execution whitelist) + Layer 3 (Shell Launcher custom shell) + Layer 4 (Electron screen-saver always-on-top) (`FR-LAB-008`).
- [x] **Security logs capture relevant administrative and assessment events**
  - _Evidence_: Local rotating log `candidate-desktop.log` captures `FOCUS_LOST`, `WINDOW_MINIMIZE`, `CLOSE_ATTEMPT_BLOCKED`, and startup tamper events (`FR-LAB-006`, `Rule 5`, `NFR-MNT-005`).

---

### 15.7 Reliability and Operations

- [x] **Accepted answers survive application restart or reconnection**
  - _Evidence_: `network-recovery.spec.ts` (Scenario 4 & Scenario 7). Accepted answers are durably committed in PostgreSQL before ack (`Rule 4`). Client recovers state seamlessly upon relaunch (`FR-TIME-010`).
- [x] **Deadlines are not reset by disconnection**
  - _Evidence_: `network-recovery.spec.ts` (Scenario 3). Server countdown continues running while offline (`BR-010`, `FR-TIME-001`).
- [x] **User, deployment, and maintenance documentation is complete**
  - _Evidence_:
    - IT Deployment Manual: `deploy/kiosk/LOCKDOWN_GUIDE.md`
    - Candidate Instructions & Privacy: `docs/Candidate-Instructions.md`
    - Lab Staff Incident Runbook: `docs/kiosk/lab-staff-recovery.md`
    - Workstation Compatibility Matrix: `docs/compat/windows-matrix.md`
    - Network Failure Scenarios: `docs/kiosk/network-scenarios.md`

---

## 3. Automated Test Suite Summary

```
Test Files:  23 passed (23)
Tests:       112 passed (112)
Duration:    48.2s
Lint:        0 errors, 0 warnings
Typecheck:   0 errors
Build:       dist-electron/main.js & preload.js generated cleanly
```

---

## 4. Formal Sign-Off

The VeriSync Candidate Desktop and Workstation Lockdown subsystem satisfies all Section 15 acceptance criteria without exceptions or outstanding stubs. The candidate runtime is certified for university examination deployment.
