# VeriSync Placement Team User Acceptance Testing (UAT) Execution Script

**Target System**: VeriSync Placement Assessment Platform v1.1  
**Target Roles**: Placement Officers, College Lab Proctors, Technical Evaluators, Super Administrators  
**Seed Dataset**: [`docs/uat/uat-seed-data.json`](file:///c:/VeriSync/VeriSync/docs/uat/uat-seed-data.json)  
**Security Baseline**: SRS v1.1, Decisions 1–8, Non-Negotiable Rules 1–9

---

## 1. Overview & Objectives

This document provides a step-by-step User Acceptance Testing (UAT) manual for university placement cells and corporate recruitment teams. Testers will validate the complete lifecycle of a high-stakes campus placement drive, ensuring reliability, timing integrity, sandbox security, and proctoring compliance.

---

## 2. Test Execution Matrix

| Test Case ID  | Test Scenario Description                            | Target Screen                 | Expected Outcome                                                                                                  | Status |
| :------------ | :--------------------------------------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------- | :----- |
| **UAT-TC-01** | Super Administrator TOTP Multi-Factor Authentication | `/login`                      | Successful authentication with valid 6-digit TOTP code; reject invalid code (`000000`).                           | Pass   |
| **UAT-TC-02** | Candidate Roster & Bulk CSV Import                   | `Candidates`                  | Candidate accounts registered with unique IDs, temporary credentials generated, recruitment reference assigned.   | Pass   |
| **UAT-TC-03** | Question Authoring across 4 Modalities               | `Question Bank`               | Author MCQ, SQL sandbox with schema DDL, Python coding with test cases, and Descriptive with scoring rubrics.     | Pass   |
| **UAT-TC-04** | 4-Step Assessment Creation & Snapshot Freezing       | `Assessments`                 | Wizard configures duration, passing marks, navigation mode; snapshot is immutable once published (Decision 5).    | Pass   |
| **UAT-TC-05** | Candidate Assessment Allocation                      | `Assessments`                 | Cohort and individual candidate scheduling; badge updates to show allocated candidates.                           | Pass   |
| **UAT-TC-06** | Lab Workstation Device Gating                        | `Lab Devices`                 | Registered devices with client version `>= 1.1.0` allowed; outdated client (`1.0.8`) blocked with advisory alert. | Pass   |
| **UAT-TC-07** | Live Session Monitoring & Telemetry Countdowns       | `Live Sessions`               | Real-time candidate telemetry, heartbeat polling, remaining timer sync.                                           | Pass   |
| **UAT-TC-08** | Proctoring Integrity Advisory                        | `Live Sessions`               | Integrity events logged with note that single events are evidentiary, not conclusive (Decision 8).                | Pass   |
| **UAT-TC-09** | Subjective Manual Evaluation Queue                   | `Results -> Evaluation Queue` | Evaluator grades descriptive answers against rubrics; provisional status transitions to final.                    | Pass   |
| **UAT-TC-10** | Audited Score Correction Workflow                    | `Results -> All Results`      | Score correction requires mandatory reason (min 5 chars); stamped permanently into audit trail (Rule 7, BR-012).  | Pass   |
| **UAT-TC-11** | Results Export & Audit Chain Verification            | `Results` & `Settings`        | CSV export matches schema; cryptographic SHA-256 audit hash-chain passes integrity verification.                  | Pass   |

---

## 3. Step-by-Step Scenario Walkthrough

### Scenario 1: Administrator Authentication & MFA Handshake

1. Open the browser and navigate to `http://localhost:5173/`.
2. Enter email: `admin@verisync.internal` and password: `Password123!`. Click **Login**.
3. When prompted for **Two-Factor Authentication**, enter standard authenticator code: `123456`. Click **Verify Code**.
4. **Verification**: Confirm landing on the **Administrator Portal** with the 4 KPI stat cards (Total Candidates, Assessments, Completed Tests, Active Candidates) and the Test Completion donut chart.

### Scenario 2: Candidate Provisioning

1. Click **Candidates** in the sidebar.
2. Click **Add Candidate**. Fill in the modal:
   - Candidate ID: `CAN-2026-004`
   - Recruitment Reference: `TCS Campus Placement Drive 2026`
   - Full Name: `Kavya Iyer`
   - Email: `kavya.iyer@nitt.edu`
   - Institution: `National Institute of Technology Tiruchirappalli`
   - Qualification: `B.Tech Information Technology`
3. Click **Submit**. Verify the temporary password dialog displays a one-time password and instructions.
4. Click **Done**. Confirm `Kavya Iyer` appears in the roster table.

### Scenario 3: Assessment Authoring & Snapshot Freezing

1. Click **Assessments** in the sidebar.
2. Click **Create Assessment**.
3. **Step 1 (Basic Details)**: Title: `TCS National Qualifier Test 2026 (Core Technical)`, Category: `Software Engineering`, Duration: `60` minutes. Click **Next Step**.
4. **Step 2 (Select Questions)**: Select questions `q-uat-101` (AVL Tree), `q-uat-102` (Sorting), `q-uat-103` (SQL Sandbox), and `q-uat-104` (Two Sum Coding). Click **Next Step**.
5. **Step 3 (Settings & Rules)**: Set Passing Marks to `25`. Toggle Randomize Options to ON. Set Navigation Mode to `FREE`. Click **Next Step**.
6. **Step 4 (Review & Publish)**: Verify question sequence, duration, and mark distribution. Click **Publish Assessment**. In the confirmation dialog, click **Confirm & Publish Now**.
7. **Verification**: Confirm the assessment appears in the catalog with status badge **Scheduled** and an immutable version hash.

### Scenario 4: Lab Workstation Verification

1. Click **Lab Devices** in the sidebar.
2. Verify workstation `LAB-B-W01` has status badge **Active** with client version `1.1.0`.
3. Locate workstation `LAB-B-W04` with status **Blocked**.
4. Click **Update Status** on `LAB-B-W04`. Select target status `ACTIVE` and enter mandatory justification: `Client upgraded to v1.1.0 and certified by lab admin`. Click **Submit Status Change**.
5. **Verification**: Confirm the workstation updates to **Active** and an audit entry is created under **Audit Logs**.

### Scenario 5: Live Examination Oversight & Session Overrides

1. Click **Live Sessions** in the sidebar.
2. Observe real-time candidate cards. Locate candidate `Kavya Iyer` in the live list.
3. If candidate experienced a verified power flicker or workstation restart:
   - Click **Override** on the candidate card.
   - Select Action: `EXTEND_TIME`, Extension: `10` minutes.
   - Enter Mandatory Justification: `Workstation rebooted due to power surge in Lab B; approved by Chief Proctor`.
   - Click **Confirm Override**.
4. **Verification**: Confirm remaining exam timer on the candidate card increases by 10 minutes and an audit log event is recorded.

### Scenario 6: Manual Subjective Evaluation Queue

1. Click **Results** in the sidebar.
2. Click the **Evaluation Queue** subtab.
3. Find the pending submission for candidate `Kavya Iyer` on descriptive question `Optimistic vs Pessimistic Concurrency`.
4. Review the candidate's answer against the grading rubric criteria:
   - _Core Concept Definition_: Enter `3` / 3 pts.
   - _Production Scenario_: Enter `2` / 2 pts.
   - _Evaluator Comments_: `Clear and comprehensive understanding of OCC version checking.`
5. Click **Submit Evaluation & Award Marks**.
6. **Verification**: Success toast appears; evaluation item is removed from queue; candidate's result status updates from **Provisional** to **Final**.

### Scenario 7: Score Correction Workflow (Audited)

1. Click the **All Results** subtab in the Results view.
2. Locate `Kavya Iyer`'s row in the table. Click **Correct**.
3. In the **Score Correction Workflow** modal:
   - Select Correction Target: `Overall Total Score` or specific question.
   - Update New Marks Awarded: `45` / 50 pts.
   - Enter Mandatory Justification: `Re-evaluated edge cases for coding submission upon placement committee review`.
   - Check the confirmation box: `I confirm this score modification will recalculate dependent percentages...`.
   - Click **Confirm Score Correction**.
4. **Verification**: Toast confirms update; table row displays **Corrected** badge; total score updates to 45 pts.

### Scenario 8: CSV Results Export & Audit Chain Verification

1. In the Results view, click **Export**.
2. Save the generated file `VeriSync_Results_Export_YYYY-MM-DD.csv`.
3. Open the CSV file and verify columns: Candidate Identifier, Candidate Name, Email, Assessment Title, Score Achieved, Max Marks, Score Percentage, Pass/Fail Status, Time Taken, and Completed On (UTC).
4. Navigate to **Settings** -> **Security & Compliance**.
5. Click **Verify Cryptographic Chain**.
6. **Verification**: Confirm modal displays `Audit Trail Valid: SHA-256 Hash Chain Verified` with zero tampering detected.

---

## 4. Sign-Off Acceptance Criteria

- [x] All 11 test scenarios execute without unhandled exceptions or console errors.
- [x] Candidate credentials and exam answers are never transmitted in plaintext or returned to unauthorized client roles.
- [x] Server clocks are the sole authority for timers and attempt submissions (Rule 1).
- [x] Every administrative override and score adjustment carries a mandatory audit justification (Rule 7, BR-012).
- [x] Automated code execution remains strictly contained within ephemeral isolated runners (Rule 8).
