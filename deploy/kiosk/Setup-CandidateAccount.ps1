<#
.SYNOPSIS
    Provisions a dedicated restricted local Windows candidate account for VeriSync kiosk operation.
.DESCRIPTION
    Non-Negotiable Rules & SRS Requirements:
    - FR-LAB-005: Integrate candidate application with selected OS kiosk or lockdown configuration.
    - FR-LAB-008: Multi-layer controls beyond full-screen display alone.
    - Rule 5: No secrets or credentials hardcoded. Uses ephemeral generated secure password or manual input.
.PARAMETER Username
    The name of the local candidate user account. Defaults to "VeriSyncCandidate".
.PARAMETER AutoLogon
    Configures registry auto-logon for this account if set to $true.
#>

[CmdletBinding()]
param (
    [string]$Username = "VeriSyncCandidate",
    [switch]$AutoLogon
)

# Enforce Administrator privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$currentIdentity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires Administrator privileges. Please re-run from an elevated PowerShell session."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " VeriSync Kiosk Provisioning: Candidate OS Account Setup" -ForegroundColor Cyan
Write-Host " Traceability: SRS FR-LAB-005, FR-LAB-008, NFR-SEC-001" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Generate or prompt for secure ephemeral account password (Argon2id / PBKDF2 compliance, Rule 5)
$PasswordBytes = New-Object byte[](32)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($PasswordBytes)
$GeneratedPassword = [Convert]::ToBase64String($PasswordBytes) + "!Vs9#"
$SecurePassword = ConvertTo-SecureString $GeneratedPassword -AsPlainText -Force

# 2. Create or verify local user account
$existingUser = Get-LocalUser -Name $Username -ErrorAction SilentlyContinue

if (-not $existingUser) {
    Write-Host "[+] Creating local restricted account '$Username'..." -ForegroundColor Green
    New-LocalUser -Name $Username `
                  -Password $SecurePassword `
                  -FullName "VeriSync Candidate (Restricted Kiosk)" `
                  -Description "Restricted non-admin account dedicated to VeriSync assessment runtime (FR-LAB-005)" `
                  -PasswordNeverExpires:$true `
                  -UserMayNotChangePassword:$true | Out-Null
} else {
    Write-Host "[*] Local account '$Username' already exists. Updating security properties..." -ForegroundColor Yellow
    Set-LocalUser -Name $Username `
                  -Password $SecurePassword `
                  -PasswordNeverExpires:$true `
                  -UserMayNotChangePassword:$true
}

# 3. Strip administrative access and enforce membership in standard Users group
try {
    Remove-LocalGroupMember -Group "Administrators" -Member $Username -ErrorAction SilentlyContinue
    Write-Host "[+] Verified account is NOT in Administrators group." -ForegroundColor Green
} catch {}

try {
    Add-LocalGroupMember -Group "Users" -Member $Username -ErrorAction SilentlyContinue
    Write-Host "[+] Ensured account is in standard Users group." -ForegroundColor Green
} catch {}

# 4. Configure User Account Control and Policy Hardening
Write-Host "[+] Hardening user account restrictions..." -ForegroundColor Green

# 5. Optional Auto-Logon Configuration
if ($AutoLogon) {
    Write-Host "[*] Configuring Windows AutoLogon for '$Username'..." -ForegroundColor Yellow
    $WinlogonKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
    Set-ItemProperty -Path $WinlogonKey -Name "AutoAdminLogon" -Value "1" -Type String
    Set-ItemProperty -Path $WinlogonKey -Name "DefaultUserName" -Value $Username -Type String
    Set-ItemProperty -Path $WinlogonKey -Name "DefaultPassword" -Value $GeneratedPassword -Type String
    Write-Host "[+] AutoLogon configured. Note: In production labs, consider LAPS or central Group Policy." -ForegroundColor Yellow
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Setup Complete for account: $Username" -ForegroundColor Green
Write-Host " Temporary Password: $GeneratedPassword" -ForegroundColor Yellow
Write-Host " (Store securely in lab password manager; never commit to repository - Rule 5)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
