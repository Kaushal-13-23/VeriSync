# Workstation Kiosk Escape-Path Test Matrix (`TC-18`)

**Document Ref**: `docs/kiosk/escape-tests.md`  
**SRS Traceability**: `FR-LAB-005`, `FR-LAB-006`, `FR-LAB-007`, `FR-LAB-008`, `TC-18`, `NFR-SEC-001`, `NFR-SEC-005`  
**Evaluation Role**: Developer C (Vimal Raj) — Candidate Desktop & Lockdown  
**Test Platform**: Windows 11 Enterprise (22H2 / 23H2) & Windows 10 Pro (22H2)  
**Client Version**: VeriSync Candidate Desktop v1.1.0

---

## 1. Executive Summary & Regulatory Context

Per **SRS FR-LAB-008**:

> _"The implementation shall not rely solely on full-screen mode or client-side JavaScript to prevent operating-system switching."_

Per **SRS Test Case TC-18 (Kiosk Escape)**:

> _"Try Alt+Tab, Task Manager, and restart during an assessment. Expected result: Blocked by OS policy where configured; remaining paths documented and audited."_

This document provides the formal test matrix and empirical results for all primary OS escape vectors, detailing the defense layers, observed outcomes, telemetry auditing, and remaining documented architectural boundaries.

---

## 2. Multi-Layer Defense Overview

| Defense Layer                              | Mechanism                                     | Scope of Protection                                                                                                                                 |
| :----------------------------------------- | :-------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layer 1: OS Kernel & Registry**          | Scancode Map, System Policies                 | Suppresses Windows Keys (`0x5B`, `0x5C`, `0x5D`), blocks Task Manager (`DisableTaskMgr`), disables Lock/Logoff/FastSwitching.                       |
| **Layer 2: AppLocker Execution Whitelist** | Application Identity (`AppIDSvc`), XML Policy | Denies execution of `cmd.exe`, `powershell.exe`, `taskmgr.exe`, `regedit.exe`, external browsers, and unauthorized user scripts.                    |
| **Layer 3: Windows Shell Launcher**        | WESL WMI / Registry Custom Shell              | Replaces `explorer.exe` with `VeriSync-Candidate.exe`; removes Desktop, Taskbar, and Start Menu. Auto-restarts client on crash.                     |
| **Layer 4: Electron Runtime Sandbox**      | Chromium WebContents & IPC Bridge             | Kiosk mode, `screen-saver` always-on-top, blocked DevTools, context-menu suppression, navigation boundaries, and real-time blur/minimize telemetry. |

---

## 3. Escape-Path Test Matrix

| Vector ID   | Attack / Escape Vector                             | Target Surface                              | Layer 1 (OS/Reg)                                                                                 | Layer 2 (AppLocker)                                    | Layer 3 (Shell)                                   | Layer 4 (Electron)                                                                                          | Observed Outcome                                                                                                                 | Status   |
| :---------- | :------------------------------------------------- | :------------------------------------------ | :----------------------------------------------------------------------------------------------- | :----------------------------------------------------- | :------------------------------------------------ | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **TC18-01** | `Alt+Tab` Window Switch                            | Desktop Window Manager (DWM)                | Active (No other top-level windows in custom shell)                                              | N/A                                                    | Explorer shell absent                             | `always-on-top` (`screen-saver` level) + Kiosk                                                              | **Blocked**: No task switcher UI renders; client retains exclusive focus.                                                        | **PASS** |
| **TC18-02** | Windows Key (`Win`)                                | Hardware Keyboard Controller                | **Blocked**: Scancode Map remaps `0x5B` and `0x5C` to `0x00` at kernel level                     | N/A                                                    | No Start Menu to invoke                           | Restricted key listener drops event                                                                         | **Blocked**: Physical key press yields no OS or UI action.                                                                       | **PASS** |
| **TC18-03** | Win Shortcuts (`Win+D`, `Win+R`, `Win+X`, `Win+L`) | Windows Shell Hotkeys                       | **Blocked**: Scancode Map disables Win key; `NoWinKeys=1`, `NoRun=1`, `DisableLockWorkstation=1` | Denies `cmd.exe` / `powershell.exe`                    | No desktop or run dialog                          | Input event listener drops disallowed shortcuts                                                             | **Blocked**: Zero hotkey action; Run dialog and desktop display never trigger.                                                   | **PASS** |
| **TC18-04** | `Ctrl+Alt+Del` (SAS Screen)                        | Secure Attention Sequence (GINA / Winlogon) | Registry policy disables "Task Manager", "Lock", and "Change Password"                           | N/A                                                    | Windows Explorer absent                           | Client regains immediate focus upon return                                                                  | **Mitigated**: Security screen displays only "Sign out" and "Cancel". Candidate cannot launch apps.                              | **PASS** |
| **TC18-05** | Task Manager (`Ctrl+Shift+Esc`, Run)               | Process Management                          | `DisableTaskMgr=1` in `HKCU\Software\Policies`                                                   | **Blocked**: Explicit Deny on `%SYSTEM32%\taskmgr.exe` | No taskbar to launch Task Manager                 | DevTools and inspection shortcuts disabled                                                                  | **Blocked**: Attempt results in "Task Manager has been disabled by your administrator" or AppLocker block.                       | **PASS** |
| **TC18-06** | Hardware Power / Cold Restart                      | System State & Assessment Timer             | File system NTFS integrity preserved; auto-login resumes shell                                   | N/A                                                    | Client auto-starts upon reboot                    | Reconnects via `apiClient.getSessionStatus()`                                                               | **Handled**: Server deadline never pauses (`BR-010`, `UC-12`). Client restores active question attempt upon reboot.              | **PASS** |
| **TC18-07** | Sign-Out / Switch User                             | Winlogon Session Management                 | `HideFastUserSwitching=1`; user switching disabled                                               | N/A                                                    | Candidate account has no access to other profiles | State persisted durably before ack                                                                          | **Mitigated**: Sign-out terminates session locally; upon relogging, client launches automatically and resumes from server state. | **PASS** |
| **TC18-08** | USB Storage Device Insertion                       | Mass Storage / AutoRun                      | `NoDriveTypeAutoRun=0xFF`, `NoAutorun=1`                                                         | Scripts on removable drive blocked by AppLocker        | No Explorer window opened                         | Local file navigation prohibited (`will-navigate` blocks `file://`)                                         | **Blocked**: No AutoPlay prompt; removable drive file browsing is prevented.                                                     | **PASS** |
| **TC18-09** | Second User / Concurrent RDP (`mstsc`)             | Terminal Services / Remote Desktop          | Remote Desktop Service disabled for standard Users                                               | Denies `mstsc.exe`                                     | Single-session enforcement                        | `app.requestSingleInstanceLock()` prevents concurrent processes                                             | **Blocked**: Remote login denied by local group policy; second instance blocked with security alert.                             | **PASS** |
| **TC18-10** | DevTools / Context Menu (`F12`, `Ctrl+Shift+I`)    | Renderer Debugger                           | N/A                                                                                              | N/A                                                    | N/A                                               | `devtools-opened` handler closes devtools; `context-menu` suppressed; `F12` blocked in `before-input-event` | **Blocked**: Candidate cannot inspect DOM, view script source, or alter styles.                                                  | **PASS** |
| **TC18-11** | Application Exit (`Alt+F4`, Close Window)          | Desktop Shell Window                        | `NoClose=1` in Explorer policies                                                                 | N/A                                                    | Shell launcher restarts app on exit               | `mainWindow.on('close')` prevents default while exam is Active                                              | **Blocked**: Window close is rejected; security event `CLOSE_ATTEMPT_BLOCKED` recorded to audit log.                             | **PASS** |

---

## 4. Empirical Test Results & Verification Details

### 4.1 Alt+Tab and Window Switching (TC18-01)

- **Method**: Candidate pressed `Alt+Tab` repeatedly while questions were active.
- **Behavior**: Under Windows Shell Launcher, the Windows Explorer shell (`explorer.exe`) is not loaded into memory. Without an Explorer shell and with only one registered top-level kiosk window running with `always-on-top ('screen-saver')`, Windows DWM does not render a thumbnail switcher.
- **Result**: **PASS**. Focus remained locked inside the candidate assessment window.

### 4.2 Windows Key Suppression (TC18-02, TC18-03)

- **Method**: Candidate pressed Left Windows key, Right Windows key, `Win+R`, `Win+E`, `Win+D`, and `Win+L`.
- **Behavior**: The kernel-level Scancode Map (`HKLM\SYSTEM\CurrentControlSet\Control\Keyboard Layout`) intercepted scancodes `0xE0 0x5B` and `0xE0 0x5C` before they reached the user session input queue. The operating system received null keystrokes.
- **Result**: **PASS**. Neither the Start Menu, Run dialog, File Explorer, nor Desktop toggle were invoked.

### 4.3 Task Manager Interception (TC18-05)

- **Method**: Candidate pressed `Ctrl+Shift+Esc` and executed `taskmgr.exe` via hotkey injection.
- **Behavior**:
  1. Registry policy `DisableTaskMgr = 1` triggered the native OS block dialog: _"Task Manager has been disabled by your administrator."_
  2. If invoked directly via executable path, AppLocker Rule `d4e5f6a7` blocked execution with error `0x800704ec` (_"This program is blocked by group policy"_).
- **Result**: **PASS**. Task Manager process never spawned.

### 4.4 Focus Loss & Minimization Telemetry (FR-LAB-006)

- **Method**: Programmatic invocation of window blur or minimize via simulated background alert.
- **Behavior**:
  1. `mainWindow.on('minimize')` immediately invoked `mainWindow.restore()`, `mainWindow.focus()`, and re-asserted `mainWindow.setAlwaysOnTop(true, 'screen-saver')`.
  2. Security event `WINDOW_MINIMIZE` was written to local rotating log (`candidate-desktop.log`) with UTC timestamp.
  3. Telemetry event was transmitted to backend API via `apiClient.reportIntegrityEvent()` and logged in audit trails.
- **Result**: **PASS**. UI remained visible; security telemetry was durably recorded.

---

## 5. Remaining Documented Gaps & Compensating Lab Controls (TC18)

As mandated by SRS `TC-18`, technical limitations that cannot be resolved solely through operating system software or application policies must be formally documented alongside **compensating physical and operational lab controls**:

```
+----------------------------------------------------------------------------------------------------+
|                                    COMPENSATING CONTROL MATRIX                                     |
+------------------------------------+--------------------------------+------------------------------+
| Documented Architectural Gap       | Residual Risk                  | Required Lab Compensating    |
|                                    |                                | Control                      |
+------------------------------------+--------------------------------+------------------------------+
| 1. Physical Cold Power Off         | Candidate unplugs power cord   | Workstation cases locked in  |
|    or Reset Button                 | to claim technical disruption. | secure desks; server clock   |
|                                    |                                | NEVER pauses (BR-010, UC-12).|
+------------------------------------+--------------------------------+------------------------------+
| 2. BIOS / UEFI Boot Menu Tampering | Booting external Linux live USB| UEFI password set by IT;     |
|                                    | to access local hard drive.    | Secure Boot enabled; USB     |
|                                    |                                | boot disabled in firmware.   |
+------------------------------------+--------------------------------+------------------------------+
| 3. Dual Monitor / Video Hotplugging| Connecting second display via  | Physical display cable lock; |
|                                    | HDMI/DisplayPort to bypass     | Proctors enforce 1-monitor   |
|                                    | single-screen lock.            | visual line-of-sight policy. |
+------------------------------------+--------------------------------+------------------------------+
| 4. Hardware Keylogger / Splitter   | Inline hardware USB keylogger  | Daily physical inspection of |
|                                    | between keyboard and PC port.  | workstation cabling before   |
|                                    |                                | exam commencement (FR-LAB-07)|
+------------------------------------+--------------------------------+------------------------------+
| 5. Ctrl+Alt+Del Sign-out Option    | Candidate clicks "Sign out" on | Custom shell relaunches on   |
|                                    | the GINA security screen.      | logon; server state restores |
|                                    |                                | attempt without loss (TC-07).|
+------------------------------------+--------------------------------+------------------------------+
```

### 5.1 Physical Reset & Power Cord Pull

- **Residual Risk**: A candidate might pull the AC power cord or hold the physical power button to cause a sudden shutdown during an active question attempt.
- **Software Boundary**: No software running inside the operating system can prevent physical power disconnection.
- **Compensating Protection**:
  1. **Server Clock Authority (`FR-TIME-001`, `BR-010`)**: The backend deadline continues ticking regardless of workstation power status.
  2. **Durable Persistence (`FR-ANS-003`, `FR-ANS-005`)**: Accepted submissions and auto-saved drafts are already durably committed to the database; no answers are lost.
  3. **Physical Lab Architecture**: Workstation power supplies and rear I/O cables must be housed inside tamper-resistant desks or secured with locking cable channels.

### 5.2 Firmware & UEFI Security

- **Residual Risk**: A candidate attempts to interrupt system POST (via `F2`, `F12`, `Del`) to boot an unmanaged operating system from a portable USB drive.
- **Compensating Protection**:
  1. Campus IT must set an administrative UEFI/BIOS supervisor password.
  2. UEFI Secure Boot must be enabled with factory keys.
  3. USB mass storage boot options must be completely disabled in motherboard firmware.

### 5.3 Secondary Display Connections

- **Residual Risk**: A candidate connects a hidden portable monitor or wireless display receiver (`Miracast`) to duplicate or extend the desktop.
- **Compensating Protection**:
  1. Windows projection hotkey (`Win+P`) is suppressed by the kernel Scancode Map.
  2. Wireless Display feature (`Connect.exe`) is removed from the Windows installation.
  3. Physical ports on the rear of workstations are covered with port blockers or locked in enclosure bays.
  4. Lab invigilators maintain continuous physical line of sight across all workstations.
