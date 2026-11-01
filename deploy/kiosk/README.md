# VeriSync Lab Kiosk & Deployment Configuration (`deploy/kiosk`)

## Ownership

Owned by **Vimal Raj (Dev C)**.

## Role & Responsibilities

This directory contains operating system scripts, security policies, and deployment documentation for lab workstations hosting the VeriSync Candidate Desktop application.

Per **Non-Negotiable Rules** and **SRS FR-LAB-008**:

- Full-screen application display alone is **never** treated as a security guarantee.
- Kiosk lockdown is enforced at both the operating system level and the application runtime level across 4 defense layers.

---

## Implemented Workstation Assets (Phase 6)

1. **`Setup-CandidateAccount.ps1`** (`FR-LAB-005`):
   - Provisions dedicated local restricted Windows account `VeriSyncCandidate`.
   - Strips administrative privileges; enforces local user group membership and non-expiring passwords.
2. **`Setup-ProtectedInstall.ps1`** (`NFR-SEC-005`):
   - Creates `C:\Program Files\VeriSync` and enforces strict NTFS DACLs (`icacls`).
   - Grants read-and-execute to candidates; write and modify access restricted to Administrators and SYSTEM.
   - Configures protected update staging.
3. **`AppLocker-Policy.xml` & `Apply-AppLockerPolicy.ps1`** (`FR-LAB-005`, `FR-LAB-008`, `TC18`):
   - AppLocker execution whitelist blocking `cmd.exe`, `powershell.exe`, `taskmgr.exe`, `regedit.exe`, browsers, and unapproved scripts.
   - Configures and starts the Windows Application Identity service (`AppIDSvc`).
4. **`Configure-KioskSecurityPolicies.ps1`** (`FR-LAB-008`, `TC18`):
   - Registry policies disabling Task Manager, Lock Workstation, Fast User Switching, and USB AutoRun/AutoPlay.
   - Hardware Scancode Map disabling Windows Keys (`LWin`, `RWin`, `Apps`) at the kernel level.
5. **`Configure-AssignedAccess.ps1`** (`FR-LAB-005`, `FR-LAB-008`):
   - Configures Windows Shell Launcher / Assigned Access replacing `explorer.exe` with `VeriSync-Candidate.exe`.
   - Automatically restarts the candidate client if unexpectedly terminated.
6. **`LOCKDOWN_GUIDE.md`**:
   - Comprehensive university IT administration manual covering setup, verification, updates, and lab repurposing.
7. **`docs/kiosk/escape-tests.md`** (`TC18`):
   - Exhaustive 10-vector escape test matrix (Alt+Tab, Win key, Ctrl+Alt+Del, Task Manager, restart, sign-out, USB, second user, multi-monitor, force terminate).
8. **`docs/kiosk/lab-staff-recovery.md`** (`FR-LAB-007`, `SRS 11.4`):
   - Step-by-step incident runbook for lab proctors during hardware freeze, network drop, machine swap, or security alerts.
