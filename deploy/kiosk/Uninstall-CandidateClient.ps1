<#
.SYNOPSIS
    Automated uninstallation and workstation repurposing script for VeriSync Candidate Desktop.
.DESCRIPTION
    Non-Negotiable Rules & SRS Requirements:
    - FR-LAB-005: Clean removal of kiosk policies and restoration of standard Windows desktop shell.
    - NFR-MNT-002: Reversible configuration without registry corruption or stranded files.
.PARAMETER Username
    Dedicated candidate user account to remove or restore. Defaults to "VeriSyncCandidate".
.PARAMETER InstallDir
    Installation directory to delete. Defaults to "C:\Program Files\VeriSync".
.PARAMETER RemoveUser
    Deletes the local Windows user account completely if specified.
#>

[CmdletBinding()]
param (
    [string]$Username = "VeriSyncCandidate",
    [string]$InstallDir = "C:\Program Files\VeriSync",
    [switch]$RemoveUser
)

# Enforce Administrator privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$currentIdentity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires Administrator privileges. Please re-run from an elevated PowerShell session."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " VeriSync Lab Repurposing: Automated Workstation Cleanup" -ForegroundColor Cyan
Write-Host " Traceability: SRS FR-LAB-005, NFR-MNT-002" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Stop active processes
Write-Host "[1/5] Terminating active VeriSync processes..." -ForegroundColor Green
Stop-Process -Name "VeriSync-Candidate" -Force -ErrorAction SilentlyContinue

# 2. Restore Standard Windows Explorer Shell
Write-Host "[2/5] Restoring standard explorer.exe shell for '$Username'..." -ForegroundColor Green
try {
    $ntAccount = New-Object System.Security.Principal.NTAccount($Username)
    $userSID = $ntAccount.Translate([System.Security.Principal.SecurityIdentifier]).Value
    
    $profilePath = "C:\Users\$Username\NTUSER.DAT"
    $hiveLoaded = Test-Path "Registry::HKEY_USERS\$userSID"
    if (-not $hiveLoaded -and (Test-Path $profilePath)) {
        reg load "HKU\$userSID" "$profilePath" | Out-Null
    }
    
    if (Test-Path "Registry::HKEY_USERS\$userSID") {
        $regPath = "Registry::HKEY_USERS\$userSID\Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
        if (Test-Path $regPath) {
            Set-ItemProperty -Path $regPath -Name "Shell" -Value "explorer.exe" -Force
        }
        # Re-enable Task Manager and WinKeys in user hive
        $UserSystemKey = "Registry::HKEY_USERS\$userSID\Software\Microsoft\Windows\CurrentVersion\Policies\System"
        if (Test-Path $UserSystemKey) {
            Remove-ItemProperty -Path $UserSystemKey -Name "DisableTaskMgr" -ErrorAction SilentlyContinue
        }
        $UserExplorerKey = "Registry::HKEY_USERS\$userSID\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer"
        if (Test-Path $UserExplorerKey) {
            Remove-ItemProperty -Path $UserExplorerKey -Name "NoWinKeys" -ErrorAction SilentlyContinue
            Remove-ItemProperty -Path $UserExplorerKey -Name "NoRun" -ErrorAction SilentlyContinue
        }
        
        if (-not $hiveLoaded -and (Test-Path $profilePath)) {
            [gc]::Collect()
            reg unload "HKU\$userSID" | Out-Null
        }
    }
} catch {
    Write-Warning "Could not restore user hive directly: $($_.Exception.Message)"
}

# 3. Remove Hardware Scancode Map
Write-Host "[3/5] Removing kernel keyboard Scancode Map (restoring Windows Keys)..." -ForegroundColor Green
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Keyboard Layout" -Name "Scancode Map" -ErrorAction SilentlyContinue

# 4. Reset AppLocker Policy to Audit Mode
Write-Host "[4/5] Resetting AppLocker enforcement to Audit Only..." -ForegroundColor Green
try {
    $emptyPolicy = "<AppLockerPolicy Version='1'><RuleCollection Type='Exe' EnforcementMode='AuditOnly'/></AppLockerPolicy>"
    Set-AppLockerPolicy -XmlPolicy $emptyPolicy -ErrorAction SilentlyContinue
} catch {}

# 5. Remove Application Directory & Optional Account Deletion
Write-Host "[5/5] Removing application assets from '$InstallDir'..." -ForegroundColor Green
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}

if ($RemoveUser) {
    Write-Host "[*] Deleting local user account '$Username'..." -ForegroundColor Yellow
    Remove-LocalUser -Name $Username -ErrorAction SilentlyContinue
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Workstation Cleanup & Repurposing Complete." -ForegroundColor Green
Write-Host " Windows Explorer, Task Manager, and keyboard shortcuts restored." -ForegroundColor Green
Write-Host " Restart the workstation to apply changes." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

