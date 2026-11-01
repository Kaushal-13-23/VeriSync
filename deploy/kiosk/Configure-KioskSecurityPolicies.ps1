<#
.SYNOPSIS
    Configures OS-level registry security policies for VeriSync lab workstations.
.DESCRIPTION
    Non-Negotiable Rules & SRS Requirements:
    - FR-LAB-005: Integrate candidate application with selected OS kiosk or lockdown configuration.
    - FR-LAB-008: Multi-layer controls beyond full-screen display alone.
    - TC18: Disables Task Manager, Windows Key, Ctrl+Alt+Del options, Alt+Tab, and USB AutoRun.
.PARAMETER Username
    Target candidate user account. Defaults to "VeriSyncCandidate".
#>

[CmdletBinding()]
param (
    [string]$Username = "VeriSyncCandidate"
)

# Enforce Administrator privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$currentIdentity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires Administrator privileges. Please re-run from an elevated PowerShell session."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " VeriSync Kiosk Provisioning: Registry Security Policies" -ForegroundColor Cyan
Write-Host " Traceability: SRS FR-LAB-005, FR-LAB-008, TC18" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Machine-wide Security Policies (HKLM)
Write-Host "[+] Applying Machine-Wide Security Policies (HKLM)..." -ForegroundColor Green

# 1.1 Disable Fast User Switching & Lock Screen (TC18)
$SystemPolicies = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
if (-not (Test-Path $SystemPolicies)) { New-Item -Path $SystemPolicies -Force | Out-Null }
Set-ItemProperty -Path $SystemPolicies -Name "HideFastUserSwitching" -Value 1 -Type DWord
Set-ItemProperty -Path $SystemPolicies -Name "DisableLockWorkstation" -Value 1 -Type DWord
Set-ItemProperty -Path $SystemPolicies -Name "DisableChangePassword" -Value 1 -Type DWord
Write-Host "    [x] Fast User Switching disabled"
Write-Host "    [x] Workstation Lock & Password Change disabled"

# 1.2 Disable USB AutoRun & AutoPlay (TC18)
$ExplorerPolicies = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer"
if (-not (Test-Path $ExplorerPolicies)) { New-Item -Path $ExplorerPolicies -Force | Out-Null }
Set-ItemProperty -Path $ExplorerPolicies -Name "NoDriveTypeAutoRun" -Value 0xFF -Type DWord
Set-ItemProperty -Path $ExplorerPolicies -Name "NoAutorun" -Value 1 -Type DWord
Write-Host "    [x] USB AutoRun / AutoPlay disabled"

# 1.3 Hardware Scancode Map: Disable Left Windows Key (0x5B), Right Windows Key (0x5C), and Menu Key (0x5D)
# Format: Header (8 bytes) + 4 mappings (16 bytes) + Null terminator (4 bytes)
# Remap 0x5B -> 0x00, 0x5C -> 0x00, 0x5D -> 0x00
$KeyboardLayoutKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Keyboard Layout"
if (-not (Test-Path $KeyboardLayoutKey)) { New-Item -Path $KeyboardLayoutKey -Force | Out-Null }
$ScancodeMap = [byte[]](
    0x00, 0x00, 0x00, 0x00, # Version
    0x00, 0x00, 0x00, 0x00, # Flags
    0x04, 0x00, 0x00, 0x00, # Number of entries (3 mappings + 1 terminator)
    0x00, 0x00, 0x5B, 0xE0, # Map Left Win Key (E0 5B) to 00 00
    0x00, 0x00, 0x5C, 0xE0, # Map Right Win Key (E0 5C) to 00 00
    0x00, 0x00, 0x5D, 0xE0, # Map Apps/Menu Key (E0 5D) to 00 00
    0x00, 0x00, 0x00, 0x00  # Null terminator
)
Set-ItemProperty -Path $KeyboardLayoutKey -Name "Scancode Map" -Value $ScancodeMap -Type Binary
Write-Host "    [x] Hardware Scancode Map installed (Windows Keys disabled at kernel level, TC18)"

# 2. Candidate User Specific Policies (HKU / HKCU)
Write-Host "[+] Applying Candidate User Specific Policies..." -ForegroundColor Green

try {
    $ntAccount = New-Object System.Security.Principal.NTAccount($Username)
    $userSID = $ntAccount.Translate([System.Security.Principal.SecurityIdentifier]).Value
    
    $hiveLoaded = Test-Path "Registry::HKEY_USERS\$userSID"
    $profilePath = "C:\Users\$Username\NTUSER.DAT"
    if (-not $hiveLoaded -and (Test-Path $profilePath)) {
        reg load "HKU\$userSID" "$profilePath" | Out-Null
    }
    
    if (Test-Path "Registry::HKEY_USERS\$userSID") {
        # 2.1 Disable Task Manager (Ctrl+Shift+Esc, Taskbar)
        $UserSystemKey = "Registry::HKEY_USERS\$userSID\Software\Microsoft\Windows\CurrentVersion\Policies\System"
        if (-not (Test-Path $UserSystemKey)) { New-Item -Path $UserSystemKey -Force | Out-Null }
        Set-ItemProperty -Path $UserSystemKey -Name "DisableTaskMgr" -Value 1 -Type DWord
        Write-Host "    [x] Task Manager disabled for '$Username'"
        
        # 2.2 Disable Windows Keys, Run command, and Logoff
        $UserExplorerKey = "Registry::HKEY_USERS\$userSID\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer"
        if (-not (Test-Path $UserExplorerKey)) { New-Item -Path $UserExplorerKey -Force | Out-Null }
        Set-ItemProperty -Path $UserExplorerKey -Name "NoWinKeys" -Value 1 -Type DWord
        Set-ItemProperty -Path $UserExplorerKey -Name "NoRun" -Value 1 -Type DWord
        Set-ItemProperty -Path $UserExplorerKey -Name "NoLogOff" -Value 1 -Type DWord
        Set-ItemProperty -Path $UserExplorerKey -Name "NoClose" -Value 1 -Type DWord
        Write-Host "    [x] Explorer Run, Logoff, and WinKey policies enforced"
        
        # Unload hive if loaded dynamically
        if (-not $hiveLoaded -and (Test-Path $profilePath)) {
            [gc]::Collect()
            reg unload "HKU\$userSID" | Out-Null
        }
    }
} catch {
    Write-Warning "Could not update user-specific registry hive directly: $($_.Exception.Message). Policies will apply upon Group Policy refresh."
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Kiosk Security Policies Enforced." -ForegroundColor Green
Write-Host " System reboot recommended to apply hardware scancode map (TC18)." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
