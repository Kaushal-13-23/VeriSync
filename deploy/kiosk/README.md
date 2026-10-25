# VeriSync Lab Kiosk & Deployment Configuration (`deploy/kiosk`)

## Ownership

Owned by **Vimal Raj (Dev C)**.

## Role & Responsibilities

This directory contains operating system scripts, security policies, and deployment documentation for lab workstations hosting the VeriSync Candidate Desktop application.

Per **Non-Negotiable Rules** and **SRS FR-LAB-008**:

- Full-screen application display alone is **never** treated as a security guarantee.
- Kiosk lockdown is enforced at both the operating system level and the application runtime level.

---

## Planned Artifacts (Phases 5-7)

1. **PowerShell Kiosk Setup Scripts**:
   - Automated provisioning of a dedicated, restricted local candidate Windows OS account.
   - Configuration of Windows Assigned Access or custom Shell Launcher targeting `VeriSync-Candidate.exe`.
2. **AppLocker / Windows Defender Application Control (WDAC)**:
   - Application execution allowlist blocking unauthorized executables, scripts, and browsers during exams.
3. **OS-Level Keyboard & Shortcut Policy**:
   - Policies disabling Task Manager (`Ctrl+Shift+Esc`, `Ctrl+Alt+Del`), Windows key shortcuts, `Alt+Tab`, and system command prompts.
4. **Lab Imaging & Silent Installation**:
   - Scripted silent installation and uninstallation commands for campus IT administrators.
5. **Escape-Path Test Matrix & Verification**:
   - `docs/kiosk/escape-tests.md`: Test matrix validating behavior against Alt+Tab, Win Key, Task Manager, sleep, reboot, USB insertions, and multi-monitor setups.
6. **Lab Staff Recovery Runbook**:
   - Documented procedure for lab invigilators to restart machines safely and resume candidate sessions seamlessly without resetting running timers (`UC-12`, `FR-LAB-007`).
