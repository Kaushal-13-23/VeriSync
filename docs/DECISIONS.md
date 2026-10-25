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
