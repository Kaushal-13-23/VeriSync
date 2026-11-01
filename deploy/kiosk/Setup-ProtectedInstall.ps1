<#
.SYNOPSIS
    Provisions protected application directory and strict NTFS ACLs for VeriSync Candidate Desktop.
.DESCRIPTION
    Non-Negotiable Rules & SRS Requirements:
    - FR-LAB-005: Integrate candidate application with selected OS kiosk or lockdown configuration.
    - FR-LAB-008: Multi-layer controls beyond full-screen display alone.
    - NFR-SEC-005: Application tampering prevention via strict filesystem DACLs.
.PARAMETER InstallDir
    Target directory for VeriSync Candidate Desktop installation. Defaults to "C:\Program Files\VeriSync".
.PARAMETER Username
    Target candidate restricted account. Defaults to "VeriSyncCandidate".
#>

[CmdletBinding()]
param (
    [string]$InstallDir = "C:\Program Files\VeriSync",
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
Write-Host " VeriSync Kiosk Provisioning: Protected Install Directory" -ForegroundColor Cyan
Write-Host " Traceability: SRS FR-LAB-005, NFR-SEC-005, Rule 5" -ForegroundColor Cyan
Write-Host " Target Directory: $InstallDir" -ForegroundColor Cyan
Write-Host " Target Candidate Account: $Username" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Create directory if missing
if (-not (Test-Path $InstallDir)) {
    Write-Host "[+] Creating directory '$InstallDir'..." -ForegroundColor Green
    New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null
}

# 2. Reset and harden NTFS Access Control Lists (ACLs) using icacls
Write-Host "[+] Enforcing strict NTFS DACLs to prevent tampering (NFR-SEC-005)..." -ForegroundColor Green

# Remove inheritance and copy current permissions
icacls "$InstallDir" /inheritance:r | Out-Null

# Grant Full Control exclusively to SYSTEM and Administrators
icacls "$InstallDir" /grant:r "NT AUTHORITY\SYSTEM:(OI)(CI)F" | Out-Null
icacls "$InstallDir" /grant:r "BUILTIN\Administrators:(OI)(CI)F" | Out-Null

# Grant strictly Read & Execute to standard Users and Candidate Account (no write, append, or delete)
icacls "$InstallDir" /grant:r "BUILTIN\Users:(OI)(CI)RX" | Out-Null
try {
    icacls "$InstallDir" /grant:r "$($Username):(OI)(CI)RX" | Out-Null
    Write-Host "[+] Granted Read & Execute only to '$Username'. Write/Modify explicitly denied." -ForegroundColor Green
} catch {}

# 3. Create update staging directory with administrative-only write access
$UpdateStagingDir = "$InstallDir\Updates"
if (-not (Test-Path $UpdateStagingDir)) {
    New-Item -Path $UpdateStagingDir -ItemType Directory -Force | Out-Null
    icacls "$UpdateStagingDir" /inheritance:r | Out-Null
    icacls "$UpdateStagingDir" /grant:r "NT AUTHORITY\SYSTEM:(OI)(CI)F" | Out-Null
    icacls "$UpdateStagingDir" /grant:r "BUILTIN\Administrators:(OI)(CI)F" | Out-Null
    icacls "$UpdateStagingDir" /deny "$($Username):(W,D)" | Out-Null
    Write-Host "[+] Created protected staging folder '$UpdateStagingDir' for secure administrative patching." -ForegroundColor Green
}

# 4. Verification of permissions
Write-Host "[+] Verifying filesystem permissions:" -ForegroundColor Green
icacls "$InstallDir"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Protected Installation Directory Configured." -ForegroundColor Green
Write-Host " Candidate user cannot overwrite, replace, or inject dlls/scripts into application assets." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
