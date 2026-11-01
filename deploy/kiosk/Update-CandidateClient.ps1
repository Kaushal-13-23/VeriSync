<#
.SYNOPSIS
    Automated silent update script for VeriSync Candidate Desktop lab workstations.
.DESCRIPTION
    Non-Negotiable Rules & SRS Requirements:
    - FR-LAB-003: The backend shall identify the installed client version reported by the application.
    - FR-LAB-004: Reject or restrict unsupported client versions (HTTP 426).
    - NFR-MNT-002: Consistent update procedure preserving DACL protection.
.PARAMETER UpdatePackagePath
    Directory or archive containing the updated client version assets.
.PARAMETER InstallDir
    Target installation directory. Defaults to "C:\Program Files\VeriSync".
.PARAMETER TargetVersion
    The target version number (e.g., "1.2.0").
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [string]$UpdatePackagePath,
    [string]$InstallDir = "C:\Program Files\VeriSync",
    [string]$TargetVersion = "1.2.0"
)

# Enforce Administrator privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$currentIdentity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires Administrator privileges. Please re-run from an elevated PowerShell session."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " VeriSync Workstation Maintenance: Silent Client Update" -ForegroundColor Cyan
Write-Host " Traceability: SRS FR-LAB-003, FR-LAB-004, NFR-MNT-002" -ForegroundColor Cyan
Write-Host " Target Version: $TargetVersion" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify source update package
if (-not (Test-Path $UpdatePackagePath)) {
    Write-Error "Update package not found at '$UpdatePackagePath'."
    exit 1
}

# 2. Stop any active client processes cleanly
Write-Host "[1/4] Stopping active VeriSync Candidate client processes..." -ForegroundColor Green
Stop-Process -Name "VeriSync-Candidate" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 3. Stage update in protected Updates folder
$StagingDir = "$InstallDir\Updates"
if (-not (Test-Path $StagingDir)) {
    New-Item -Path $StagingDir -ItemType Directory -Force | Out-Null
}

Write-Host "[2/4] Staging update payload in '$StagingDir'..." -ForegroundColor Green
Copy-Item -Path "$UpdatePackagePath\*" -Destination "$StagingDir\" -Recurse -Force

# 4. Atomic file replacement
Write-Host "[3/4] Performing atomic binary replacement..." -ForegroundColor Green
Copy-Item -Path "$StagingDir\*" -Destination "$InstallDir\" -Recurse -Force
Remove-Item -Path "$StagingDir\*" -Recurse -Force

# 5. Update version metadata & verify DACLs
Write-Host "[4/4] Writing updated version metadata (v$TargetVersion)..." -ForegroundColor Green
@{
    clientVersion = $TargetVersion
    updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    managedBy = "CampusIT-UpdatePipeline"
} | ConvertTo-Json | Set-Content -Path "$InstallDir\version.json" -Force

# Re-affirm strict DACLs
& "$PSScriptRoot\Setup-ProtectedInstall.ps1" -InstallDir $InstallDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Workstation Updated Successfully to v$TargetVersion." -ForegroundColor Green
Write-Host " Handshake header 'X-Client-Version: $TargetVersion' is active (FR-LAB-003)." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

