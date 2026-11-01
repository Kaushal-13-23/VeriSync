# VeriSync Architectural & Design Decisions

This document records architectural, functional, and design decisions, specifically resolving any discrepancies between the primary source of truth (`docs/SRS/srs.md`) and the interface reference (`docs/design/UI_Sample.jpeg`).

> **Rule of Precedence**: If a conflict arises between `docs/design/UI_Sample.jpeg` and `docs/SRS/srs.md`, the **SRS always wins**. All reconciliations are documented below.

---

## Pre-Filled Design Decisions: UI Sample vs. SRS Reconciliations

### Decision 1: Question Palette and "Previous" Navigation in Exam Interface

- **Context & Conflict**: The UI Sample (`UI_Sample.jpeg`, Exam Interface) illustrates a free-navigation question palette allowing candidates to jump between arbitrary questions, alongside an active "Previous" button. Conversely, SRS `FR-UI-004`, `FR-UI-005`, and `BR-003` mandate strict sequential navigation by default, preventing revisiting of submitted or timed-out questions.
- **Decision (SRS Wins)**:
  - In default **sequential mode**, the question palette functions strictly as a **read-only status indicator** (Answered, Current, Not Answered). Candidates cannot click palette numbers to switch questions.
  - The **"Previous" button is hidden** entirely in sequential mode.
  - Non-linear free navigation is supported only if the assessment configuration explicitly sets `navigationMode: 'free'`.
- **Traceability**: `FR-UI-004`, `FR-UI-005`, `BR-003`, `FR-ASMT-002`.

---

### Decision 2: Webcam, Microphone, and Screen Recording Proctoring Controls

- **Context & Conflict**: The UI Sample depicts active webcam and microphone monitoring badges, hardware checks in System Check, and a "Monitored Session" banner implying live video/audio proctoring. However, SRS Section 1.4.2 explicitly declares live video surveillance, facial recognition, biometrics, and AI-based behavioral proctoring as **out of scope** for the initial release.
- **Decision (SRS Wins)**:
  - The System Check workflow is centered strictly on technical readiness: network stability/reachability, server latency, client version handshake, lab device registration, and prohibited background process detection (`FR-LAB-001` through `FR-LAB-006`).
  - Webcam and microphone verification elements are gated behind an administrative feature flag (`features.hardwareProctoringCheck`) with the default set to **OFF**.
  - No continuous video/audio streaming or biometric algorithms are active in the core platform.
- **Traceability**: SRS Section 1.4.2, `FR-UI-002`, `FR-LAB-001` to `FR-LAB-006`.

---

### Decision 3: Candidate Login Identifier (Candidate ID vs. Username)

- **Context & Conflict**: The UI Sample shows a single input field titled "Candidate ID" on the candidate sign-in screen, whereas the backend identity specification (`FR-CAN-007`, `FR-AUTH-002`) defines unique candidate usernames alongside candidate IDs.
- **Decision (Harmonized)**:
  - The candidate authentication API and login interface accept **either** the system-assigned `Candidate ID` (e.g., `CAN-2026-081`) or the alphanumeric `Username`.
  - Both identifiers are unique per candidate profile and resolve cleanly to the underlying user record.
- **Traceability**: `FR-CAN-007`, `FR-AUTH-002`, `FR-AUTH-009`.

---

### Decision 4: "Mark for Review" Status and Test Termination Flow

- **Context & Conflict**: The UI Sample includes a "Mark for Review" action and an "End Test" button. SRS specifies that all assessment timing, answer commits, and session state transitions are solely governed by the server.
- **Decision (SRS Wins / Harmonized)**:
  - **"Mark for Review"** is treated as a local, client-side visual aid only. It is never transmitted as a submission to the server, does not alter the server's question attempt state machine, and does not extend deadlines (`FR-ANS-005`).
  - **"End Test"** triggers an explicit confirmation dialog informing the candidate that unanswered questions will be auto-finalized. Upon confirmation, it initiates the authoritative final submission request (`UC-09`, `UC-10`) to the server.
- **Traceability**: `FR-ANS-005`, `FR-TIME-007`, `FR-UI-007`, `BR-004`.

---

### Decision 5: Create Assessment Wizard Step 3 (Settings) Configuration Scope

- **Context & Conflict**: The UI Sample shows a standard 4-step wizard (_1. Basic Details_, _2. Select Questions_, _3. Settings_, _4. Review_) without detailing the granular per-question constraints mandated by the SRS.
- **Decision (SRS Wins / Harmonized)**:
  - The 4-step wizard sequence from the UI sample is retained.
  - Step 3 (**Settings**) is expanded to rigorously capture per-question time limits, negative marking configuration, question/option randomization flags, passing criteria, and navigation mode (`sequential` vs `free`) per `FR-ASMT-002`.
  - Client-side validation prevents creating any question limit that exceeds the overall assessment duration.
- **Traceability**: `FR-ASMT-001`, `FR-ASMT-002`, `FR-ASMT-004`, `FR-ASMT-008`.

---

### Decision 6: Scoring Engine Snapshot Resolution, Partial Credit, and Audited Corrections

- **Context & Reconciliation**: SRS `FR-SCORE-001` through `FR-SCORE-010`, `BR-011`, `UC-14`, and `UC-15` define evaluation rules, negative marking, partial credit, and administrative corrections.
- **Decision (SRS Wins)**:
  - **Config-Version Consistency (`BR-011`, `FR-SCORE-001`)**: Objective answers are strictly evaluated against the assessment's frozen `publishedSnapshot`. Modifications to the question bank made after an assessment has been published do not alter candidate scoring.
  - **Multi-Select Partial Credit (`FR-SCORE-003`)**: For `MCQ_MULTIPLE`, candidate selecting a non-empty subset of correct options without any incorrect options receives proportional marks `(correctCount / totalCorrectCount) * maxMarks`. Selecting any incorrect option awards 0 marks (or applies negative marking if configured).
  - **Provisional vs. Final Results (`FR-SCORE-008`, `UC-14`)**: Sessions containing subjective items (`SHORT_ANSWER`, `DESCRIPTIVE`, `SCENARIO`) are marked `PROVISIONAL` until Technical Evaluators award rubric marks via `/api/v1/admin/evaluation/evaluate`. Once all attempts are evaluated, the result becomes `FINAL` and cohort ranking is calculated.
  - **Score Corrections (`FR-SCORE-010`, `UC-15`, `TC-14`)**: Every score modification requires a non-empty reason, is recorded in `score_corrections` and the immutable audit log, and immediately recalculates dependent totals and deterministic rankings.
- **Traceability**: `FR-SCORE-001`..`010`, `FR-ADMIN-003`..`009`, `BR-011`, `BR-012`, `TC-13`, `TC-14`.

---

### Decision 7: Asynchronous Code Execution Queue, Ephemeral SQL Sandbox, and Zero Hidden Test Leakage

- **Context & Reconciliation**: SRS Sections 5.8 (`FR-CODE`), 5.9 (`FR-SQL`), 8.5, `BR-013`, `Rule 2`, `Rule 8`, `TC-10`, and `TC-12` govern technical question execution, security sandboxing, submission limits, infrastructure failures, and test case confidentiality.
- **Decision (SRS Wins)**:
  - **Asynchronous Execution Queue (`FR-CODE-005`, `Rule 8`)**: Candidate code is never compiled or executed inside the API process. `POST /api/v1/candidate/sessions/:id/code-submissions` validates session state, deadline, and per-question submission limits (`FR-CODE-010`), durably persists the source code with status `QUEUED`, and returns a submission ID immediately. Execution proceeds asynchronously through `services/code-runner` (or in-memory fallback adapter) and updates execution status (`QUEUED` -> `RUNNING` -> `COMPLETED`/`FAILED`).
  - **Strict Test Case Confidentiality (`Rule 2`, `FR-CODE-004`, `FR-CODE-009`, `TC-10`)**: Candidate status queries expose execution metrics (status, memory, time, compiler output) and permitted output for `SAMPLE` test cases only. `HIDDEN` test inputs, expected outputs, and evaluator details are readable strictly by internal evaluation workers and administrators, and never leave the server.
  - **Infrastructure Failure Protection (`FR-CODE-012`, `TC-12`)**: When `services/code-runner` experiences timeouts, network disconnection, or daemon failure, the submission is re-queued with exponential backoff (up to 2 retries). If failures persist, the submission is flagged `isInfrastructureError: true` with status `INTERNAL_EVALUATION_ERROR`. Under no circumstances is an infrastructure failure counted as a candidate compilation/runtime failure or penalized with a score deduction.
  - **Ephemeral SQL Sandbox (`FR-SQL-001`..`005`)**: SQL questions execute inside ephemeral in-memory database sandboxes with a strict read-only role (`SELECT` and CTE `WITH ... SELECT` only). Mutating/dangerous operations (`DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `INSERT`, `UPDATE`, `DELETE`, `GRANT`, `REVOKE`, `ATTACH`, `DETACH`, `PRAGMA`, `EXEC`) and multi-statement semicolon chaining are blocked by static AST/regex analysis before execution. Queries are bound by statement timeouts (default 3000ms) and maximum row limits (100 rows). Results are evaluated against expected datasets via normalized exact or unordered set comparison.
- **Traceability**: `FR-CODE-001`..`014`, `FR-SQL-001`..`005`, `SRS 8.5`, `BR-013`, `Rule 2`, `Rule 8`, `TC-10`, `TC-12`.

---

### Decision 8: Single Integrity Event Non-Conclusiveness and Proctoring Advisory

- **Context & Conflict**: UI dashboards and automated proctoring mocks often present security infractions (e.g. window blur, keystroke shortcuts, prohibited background process) with immediate red-flag punitive indicators. Conversely, SRS Section 10.3 (Line 762), Section 11.4, and `BR-015` strictly mandate: _"Record detected incidents without treating every focus change as conclusive proof of cheating."_ and _"no automatic penalty from a single focus-change event."_
- **Decision (SRS Wins)**:
  - The live session monitoring interface and telemetry stream must feature a persistent, prominent Proctoring Advisory notice.
  - The platform forbids automatic disqualification or penalty application based solely on a single focus or process event.
  - Telemetry is presented with chronological context, duration, window titles, and severity ratings so proctors and administrators can correlate events with physical lab invigilation reports.
- **Traceability**: SRS Section 10.3 (Line 762), Section 11.4, `BR-015`, `FR-LAB-006`.
