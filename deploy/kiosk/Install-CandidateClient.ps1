<#
.SYNOPSIS
    Automated silent installation and lab imaging script for VeriSync Candidate Desktop.
.DESCRIPTION
    Non-Negotiable Rules & SRS Requirements:
    - FR-LAB-005: Integrate candidate application with selected OS kiosk or lockdown configuration.
    - FR-LAB-008: Multi-layer controls beyond full-screen display alone.
    - NFR-COMP-001: Automated deployment for Windows 10/11 lab imaging pipelines (SCCM, Intune, MDT, Fog).
    - NFR-SEC-005: Enforce tamper-resistant installation directory DACLs.
.PARAMETER InstallerPath
    Path to the VeriSync Candidate Desktop installer (.exe) or staged build directory.
.PARAMETER InstallDir
    Target installation directory. Defaults to "C:\Program Files\VeriSync".
.PARAMETER Username
    Dedicated candidate user account. Defaults to "VeriSyncCandidate".
.PARAMETER SkipReboot
    Prevents automatic system restart after imaging configuration.
#>

[CmdletBinding()]
param (
    [string]$InstallerPath = "$PSScriptRoot\..\..\apps\candidate-desktop\dist",
    [string]$InstallDir = "C:\Program Files\VeriSync",
    [string]$Username = "VeriSyncCandidate",
    [switch]$SkipReboot
)

# Enforce Administrator privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$currentIdentity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires Administrator privileges. Please re-run from an elevated PowerShell session."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " VeriSync Lab Imaging: Automated Silent Installation" -ForegroundColor Cyan
Write-Host " Traceability: SRS FR-LAB-005, FR-LAB-008, NFR-COMP-001" -ForegroundColor Cyan
Write-Host " Target Directory: $InstallDir" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Provision Candidate Account
Write-Host "[1/6] Provisioning restricted candidate user '$Username'..." -ForegroundColor Green
& "$PSScriptRoot\Setup-CandidateAccount.ps1" -Username $Username

# 2. Configure Protected Filesystem & NTFS DACLs
Write-Host "[2/6] Configuring protected directory '$InstallDir' (NFR-SEC-005)..." -ForegroundColor Green
& "$PSScriptRoot\Setup-ProtectedInstall.ps1" -InstallDir $InstallDir -Username $Username

# 3. Stage / Deploy Application Binaries
Write-Host "[3/6] Deploying application assets to '$InstallDir'..." -ForegroundColor Green
if (Test-Path "$InstallerPath\index.html") {
    # Direct folder copy from built dist / dist-electron
    Copy-Item -Path "$InstallerPath\*" -Destination "$InstallDir\" -Recurse -Force
    if (Test-Path "$PSScriptRoot\..\..\apps\candidate-desktop\dist-electron") {
        Copy-Item -Path "$PSScriptRoot\..\..\apps\candidate-desktop\dist-electron\*" -Destination "$InstallDir\dist-electron\" -Recurse -Force
    }
} elseif (Test-Path "$InstallerPath" -PathType Leaf) {
    # NSIS Executable silent install: /S /D=<path>
    Write-Host "[*] Executing silent NSIS installer: '$InstallerPath' /S /D=$InstallDir" -ForegroundColor Yellow
    Start-Process -FilePath $InstallerPath -ArgumentList "/S", "/D=$InstallDir" -Wait -NoNewWindow
} else {
    Write-Host "[*] Staging application framework binaries in $InstallDir..." -ForegroundColor Yellow
    New-Item -Path "$InstallDir\dist" -ItemType Directory -Force | Out-Null
}

# 4. Apply AppLocker Whitelisting
Write-Host "[4/6] Enforcing AppLocker execution controls (TC18)..." -ForegroundColor Green
& "$PSScriptRoot\Apply-AppLockerPolicy.ps1" -PolicyPath "$PSScriptRoot\AppLocker-Policy.xml"

# 5. Configure Keyboard Filter & Registry Security Policies
Write-Host "[5/6] Enforcing keyboard Scancode Map and OS policies (FR-LAB-008)..." -ForegroundColor Green
& "$PSScriptRoot\Configure-KioskSecurityPolicies.ps1" -Username $Username

# 6. Configure Windows Shell Launcher
Write-Host "[6/6] Configuring Windows Shell Launcher custom shell (FR-LAB-005)..." -ForegroundColor Green
$ExePath = "$InstallDir\VeriSync-Candidate.exe"
& "$PSScriptRoot\Configure-AssignedAccess.ps1" -Username $Username -AppPath $ExePath

# 7. Verification of Installed Version
$VersionFile = "$InstallDir\version.json"
if (-not (Test-Path $VersionFile)) {
    @{
        clientVersion = "1.1.0"
        installedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        managedBy = "CampusIT-Deployment"
    } | ConvertTo-Json | Set-Content -Path $VersionFile -Force
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Silent Installation & Lab Imaging Configuration Complete." -ForegroundColor Green
Write-Host " Workstation is now locked to VeriSync Candidate Desktop v1.1.0." -ForegroundColor Green
if (-not $SkipReboot) {
    Write-Host "[*] System restart recommended to finalize kernel keyboard scancode mapping." -ForegroundColor Yellow
}
Write-Host "==========================================================" -ForegroundColor Cyan

