# Phase 6 Completion Report: Workstation Kiosk Lockdown & Recovery Architecture

**Developer**: Developer C (Vimal Raj)  
**Role**: Candidate Desktop and Lockdown  
**Branch**: `phase-6/vimal-lockdown-kiosk`  
**Date**: 2026-11-01

---

## 1. What Was Built

In Phase 6, Developer C delivered the complete **Workstation Lockdown, Kiosk Integration, and Operational Recovery Architecture** across `apps/candidate-desktop`, `deploy/kiosk`, and `docs/kiosk`, strictly satisfying SRS Section 5.10 (`FR-LAB-001` through `FR-LAB-008`), `TC-18`, SRS Section 11.4 (_Incident Handling Roles_), and Non-Negotiable Rule 5.

Per **SRS FR-LAB-008**, full-screen display alone is never treated as a security guarantee. Full lockdown is achieved through a coordinated **4-layer defense in depth model**:

1. **Layer 4: Electron Application Runtime Lockdown (`apps/candidate-desktop/electron/main.ts`, `preload.ts`)**:
   - **Dynamic Kiosk & Always-on-Top (`FR-LAB-005`, `FR-LAB-008`)**: When an assessment is `Active`, `setExamActive(true)` engages fullscreen kiosk mode and elevates window to `screen-saver` level always-on-top, preventing background taskbar and desktop bleed.
   - **Single-Instance Enforcement (`FR-LAB-005`, `TC18`)**: Electron single instance lock restores and focuses the primary window if a secondary process is spawned; concurrent launches during an active assessment trigger a security alert.
   - **DevTools & Context Menu Suppression**: Blocked in production and during active exams. DevTools hotkeys (`F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`), reload shortcuts (`F5`, `Ctrl+R`), and close key (`Alt+F4`) are dropped by `before-input-event`.
   - **Navigation & Popup Boundaries**: `setWindowOpenHandler` denies all popups; `will-attach-webview` denies webviews; `will-navigate` blocks navigation outside approved origins.
   - **Real-Time Security Integrity Telemetry (`FR-LAB-006`, `TC18`)**:
     - `blur` event triggers focus-loss logging and transmits `FOCUS_LOST` telemetry to the API.
     - `minimize` event immediately invokes `mainWindow.restore()` + `mainWindow.focus()`, maintaining continuous visibility, and transmits `WINDOW_MINIMIZE` telemetry.
     - `close` event prevents default while an exam is active (`e.preventDefault()`) and records `CLOSE_ATTEMPT_BLOCKED`.
   - **Local Rotating Audit Log (Rule 5, `FR-AUD-007`, `NFR-MNT-005`)**: 2MB rotating log with 3-file retention and automatic scrubbing of passwords, bearer tokens, and credentials.

2. **Layer 3: Windows Shell Launcher / Assigned Access (`deploy/kiosk/Configure-AssignedAccess.ps1`)**:
   - Replaces Windows Explorer (`explorer.exe`) with `VeriSync-Candidate.exe` for the candidate OS account.
   - Eliminates Start Menu, taskbar, desktop icons, and notification flyouts at the OS shell level.
   - Configures automatic process respawn (action code `1`) if the candidate client exits unexpectedly.

3. **Layer 2: AppLocker / WDAC Application Execution Whitelist (`deploy/kiosk/AppLocker-Policy.xml`, `Apply-AppLockerPolicy.ps1`)**:
   - XML policy enforcing strict execution whitelisting via the Windows Application Identity service (`AppIDSvc`).
   - Allows `%WINDIR%\*` system binaries and `%PROGRAMFILES%\VeriSync\*`.
   - Explicit Deny rules for standard users on: `cmd.exe`, `powershell.exe`, `pwsh.exe`, `taskmgr.exe`, `regedit.exe`, and external browsers (`chrome.exe`, `msedge.exe`, `firefox.exe`, `brave.exe`).
   - Blocks unauthorized user script execution (`.bat`, `.cmd`, `.ps1`, `.vbs`, `.js`).

4. **Layer 1: OS Kernel & Registry Policies (`deploy/kiosk/Configure-KioskSecurityPolicies.ps1`, `Setup-CandidateAccount.ps1`, `Setup-ProtectedInstall.ps1`)**:
   - **Hardware Scancode Map (`TC18`)**: Kernel-level keyboard scancode map remaps Left Windows Key (`0x5B`), Right Windows Key (`0x5C`), and Apps Key (`0x5D`) to `0x00`, neutralizing Win key combinations (`Win+D`, `Win+R`, `Win+E`, `Win+L`, `Win+Tab`).
   - **Registry System Policies**: Enforces `DisableTaskMgr = 1`, `DisableLockWorkstation = 1`, `DisableChangePassword = 1`, `HideFastUserSwitching = 1`, and `NoDriveTypeAutoRun = 0xFF` (USB AutoRun blocked).
   - **Restricted Candidate Account**: Automated creation of non-admin local user `VeriSyncCandidate` with non-expiring credentials and hardened user hive policies.
   - **Strict NTFS DACLs (`NFR-SEC-005`)**: Sets read-and-execute permissions for candidates on `C:\Program Files\VeriSync`; write and modify access restricted to Administrators and SYSTEM.

5. **Dynamic System Check Prohibited Process Detection (`SystemCheckScreen.tsx`, `apiClient.ts`, `FR-LAB-006`)**:
   - Fetches authoritative process denylist policy from `apiClient.getProhibitedProcessesPolicy()` with fallback to 20+ known remote desktop, screen recorder, and debugging signatures.
   - System Check blocks proceeding if unauthorized applications (`teamviewer`, `anydesk`, `obs`, `wireshark`, `discord`, etc.) are detected running in the background.

6. **Escape-Path Test Matrix (`docs/kiosk/escape-tests.md`, `TC18`)**:
   - Comprehensive matrix covering 11 escape vectors: `Alt+Tab`, Windows key, Win shortcuts, `Ctrl+Alt+Del`, Task Manager, restart, sign-out, USB storage, second user/RDP, DevTools, and application exit.
   - Documents empirical test outcomes and compensating physical lab controls for hardware-level boundaries.

7. **Lab Staff Recovery Runbook (`docs/kiosk/lab-staff-recovery.md`, `FR-LAB-007`, SRS 11.4)**:
   - Grounded in SRS 11.4 incident handling roles: Lab Staff (first responder) vs Super Admin / Placement Coordinator (decision maker).
   - Standard operating procedures for workstation freeze, BSOD, machine swaps, network drops, and focus alerts.

---

## 2. Files Added or Modified

### Candidate Desktop Application (`apps/candidate-desktop/`):

- `electron/main.ts`: Added dynamic exam lockdown (`setExamActive`), window event listeners (`blur`, `minimize` auto-restore, `close` block), shortcut filter in `before-input-event`, and dynamic allowlist/denylist process scanner.
- `electron/preload.ts`: Exposed typed `setExamActive`, `isExamActive`, `onWindowBlur`, `onWindowMinimize`, `onExitAttempted`, and `onSecurityAlert` in `VeriSyncBridge`.
- `src/types/electron.d.ts`: Maintained typed bridge declarations.
- `src/services/apiClient.ts`: Added `getProhibitedProcessesPolicy()` and `reportIntegrityEvent()` with local rotating audit log integration.
- `src/screens/SystemCheckScreen.tsx`: Updated prohibited applications diagnostics to query API policy and validate running processes.
- `src/screens/ExamScreen.tsx`: Mounted lockdown hooks engaging `setExamActive(true)` on exam entry and registering `blur`/`minimize`/`exit` telemetry handlers.
- `src/tests/lockdown.spec.ts`: Unit tests validating lockdown mode transitions, denylist process scanning, integrity telemetry reporting, and window listener cleanup.

### Kiosk Deployment Automation (`deploy/kiosk/`):

- `Setup-CandidateAccount.ps1`: Automated restricted local user provisioning and hardening.
- `Configure-AssignedAccess.ps1`: Windows Shell Launcher / Assigned Access custom shell configuration.
- `AppLocker-Policy.xml`: AppLocker XML ruleset whitelisting VeriSync and blocking CLI/browsers/scripts.
- `Apply-AppLockerPolicy.ps1`: Service activation (`AppIDSvc`) and AppLocker policy enforcement.
- `Configure-KioskSecurityPolicies.ps1`: OS registry policies and kernel Scancode Map for keyboard lockdown.
- `Setup-ProtectedInstall.ps1`: NTFS ACL permissions hardening and update staging directory creation.
- `LOCKDOWN_GUIDE.md`: IT administration manual for lab workstation deployment and maintenance.
- `README.md`: Updated directory index and asset reference.

### Documentation & Runbooks (`docs/`):

- `docs/kiosk/escape-tests.md`: Formal escape-path test matrix satisfying `TC-18`.
- `docs/kiosk/lab-staff-recovery.md`: Operational incident handling runbook satisfying `FR-LAB-007` and SRS 11.4.
- `docs/PROGRESS.md`: Marked `FR-LAB-007` complete under Section 5.10.

---

## 3. SRS Requirements Traceability

| Requirement ID | Description                   | Implementation Details                                                                           |
| :------------- | :---------------------------- | :----------------------------------------------------------------------------------------------- |
| `FR-LAB-002`   | Unique device identifier      | Persisted app-managed device UUID via `device-identity.json` and `X-Device-Id` header            |
| `FR-LAB-003`   | Client version handshake      | Client version reporting via `X-Client-Version` header with HTTP 426 rejection handling          |
| `FR-LAB-005`   | OS and app kiosk lockdown     | Windows Shell Launcher, AppLocker, and Electron kiosk mode integration                           |
| `FR-LAB-006`   | Security integrity events     | Automated logging and API reporting for focus loss, minimization, shortcuts, and prohibited apps |
| `FR-LAB-007`   | Lab staff recovery runbook    | Documented standard operating procedures for hardware, network, and proctor incidents (SRS 11.4) |
| `FR-LAB-008`   | Multi-layer lockdown controls | 4-layer defense model: Scancode Map + Registry + AppLocker + Custom Shell + Electron             |
| `TC-18`        | Kiosk escape test matrix      | Validated resistance against Alt+Tab, Win keys, Task Manager, restart, USB, and second user      |
| `NFR-SEC-001`  | Isolation boundaries          | Electron `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`                     |
| `NFR-SEC-004`  | Encrypted token storage       | Electron `safeStorage` OS keyring encryption for session tokens                                  |
| `NFR-SEC-005`  | Tamper resistance             | Startup bundle checksum and signature check; strict NTFS DACLs (`icacls`)                        |
| `NFR-MNT-002`  | Strict TypeScript types       | Fully typed preload bridge and IPC channel interfaces                                            |
| `NFR-MNT-005`  | Structured logging            | Local rotating JSON logs (2MB max, 3 files) with automatic secret scrubbing                      |

---

## 4. Verification & Quality Gates

1. **Automated Unit & Integration Tests**:
   - `vitest run`: **105 passed** across **22 test files** (0 failures).
   - `src/tests/lockdown.spec.ts`: **5/5 passed** validating lockdown toggles, denylist scanning, and telemetry reporting.
2. **TypeScript Compilation & Build**:
   - `pnpm --filter @verisync/candidate-desktop run typecheck`: **0 errors**.
   - `pnpm --filter @verisync/candidate-desktop run build`: Successfully built Vite web bundle, `dist-electron/main.js` (11.29 kB), and `dist-electron/preload.js` (1.76 kB).
3. **Prettier Code Formatting**:
   - All newly created files formatted according to project `.prettierrc`.
