# Candidate Examination Instructions & Privacy Disclosure

**Document Ref**: `docs/Candidate-Instructions.md`  
**SRS Traceability**: `BR-015`, `NFR-PRIV-001`, `NFR-PRIV-004`, `FR-UI-001`, `FR-UI-002`, `FR-TIME-002`, `FR-LAB-005`, `FR-LAB-006`, `FR-LAB-008`  
**Target Audience**: Placement Candidates, Engineering Students, University Invigilators  
**Application**: VeriSync Candidate Desktop v1.1.0  
**Effective Date**: Academic Year 2026–2027

---

## 1. Overview & Institutional Policy

Welcome to the **VeriSync Placement Assessment Platform**. VeriSync provides a secure, fair, and standardized environment for technical recruitment and placement examinations.

Per **Business Rule BR-015** and **Non-Functional Requirement NFR-PRIV-004**, all candidates must be fully informed regarding workstation lockdown, proctoring telemetry, and privacy policies before commencing an examination. By logging in and checking the acknowledgment box on the **Instructions Screen**, you consent to these terms.

---

## 2. Mandatory Lockdown & Security Disclosures (`BR-015`, `FR-LAB-008`)

To guarantee examination integrity, the VeriSync workstation operates under strict multi-layer operating system and runtime lockdown:

```
+----------------------------------------------------------------------------------------------------+
|                                    LOCKDOWN CONTROLS DISCLOSURE                                    |
+------------------------------------+---------------------------------------------------------------+
| Kiosk Mode & Always-on-Top         | The application runs in full-screen kiosk mode and remains    |
|                                    | always-on-top. Access to the Windows desktop, taskbar, and    |
|                                    | file explorer is prohibited (FR-LAB-005, FR-LAB-008).         |
+------------------------------------+---------------------------------------------------------------+
| Keystroke Filtering                | Operating system switching shortcuts (Alt+Tab, Win Key,       |
|                                    | Win+D, Win+R, Ctrl+Alt+Del, Ctrl+Shift+Esc) are disabled at  |
|                                    | the operating system kernel level (TC-18).                    |
+------------------------------------+---------------------------------------------------------------+
| Window Focus Telemetry             | The client automatically logs and reports any loss of window  |
|                                    | focus (blur) or minimization attempts to proctors (FR-LAB-006)|
+------------------------------------+---------------------------------------------------------------+
| Background Process Monitoring      | Background processes are scanned for prohibited tools         |
|                                    | (screen recorders, remote desktop, debuggers, packet sniffers)|
|                                    | before and during the examination (FR-LAB-006).               |
+------------------------------------+---------------------------------------------------------------+
| Browser & New Window Blocking      | Web browsers (Chrome, Edge, Firefox) and external URL popups  |
|                                    | are strictly blocked from opening.                            |
+------------------------------------+---------------------------------------------------------------+
```

---

## 3. Privacy Policy & Data Protection (`NFR-PRIV-001`, `NFR-PRIV-004`)

VeriSync is committed to protecting candidate personal information under institutional policies and applicable data protection legislation:

1. **Information Collected**:
   - Candidate Identity: Roll number, full name, email, department, and assigned batch.
   - Assessment Artifacts: Objective answer selections, code source files, SQL queries, compilation outputs, and submission timestamps.
   - Workstation Telemetry: Unique lab device ID (`X-Device-Id`), client version (`X-Client-Version`), network latency, and integrity event logs (focus changes, application errors).
2. **Strict Purpose Limitation (`NFR-PRIV-001`)**:
   - All collected data is used **exclusively for evaluation and placement recruitment**.
   - Data is never sold, shared with external third parties, or used for commercial profiling.
3. **Hardware Proctoring Status (Decision 2, SRS 1.4.2)**:
   - Webcam and microphone recording are **disabled by default**. Audio/video proctoring is only engaged if explicitly mandated by the hiring organization and visibly indicated on the System Check screen.
4. **Data Protection & Sanitization (`Rule 5`)**:
   - Candidate passwords and session tokens are encrypted using **Argon2id** and OS-level cryptographic keyrings (`safeStorage`).
   - Passwords and authentication tokens are strictly stripped and redacted from all client-side and server-side audit logs.

---

## 4. Examination Rules & Behavioral Code

### 4.1 Permitted Actions

- **Code Authoring**: Writing and modifying code in the integrated Monaco editor for coding questions (`FR-CODE-001`).
- **Language Selection**: Freely switching between approved programming runtimes (**Python 3.10**, **JavaScript Node 20**, **Java 21**, **C GCC 13.2**, **C++20 G++ 13.2**).
- **Sample Code Execution (`FR-CODE-003`)**: Clicking **Run Code** to test your solution against visible sample test cases.
- **SQL Execution (`FR-SQL-001`)**: Writing and executing SQL queries in the sandbox console to inspect table results.
- **Accessibility Adjustments (`NFR-USE-005`)**: Toggling font scaling (Normal, Large, Extra Large) and High Contrast mode via the top accessibility bar.
- **Manual State Sync (`TC-07`)**: Clicking **Sync Status** if network connection is temporarily interrupted.

### 4.2 Strictly Prohibited Actions

- **External Electronics**: Using mobile phones, smartwatches, calculators, or secondary recording devices.
- **Hardware Tampering**: Disconnecting workstation power cords, Ethernet network cables, keyboards, or monitors.
- **Unauthorized Media**: Inserting USB storage sticks, flash drives, or external peripherals.
- **OS Escape Attempts**: Attempting key injection combinations (`Alt+Tab`, `Ctrl+Shift+Esc`, `Win+L`, `F12`).
- **Cheating & Communication**: Looking at adjacent candidates' screens or speaking during the examination.
- **Destructive SQL Commands (`FR-SQL-003`)**: Entering administrative or destructive database statements (`DROP`, `ALTER`, `TRUNCATE`, `ATTACH`).

> [!WARNING]
> Security alerts (focus loss, shortcut attempts, prohibited processes) are logged in real-time. Repeated policy violations will result in immediate examination cancellation and disciplinary referral.

---

## 5. Assessment Navigation & Timing Mechanics

1. **Sequential Question Progression (`Decision 1`, `BR-003`)**:
   - Questions must be answered in sequential order.
   - You must click **Submit & Next** to commit your current answer before the next question is revealed.
   - Once submitted, previous questions **cannot be reopened or re-edited**.
   - The question palette is a **read-only status indicator** showing which questions are answered.
2. **Server-Authoritative Timing (`FR-TIME-001`, `Rule 1`)**:
   - The countdown timer is controlled strictly by the central backend server clock.
   - Changing the local computer clock or refreshing the client will **not** provide additional time.
   - If a question's countdown timer reaches `00:00`, the question expires immediately (`FR-TIME-004`). Any in-flight work is automatically submitted, and the screen advances to the next question (`TC-05`).
3. **Background Autosaving (`FR-ANS-005`)**:
   - Draft code and SQL queries are autosaved every 10 seconds.
   - A draft is **never an accepted final submission**; you must click **Submit & Next** to formally record your answer.

---

## 6. What to Do During Technical Difficulties

If you encounter a technical problem, **do not panic**:

1. **Workstation Freezes or Restarts**:
   - Raise your hand immediately to alert the lab invigilator.
   - All accepted answers and draft code are saved securely on the central server (`FR-ANS-003`).
   - The invigilator will reboot the PC or relocate you to a spare workstation. You will resume your assessment from the exact active question attempt (`FR-TIME-010`).
2. **Network Connection Banner Appears**:
   - If a yellow bar shows _"Network connection degraded"_, continue typing your solution.
   - When the banner turns green (_"Server Connected"_), click the **Sync Status** button.
3. **Application Error Message**:
   - If an error popup appears, note the **Correlation ID** (e.g., `c-9a4f21`) and report it to the lab staff.
