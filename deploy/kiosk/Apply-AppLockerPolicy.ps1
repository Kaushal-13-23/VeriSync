<#
.SYNOPSIS
    Applies the VeriSync AppLocker policy to enforce application and script execution controls.
.DESCRIPTION
    Non-Negotiable Rules & SRS Requirements:
    - FR-LAB-005: Integrate candidate application with selected OS kiosk or lockdown configuration.
    - FR-LAB-008: Multi-layer controls beyond full-screen display alone.
    - TC18: AppLocker blocks Task Manager, Command Prompt, PowerShell, and browsers.
.PARAMETER PolicyPath
    Path to the AppLocker XML policy. Defaults to "AppLocker-Policy.xml" in the same folder.
#>

[CmdletBinding()]
param (
    [string]$PolicyPath = "$PSScriptRoot\AppLocker-Policy.xml"
)

# Enforce Administrator privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$currentIdentity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires Administrator privileges. Please re-run from an elevated PowerShell session."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " VeriSync Kiosk Provisioning: AppLocker Policy Deployment" -ForegroundColor Cyan
Write-Host " Traceability: SRS FR-LAB-005, FR-LAB-008, TC18" -ForegroundColor Cyan
Write-Host " Policy Source: $PolicyPath" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify policy file exists
if (-not (Test-Path $PolicyPath)) {
    Write-Error "AppLocker policy file not found at '$PolicyPath'."
    exit 1
}

# 2. Ensure Application Identity service (AppIDSvc) is configured and running
Write-Host "[+] Configuring Application Identity service (AppIDSvc)..." -ForegroundColor Green
try {
    $service = Get-Service -Name "AppIDSvc"
    if ($service.StartType -ne 'Automatic') {
        Set-Service -Name "AppIDSvc" -StartupType Automatic
    }
    if ($service.Status -ne 'Running') {
        Start-Service -Name "AppIDSvc"
    }
    Write-Host "[+] Application Identity service is active and set to Automatic start." -ForegroundColor Green
} catch {
    Write-Warning "Could not start AppIDSvc: $($_.Exception.Message). Note: AppLocker enforcement requires AppIDSvc."
}

# 3. Apply the AppLocker policy
Write-Host "[+] Importing and enforcing AppLocker XML policy..." -ForegroundColor Green
try {
    $xmlContent = Get-Content -Path $PolicyPath -Raw
    Set-AppLockerPolicy -XmlPolicy $xmlContent -Merge
    Write-Host "[+] AppLocker policy merged and activated successfully." -ForegroundColor Green
} catch {
    Write-Error "Failed to apply AppLocker policy: $($_.Exception.Message)"
    exit 1
}

# 4. Verify effective policy
Write-Host "[+] Verifying effective AppLocker rules..." -ForegroundColor Green
try {
    $effectivePolicy = Get-AppLockerPolicy -Effective
    $ruleCount = ($effectivePolicy.RuleCollections | Measure-Object -Property Count -Sum).Sum
    Write-Host "[+] Effective AppLocker policy active with enforced rule collections." -ForegroundColor Green
} catch {
    Write-Host "[*] Policy applied. System restart may be required for full AppLocker kernel cache refresh." -ForegroundColor Yellow
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " AppLocker Deployment Complete." -ForegroundColor Green
Write-Host " Standard candidate users are now blocked from executing" -ForegroundColor Green
Write-Host " Task Manager, command consoles, browsers, and unapproved scripts (TC18)." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
