# Lab Staff Technical Failure Recovery Runbook

**Document Ref**: `docs/kiosk/lab-staff-recovery.md`  
**SRS Traceability**: SRS Section 11.4 (_Incident Handling Roles_), `FR-LAB-007`, `FR-TIME-010`, `FR-ANS-007`, `BR-010`, `UC-12`, `NFR-REL-004`  
**Target Roles**: Lab Staff, Floor Invigilators, Chief Exam Superintendent, Placement Coordinator  
**Platform**: VeriSync Lab Workstations & Candidate Desktop v1.1.0

---

## 1. Regulatory Context & Incident Handling Roles

Per **SRS Section 11.4**, technical incidents during high-stakes placement examinations must adhere strictly to designated roles and required durable records:

| Situation                          | First Responder | Decision Maker                                                       | Required Record                                                                                  |
| :--------------------------------- | :-------------- | :------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **One candidate's computer fails** | Lab Staff       | Lab Staff; **Super Admin approval required** for any time adjustment | Audit event, machine ID, candidate ID, and explicit incident reason (`Rule 7`)                   |
| **Lab-wide network loss**          | Lab Staff       | Super Admin / Placement Coordinator                                  | Incident note, list of affected sessions, authoritative extension log (`Rule 7`)                 |
| **Cloud service outage**           | Super Admin     | Placement Coordinator                                                | Incident timeline, pause or reschedule decision                                                  |
| **Suspected integrity event**      | Lab Staff       | Placement Coordinator                                                | Telemetry audit events (`FOCUS_LOST`); **no automatic penalty from a single event** (`SRS 11.4`) |

---

## 2. Non-Negotiable Operational Principles

1. **Server Clock Authority (`FR-TIME-001`, `BR-010`)**:
   - Workstation restarts or local freezes **never automatically pause the server-authoritative timer**.
   - Time adjustments can **never** be granted by a local client or by proctors on the workstation; adjustments require Super Admin approval via the Admin Web Dashboard (`FR-SCORE-010`, `Rule 7`).
2. **Durable Persistence (`FR-ANS-003`, `FR-ANS-005`)**:
   - Any answer acknowledged by the server is already durably committed to PostgreSQL.
   - Draft code and SQL solutions are periodically saved every 10 seconds via `PUT /candidate/sessions/:id/draft`.
3. **Audit Trail Integrity (`FR-AUD-001`, `Rule 5`, `Rule 7`)**:
   - Every workstation restart, machine swap, or override must be logged with timestamp (UTC), proctor ID, and justification.
   - Zero passwords or candidate tokens may be written in proctor notes or incident logs.

---

## 3. Incident Recovery Procedures

### Scenario A: Workstation Freeze, Blue Screen (BSOD), or Sudden Power Off

**Symptom**: Candidate screen becomes unresponsive, mouse freezes, or machine reboots unexpectedly.

#### Step-by-Step Procedure:

1. **Calm the Candidate**: Inform the candidate that their previous submissions and draft code are saved securely on the central server (`FR-ANS-003`).
2. **Hard Reboot Workstation**:
   - Press and hold the workstation power button for 5 seconds until the PC turns off completely.
   - Wait 10 seconds, then press power to boot.
3. **Automatic Shell Initialization**:
   - The computer will auto-boot into the `VeriSyncCandidate` shell launcher without showing the desktop.
   - The VeriSync Candidate Desktop application will launch automatically in full-screen kiosk mode.
4. **Candidate Re-Authentication & Session Resumption (`FR-TIME-010`, `TC-07`)**:
   - The candidate enters their roll number and password.
   - The client performs the version handshake (`FR-LAB-003`) and detects the active in-progress session.
   - Click **Resume Assessment**.
5. **State Restoration**:
   - The client fetches authoritative status via `GET /candidate/sessions/:id/status`.
   - The candidate is restored directly to their currently active question attempt.
   - The remaining countdown timer syncs with the server clock (`timeSync.ts`).
6. **Log Incident**: Lab staff enters incident details on the proctor clipboard: candidate roll number, machine ID, downtime duration, and timestamp.

---

### Scenario B: Workstation Hardware Failure Requiring Machine Swap

**Symptom**: Workstation hardware failure (motherboard, power supply, monitor) prevents local reboot.

#### Step-by-Step Procedure:

1. **Escort Candidate to Spare Workstation**:
   - Direct the candidate to a pre-imaged, verified spare lab workstation (e.g., `LAB-DEV-SPARE-01`).
2. **Ensure Clean State**:
   - Verify that the spare machine is displaying the initial VeriSync login screen.
3. **Authenticate on New Machine (`BR-007`, `TC-15`, `FR-LAB-002`)**:
   - Candidate logs in with their credentials.
   - The backend validates the candidate's active session.
   - The backend automatically transitions the previous session's connection from the old workstation to the new registered device ID (`X-Device-Id`).
   - The previous workstation's token is invalidated to prevent duplicate concurrent sessions (`BR-007`).
4. **Resumption**:
   - Candidate resumes the assessment from the exact server-authoritative question state.
5. **Request Time Compensation (If applicable)**:
   - If the machine swap took longer than 3 minutes, the Lab Staff contacts the **Super Admin / Placement Coordinator**.
   - Super Admin applies an administrative time extension through the Admin Web Portal (`PATCH /admin/sessions/:id/time-extension`), providing the required audit reason (`Rule 7`).

---

### Scenario C: Temporary Network Interruption (Local Switch or Wi-Fi Drop)

**Symptom**: Yellow or red connection banner appears: _"Network connection degraded. Reconnecting..."_ (`FR-UI-008`).

#### Step-by-Step Procedure:

1. **Instruct Candidate to Continue Working**:
   - Candidates can continue writing code, SQL queries, or reviewing question prompts.
   - The client's background retry loop will automatically reconnect once the network link is restored.
   - Submission buttons show disabled / retrying status until connection is re-established.
2. **Verify Lab Network Equipment**:
   - Lab staff inspects the lab switch rack or network cable connecting the workstation.
3. **Manual Synchronization (`TC-07`)**:
   - Once the network link indicator shows green (_"Server Connected"_), instruct the candidate to click the **Sync Status** button located at the top-right of the screen.
   - The client verifies state with the server and ensures all pending drafts are committed.

---

### Scenario D: Security Alert / Window Focus Loss Warning

**Symptom**: Candidate screen displays a yellow security banner:  
_"Security Warning: Application lost focus (blur). This event is logged and monitored (FR-LAB-006)."_

#### Step-by-Step Procedure:

1. **Immediate Visual Inspection**:
   - Invigilator steps immediately to the candidate's workstation.
   - Observe the workstation surroundings for unauthorized peripheral devices, smartphones, secondary cables, or nearby candidates talking.
2. **Evaluate Cause**:
   - Per **SRS 11.4**: _"No automatic penalty from a single focus-change event."_
   - Legitimate causes: Windows system update notification, display driver blip, or accidental mouse click near the display boundary.
   - Illegitimate causes: Attempted shortcut key injection, USB insertion, or switching screens.
3. **Proctor Verification & Dismissal**:
   - If determined to be a benign system artifact, the invigilator instructs the candidate to click back onto the exam workspace to dismiss the warning.
   - If suspicious activity is observed, the invigilator flags the candidate's roll number on the incident roster for post-exam review by the Placement Coordinator.

---

## 4. Proctor Quick Reference Card

```
+---------------------------------------------------------------------------------------------------------+
|                                    PROCTOR INCIDENT ACTION CHEAT SHEET                                  |
+------------------------------------+--------------------------------------------------------------------+
| Workstation Frozen / Stuck         | Hold power button for 5s -> Turn on -> Auto-boots into VeriSync    |
|                                    | -> Candidate logs in -> Click "Resume Assessment".                 |
+------------------------------------+--------------------------------------------------------------------+
| Hardware Dead (Needs Spare PC)     | Move candidate to spare workstation -> Candidate logs in ->        |
|                                    | Server transfers session to new machine -> Contact Super Admin     |
|                                    | if time compensation is justified (SRS 11.4).                      |
+------------------------------------+--------------------------------------------------------------------+
| Network Disconnected (Yellow Bar)  | Candidate continues typing -> Fix cable/switch -> Verify green     |
|                                    | status -> Click "Sync Status" button (TC-07).                      |
+------------------------------------+--------------------------------------------------------------------+
| Focus-Loss Security Alert (Yellow) | Visually inspect desk -> If benign, click back on exam screen ->    |
|                                    | Note roll number on clipboard. Do NOT disqualify candidate.        |
+------------------------------------+--------------------------------------------------------------------+
| Timer Adjustment Needed            | Proctors CANNOT alter timers locally. Contact Super Admin via      |
|                                    | Admin Dashboard with incident justification (Rule 7).              |
+------------------------------------+--------------------------------------------------------------------+
```

---

## 5. Post-Exam Incident Logging & Documentation

At the conclusion of each examination session, the Lab Superintendent must submit an Incident Summary to the Placement Office:

1. **Incident Roster File**: Complete `docs/kiosk/incident-log-YYYYMMDD.csv` containing:
   - `Timestamp (UTC)`
   - `Candidate Roll Number`
   - `Lab Room & Workstation ID`
   - `Incident Type` (Workstation Reboot / Machine Swap / Network Glitch / Focus Alert)
   - `Duration of Disruption`
   - `Resolution Applied`
   - `Authorized Proctors & Approving Super Admin`
2. **Audit Synchronization**: Verify that all administrative time adjustments and overrides are recorded in the central audit database (`FR-AUD-001`, `Rule 7`).
