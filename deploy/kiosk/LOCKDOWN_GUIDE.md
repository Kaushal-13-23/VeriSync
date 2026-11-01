# VeriSync Workstation Lockdown & Kiosk Deployment Guide

**Audience**: Lab Administrators, Campus Systems Engineers, and Technical Invigilators  
**Version**: 1.1.0  
**Traceability**: SRS Section 5.10 (`FR-LAB-001` through `FR-LAB-008`), `TC-18`, `NFR-SEC-001`, `NFR-SEC-005`

---

## 1. Overview & Multi-Layer Defense Architecture

Per **SRS FR-LAB-008**, the VeriSync platform **never relies solely on full-screen display or client-side JavaScript** to isolate the candidate environment. Full workstation lockdown is enforced across four distinct operational layers:

```
+-------------------------------------------------------------------------+
| Layer 4: Electron Runtime Security                                      |
| - Kiosk mode, screen-saver always-on-top, single instance lock          |
| - Context menu disabled, DevTools disabled, new windows/popups denied   |
| - Telemetry reporting: focus loss (blur), minimization, exit attempts   |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
| Layer 3: Windows Shell Launcher / Assigned Access                       |
| - Custom shell replaces explorer.exe with VeriSync-Candidate.exe        |
| - Zero taskbar, zero Start Menu, zero desktop icons                     |
| - Automatic process restart if the candidate client crashes             |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
| Layer 2: AppLocker / WDAC Application Execution Whitelist               |
| - Explicit Deny: cmd.exe, powershell.exe, taskmgr.exe, regedit.exe      |
| - Explicit Deny: Chrome, Firefox, Edge, Brave                           |
| - Script rules: All .bat, .cmd, .ps1, .vbs execution blocked for users  |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
| Layer 1: OS Kernel & Registry Policies                                  |
| - Hardware Scancode Map: Windows Keys (LWin, RWin, Apps) disabled       |
| - Registry Policies: DisableTaskMgr, DisableLockWorkstation             |
| - USB AutoRun / AutoPlay blocked; Fast User Switching suppressed        |
| - Strict NTFS DACLs: Write & Delete prohibited on application assets    |
+-------------------------------------------------------------------------+
```

---

## 2. Workstation Prerequisites

- **Operating System**: Windows 10 (21H2 or later) or Windows 11 (22H2 or later) — Pro, Enterprise, or Education editions (64-bit).
- **Execution Environment**: PowerShell 5.1 or PowerShell 7+ running with local Administrator privileges.
- **Hardware Requirements**:
  - Minimum 4 GB RAM (8 GB recommended)
  - 2 GB available disk space in `C:\Program Files\VeriSync`
  - Wired Gigabit Ethernet or enterprise 802.1X Wi-Fi
- **Firewall Egress**: Outbound HTTPS (`TCP 443`) to the VeriSync backend API cluster.

---

## 3. Step-by-Step Lab Provisioning

Run all commands from an **elevated Administrator PowerShell session**.

### Fast Path: One-Command Automated Silent Imaging Pipeline

To deploy the full lockdown suite in a single command during lab imaging (MDT, SCCM, Fog, or manual provisioning):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\deploy\kiosk\Install-CandidateClient.ps1 -InstallerPath "C:\DeploymentShare\VeriSync-Setup.exe" -InstallDir "C:\Program Files\VeriSync"
```

### Granular Step-by-Step Pipeline

#### Step 1: Provision the Restricted Candidate Account

Creates a restricted local user (`VeriSyncCandidate`), generates a secure non-expiring password, and strips administrative privileges:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\deploy\kiosk\Setup-CandidateAccount.ps1 -Username "VeriSyncCandidate"
```

### Step 2: Provision Protected Install Directory & NTFS Permissions

Creates `C:\Program Files\VeriSync` with read-and-execute permissions for the candidate user, strictly preventing binary tampering or DLL injection (`NFR-SEC-005`):

```powershell
.\deploy\kiosk\Setup-ProtectedInstall.ps1 -InstallDir "C:\Program Files\VeriSync" -Username "VeriSyncCandidate"
```

### Step 3: Stage Application Binaries

Copy the built VeriSync Candidate Desktop distribution (`dist-electron` and packed assets) to `C:\Program Files\VeriSync`:

```powershell
Copy-Item -Path ".\apps\candidate-desktop\dist\*" -Destination "C:\Program Files\VeriSync\" -Recurse -Force
```

### Step 4: Apply AppLocker Execution Policies

Configures the Application Identity service (`AppIDSvc`) and enforces strict process and script execution whitelisting:

```powershell
.\deploy\kiosk\Apply-AppLockerPolicy.ps1 -PolicyPath ".\deploy\kiosk\AppLocker-Policy.xml"
```

### Step 5: Enforce Keyboard, Registry, and USB Policies

Disables Task Manager (`Ctrl+Shift+Esc`), installs the hardware Scancode Map blocking the Windows keys, and disables USB AutoRun:

```powershell
.\deploy\kiosk\Configure-KioskSecurityPolicies.ps1 -Username "VeriSyncCandidate"
```

### Step 6: Configure Windows Shell Launcher

Replaces the standard Windows shell (`explorer.exe`) with `VeriSync-Candidate.exe` for the candidate account:

```powershell
.\deploy\kiosk\Configure-AssignedAccess.ps1 -Username "VeriSyncCandidate" -AppPath "C:\Program Files\VeriSync\VeriSync-Candidate.exe"
```

### Step 7: Restart Workstation

Restart the lab computer to flush kernel caches and activate the keyboard scancode map:

```powershell
Restart-Computer -Force
```

---

## 4. Verification & Audit Checklist

Before opening the lab to candidates, run through the verification checklist:

| Verification Step | Key Combination / Action             | Expected Result                                                                | Pass/Fail |
| :---------------- | :----------------------------------- | :----------------------------------------------------------------------------- | :-------- |
| Shell Check       | Log in as `VeriSyncCandidate`        | VeriSync launches immediately; no desktop, taskbar, or Start Menu              | [ ]       |
| Windows Key       | Press `Win` key                      | Completely suppressed by hardware Scancode Map                                 | [ ]       |
| Shortcut Combos   | Press `Win+D`, `Win+R`, `Win+E`      | No response; Run dialog and Explorer do not open                               | [ ]       |
| Task Manager      | Press `Ctrl+Shift+Esc`               | "Task Manager has been disabled by your administrator" or blocked by AppLocker | [ ]       |
| DevTools Bypass   | Press `F12`, `Ctrl+Shift+I`          | Suppressed; developer tools console does not appear                            | [ ]       |
| Window Switching  | Press `Alt+Tab`                      | No task switcher renders (single active shell)                                 | [ ]       |
| Context Menu      | Right-click anywhere in application  | Suppressed; no context menu appears                                            | [ ]       |
| USB Insertion     | Insert test USB flash drive          | No AutoPlay popup; access blocked by policy                                    | [ ]       |
| Exit Attempt      | Press `Alt+F4` or click close button | Close prevented while exam is active; security warning displayed               | [ ]       |

---

## 5. Protected Update Procedure

Per **SRS FR-LAB-003** and **NFR-MNT-002**, client updates must be deployed without exposing write access to candidate accounts:

### Automated Scripted Update:

```powershell
.\deploy\kiosk\Update-CandidateClient.ps1 -UpdatePackagePath "C:\DeploymentShare\v1.2.0" -TargetVersion "1.2.0"
```

### Manual Staging Procedure:

1. **Staging**: An elevated SCCM/Intune job or lab administrator copies new package files to `C:\Program Files\VeriSync\Updates`.
2. **Integrity Validation**: Administrator verifies package hash and signature.
3. **Atomic Replacement**:
   ```powershell
   Stop-Process -Name "VeriSync-Candidate" -Force -ErrorAction SilentlyContinue
   Copy-Item -Path "C:\Program Files\VeriSync\Updates\*" -Destination "C:\Program Files\VeriSync\" -Recurse -Force
   Remove-Item -Path "C:\Program Files\VeriSync\Updates\*" -Recurse -Force
   ```
4. **Validation**: Version verification check confirms version bump (e.g., `1.1.0` -> `1.2.0`).

---

## 6. Workstation Rollback & Lab Repurposing

To restore a lab workstation to a general-purpose academic desktop environment:

### Automated Cleanup Script:

```powershell
.\deploy\kiosk\Uninstall-CandidateClient.ps1 -Username "VeriSyncCandidate" -RemoveUser
```

### Manual Repurposing Steps:

1. Log in as local Administrator.
2. Restore standard `explorer.exe` shell for the candidate account:
   ```powershell
   $userSID = (New-Object System.Security.Principal.NTAccount("VeriSyncCandidate")).Translate([System.Security.Principal.SecurityIdentifier]).Value
   Set-ItemProperty -Path "Registry::HKEY_USERS\$userSID\Software\Microsoft\Windows NT\CurrentVersion\Winlogon" -Name "Shell" -Value "explorer.exe" -Force
   ```
3. Remove hardware Scancode Map:
   ```powershell
   Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Keyboard Layout" -Name "Scancode Map" -ErrorAction SilentlyContinue
   ```
4. Clear AppLocker rules or set enforcement to Audit:
   ```powershell
   Set-AppLockerPolicy -XmlPolicy "<AppLockerPolicy Version='1'><RuleCollection Type='Exe' EnforcementMode='AuditOnly'/></AppLockerPolicy>"
   ```
5. Restart computer:
   ```powershell
   Restart-Computer -Force
   ```
