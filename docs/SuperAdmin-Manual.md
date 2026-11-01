# VeriSync Super Administrator Operational Manual

**Platform Version**: VeriSync Assessment System v1.1  
**Target Audience**: Super Administrators, Placement Directors, Chief Proctors, Technical Operations  
**Design Reference**: [`docs/design/UI_Sample.jpeg`](file:///c:/VeriSync/VeriSync/docs/design/UI_Sample.jpeg)  
**Security Baseline**: SRS v1.1, Decisions 1–8, Non-Negotiable Rules 1–9

---

## 1. System Overview & Core Governance

VeriSync is a secure, high-concurrency placement assessment platform engineered for campus recruitment drives, competitive technical screening, and institutional examinations.

### Non-Negotiable Architectural Principles

1. **Server Authority (Rule 1)**: All deadlines, answer acceptances, timer countdowns, and scoring decisions originate exclusively on the authoritative server. Client clocks are untrusted and discarded.
2. **Zero Information Leakage (Rule 2)**: Candidate-facing interfaces and APIs never return hidden test cases, expected outputs, or scoring keys.
3. **Idempotency & Durability (Rules 3 & 4)**: All submissions require unique `Idempotency-Key` headers, committing data durably to PostgreSQL before sending HTTP acknowledgements.
4. **Mandatory Audit Justifications (Rule 7, BR-012)**: Every administrative override, score modification, assessment cancellation, or workstation block requires an explicit justification logged permanently to the SHA-256 audit hash-chain.
5. **Execution Isolation (Rule 8)**: Candidate code never runs in the API process. Code executions occur strictly in ephemeral, memory-capped sandbox runners with isolated process boundaries.
6. **Time & Error Standardization (Rule 9)**: All timestamps are strictly UTC ISO-8601. Errors strictly adhere to SRS 8.3.3 format with unique `correlationId` tracking.

---

## 2. Portal Anatomy & Navigation Architecture

The Administrator Portal interface is organized into a persistent layout matching [`docs/design/UI_Sample.jpeg`](file:///c:/VeriSync/VeriSync/docs/design/UI_Sample.jpeg):

```
+---------------------------------------------------------------------------------------------------+
|  [Sidebar Navigation]      |  [Top Header: Page Title | Notifications | Active Super Admin Profile] |
|                            +----------------------------------------------------------------------+
|  - Dashboard               |  [4 KPI Metrics Cards: Candidates | Tests | Completed | Active]      |
|  - Live Sessions           |                                                                      |
|  - Candidates              |  [Left Column: Analytics Donut Chart | Right: Upcoming Assessments]  |
|  - Question Bank           |                                                                      |
|  - Assessments             |  [Table / Card Stream: Live Telemetry, Filters, Pagination, Actions] |
|  - Results                 |                                                                      |
|  - Reports                 |                                                                      |
|  - Audit Logs              |                                                                      |
|  - Lab Devices             |                                                                      |
|  - Settings                |                                                                      |
+---------------------------------------------------------------------------------------------------+
```

### Primary Sections

1. **Dashboard**: High-level platform KPIs, test completion rates, and upcoming recruitment drive schedules.
2. **Live Sessions**: Real-time heartbeat tracking, candidate exam telemetry, time countdowns, and administrative overrides.
3. **Candidates**: Complete candidate roster, profile inspection drawers, bulk CSV ingestion, and account status toggles.
4. **Question Bank**: Multi-format question authoring (MCQ, SQL sandbox, Coding sandbox, Descriptive) and archival management.
5. **Assessments**: 4-step assessment creation wizard, question configuration, candidate allocation, and immutable snapshot publishing.
6. **Results & Scoring**: Candidate result cards, detailed question breakdown drawers, audited score correction, and subjective evaluation queue.
7. **Reports**: Statistical performance summaries, college rankings, and psychometric item discrimination charts.
8. **Audit Logs**: Cryptographic SHA-256 hash-chain verification, administrative activity logs, and incident tracking.
9. **Lab Devices**: Workstation registry, approved client version gating (`>= 1.1.0`), and security status overrides.
10. **Settings**: Security policies, TOTP MFA configuration, session timeouts, and client version baselines.

---

## 3. Operational Workflows

### 3.1 Administrator Authentication & MFA Setup

- **Login Credentials**: Provide administrator username or institutional email and password.
- **Two-Factor Authentication (FR-AUTH-008)**:
  1. The platform issues a time-based one-time password (TOTP) challenge.
  2. Enter the 6-digit code from your authenticator app (Google Authenticator, Microsoft Authenticator).
  3. Upon verification, cryptographically signed JWT access and refresh token pairs are issued.
- **MFA Enrollment (Settings -> Security)**:
  1. Administrators navigate to **Settings** -> **Security Settings**.
  2. Scan the generated QR code or copy the secret key into your authenticator app.
  3. Enter the 6-digit verification code to activate MFA protection.
  4. Store the 8 emergency backup codes in a secure institutional password vault.

---

### 3.2 Candidate Provisioning & Roster Management (FR-CAN-001..007)

- **Single Candidate Enrollment**:
  1. Navigate to **Candidates** -> Click **Add Candidate**.
  2. Fill in Candidate ID (`CAN-YYYY-XXXX`), Recruitment Reference (e.g. `TCS Campus 2026`), Full Name, Email, Institution, and Qualification.
  3. Click **Submit**. The system returns a secure temporary password. Copy and securely transmit it to the candidate.
- **Bulk CSV Ingestion (FR-CAN-003)**:
  1. Click **Import CSV**.
  2. Upload or paste CSV text with header row: `Candidate Identifier,Full Name,Email,Institution,Qualification,Graduation Year,Recruitment Reference`.
  3. Click **Process Import**. The parser validates each record against duplicate email and format rules.
- **Destructive Action Confirmation (NFR-USE-004)**:
  - Deactivating a candidate requires clicking the **Deactivate** button and confirming in the warning modal (`Confirm Deactivation`). Deactivation immediately invalidates active sessions and prevents logins while preserving audit history.

---

### 3.3 Multi-Format Question Authoring (FR-QB-001..010)

Navigate to **Question Bank** -> Click **Add Question**:

- **Single Choice (MCQ_SINGLE)**: Define question text, 4 options, designate single correct answer, set positive and negative marks.
- **Multiple Choice (MCQ_MULTIPLE)**: Designate multiple correct answers. Partial or all-or-nothing marking can be configured.
- **SQL Sandbox (FR-SQL-001..005)**:
  - Define `schemaDdl` (table schema definitions in SQLite/PostgreSQL syntax).
  - Define `seedDataSql` (sample rows inserted into the test database).
  - Define `referenceQuery` (authoritative solution query).
  - Select comparison mode: `EXACT_MATCH` (strictly identical ordering) or `UNORDERED_MATCH`.
- **Coding Sandbox (FR-CODE-001..013)**:
  - Select allowed languages: Python, JavaScript, C++, C, Java.
  - Define time limit (e.g. `2000` ms) and cost-safe memory limit (default `128` MB).
  - Provide test cases:
    - Mark at least 1 test case as `SAMPLE` (visible to candidate in desktop client).
    - Mark remaining edge cases as `HIDDEN` (strictly evaluated on runner node, actual output never leaked per Rule 2).
- **Descriptive & Subjective Questions**:
  - Define scoring rubric criteria (e.g. _Architecture Principles_ [5 pts], _Security Controls_ [5 pts]).
- **Archiving Questions (NFR-USE-004)**:
  - Click **Archive** on an active question row.
  - Confirm in the **Archive Question from Repository?** modal. Archived questions are hidden from new wizards but remain immutable in existing published snapshots.

---

### 3.4 4-Step Assessment Authoring & Snapshot Freezing (Decision 5)

Navigate to **Assessments** -> Click **Create Assessment**:

1. **Step 1: Basic Details**:
   - Assessment Title, Job Role Category, Overall Duration (minutes), and Schedule Start/End Windows (UTC).
2. **Step 2: Select & Arrange Questions**:
   - Select questions from repository.
   - Adjust presentation sequence and optional per-question time limits.
3. **Step 3: Rules & Configuration (Decision 5)**:
   - Configure passing marks, negative marking deduction factor, randomize question order, randomize option order.
   - Set Navigation Mode: `FREE` (free forward/backward movement) or `SEQUENTIAL` (strictly one question at a time).
   - Set Result Visibility: `IMMEDIATE` or `ADMIN_RELEASE`.
4. **Step 4: Review & Publish**:
   - Inspect mark summary, time breakdown, and question list.
   - Click **Publish Assessment** -> Confirm in modal.
   - **Immutable Snapshot Freezing**: Once published, the assessment configuration and all included questions are permanently frozen into an immutable version snapshot. Future question bank edits will not mutate this assessment.

---

### 3.5 Candidate Assessment Allocation (FR-CAN-004)

1. On the assessment card in the catalog, click **Assign Candidates**.
2. Search candidates by name, identifier, or filter by drive reference.
3. Select candidates individually or click **Select All Filtered**.
4. Click **Confirm Assignment**. Scheduled exam attempt records are provisioned.

---

### 3.6 Live Examination Monitoring & Overrides (FR-ADMIN-002, FR-ADMIN-004)

Navigate to **Live Sessions**:

- **Real-Time Telemetry Stream**: View candidate status badges (`ACTIVE`, `INTERRUPTED`, `SUBMITTED`, `EXPIRED`), current question progress, remaining countdown seconds, client IP, and client software version.
- **Administrative Session Overrides (Rule 7, BR-012)**:
  - Click **Override** on an active candidate row:
    - `EXTEND_TIME`: Grant extra time (e.g. 5, 10, 15 minutes) for verified workstation or hardware issues.
    - `PAUSE_EXAM`: Freeze the authoritative server countdown timer while troubleshooting physical lab conditions.
    - `RESUME_EXAM`: Unfreeze and restart timer countdown.
    - `REOPEN_SESSION`: Permit candidate to reconnect after an ungraceful crash.
    - `CANCEL_SESSION`: Terminate attempt due to documented misconduct.
  - **Mandatory Justification**: An override cannot be submitted without entering a detailed justification reason.

---

### 3.7 Proctoring & Integrity Telemetry (Decision 8)

Navigate to **Live Sessions** -> Click **Integrity Events Stream**:

- View automated proctoring alerts: `MULTIPLE_FACES_DETECTED`, `WINDOW_BLURRED`, `FULLSCREEN_EXITED`, `CLIPBOARD_ACCESSED`, `PERIPHERAL_DISCONNECTED`.
- **Advisory Banner**: The UI displays the official platform policy: _"Single automated integrity events are evidentiary and non-conclusive. Human proctors must corroborate telemetry with physical lab observations prior to initiating candidate disqualification (Decision 8)."_

---

### 3.8 Subjective Evaluation Queue (UC-14, FR-SCORE-004)

Navigate to **Results** -> Click **Evaluation Queue** subtab:

1. Pending candidate submissions for short-answer, descriptive, and scenario questions appear in the queue.
2. Review candidate answer side-by-side with reference guidelines.
3. Score each rubric criterion individually; total awarded marks sum automatically.
4. Enter optional constructive evaluator feedback comments.
5. Click **Submit Evaluation & Award Marks**.
6. The candidate's overall score recalculates immediately, and status transitions from `PROVISIONAL` to `FINAL`.

---

### 3.9 Audited Score Correction Workflow (UC-15, FR-SCORE-010, Rule 7, BR-012)

Navigate to **Results** -> Click **All Results**:

1. Super Administrators can click **Correct** on any candidate row.
2. Select target: `Overall Total Score` or a specific question.
3. Enter new revised score.
4. **Mandatory Justification Reason (Rule 7, BR-012)**:
   - Enter detailed reason (e.g. _"Re-evaluated coding submission edge cases per academic committee review"_).
5. Check the confirmation checkbox: _"I confirm this score modification will recalculate dependent percentages, update ranking, and be stamped permanently into the immutable audit trail."_
6. Click **Confirm Score Correction**.
7. The table row reflects the updated score and displays a **Corrected** badge.

---

### 3.10 Lab Workstation Management & Version Enforcement (UC-17, FR-LAB-001..004)

Navigate to **Lab Devices**:

- **Device Registration**: Click **Register Device** -> Provide Lab Identifier (`LAB-A-W01`), Hostname, IP address, MAC address, and approved client version.
- **Status Gating**:
  - `ACTIVE`: Workstation permitted to launch secure desktop kiosk and connect candidates.
  - `BLOCKED`: Workstation immediately rejected with HTTP 403 / 426 during authentication handshake.
- **Client Version Enforcement**:
  - Workstations running a version lower than `minimumClientVersion` receive error code `CLIENT_VERSION_OUTDATED` (HTTP 426).

---

### 3.11 Audit Trail & Cryptographic Hash Chain Verification (FR-ADMIN-007, SRS 11.4)

Navigate to **Settings** -> Click **Security & Compliance**:

- Click **Verify Cryptographic Chain**.
- The system recalculates SHA-256 hashes sequentially across all historical audit entries:
  $$\text{Hash}_i = \text{SHA-256}(\text{Hash}_{i-1} \parallel \text{Entry}_i)$$
- Displays confirmation: _"Audit Trail Valid: SHA-256 Hash Chain Verified (N entries verified, 0 tampering detected)"_.

---

## 4. Troubleshooting & Operational FAQ

### Q1: Candidate experiences network dropout during exam. What happens?

**Answer**: VeriSync's server countdown continues authoritatively. The candidate's desktop kiosk caches answers locally and attempts reconnection with exponential backoff. Once reconnected, state resynchronizes automatically. If the dropout lasted several minutes due to a lab switch failure, the Chief Proctor should apply an administrative **EXTEND_TIME** override in the **Live Sessions** view, noting the network outage as the mandatory reason.

### Q2: Workstation shows "Client Version Outdated (HTTP 426)". How to resolve?

**Answer**:

1. Check the workstation's installed VeriSync client version.
2. If the platform administrator recently bumped the approved baseline version (e.g. from `1.0.8` to `1.1.0`), deploy the updated installer to the lab machines.
3. Alternatively, if authorized, open **Settings** -> **Security Policies** and adjust the `minimumClientVersion` policy.

### Q3: Candidate account is locked out after failed login attempts.

**Answer**:

- If candidate enters wrong credentials 5 consecutive times, the account enters a 15-minute rate-limited cooldown (`RATE_LIMITED`, HTTP 429).
- To assist immediately, the Super Admin can navigate to **Candidates**, locate the candidate, and click **Reset Password**. This generates a new temporary password and clears the failed attempt counter.

### Q4: Code Runner returns HTTP 503 ("QUEUE_CAPACITY_EXCEEDED").

**Answer**:

- Under extreme concurrent submission spikes, the code runner service's bounded queue protects server memory from exhaustion (`maxQueueDepth: 100`).
- The client receives HTTP 503 with a `Retry-After: 2` header. The candidate desktop client automatically retries submission after 2 seconds.
- Administrators can monitor active executions and queue depth in the Code Runner `/api/v1/health` endpoint. If campus drives regularly exceed 500 concurrent coding candidates, scale the runner service horizontally behind an internal load balancer.

### Q5: Automated proctoring flagged a candidate for "MULTIPLE_FACES_DETECTED". Should they be disqualified?

**Answer**:

- **NO**. Under Decision 8 and platform proctoring regulations, automated telemetry events are strictly advisory. A student turning to adjust their monitor or a proctor walking behind the candidate can trigger this event.
- The Chief Proctor must verify with the physical lab room proctor before making any disciplinary decision.

---

## 5. Security & Compliance Checklist

- [x] All administrator accounts have TOTP Multi-Factor Authentication enrolled.
- [x] Default administrator passwords have been replaced with strong Argon2id passwords.
- [x] Lab workstation IP ranges and MAC addresses are registered in Lab Devices.
- [x] SHA-256 audit hash-chain passes integrity verification prior to examination start.
- [x] Placement results CSV exports are securely archived in compliance with institution data retention policies.
