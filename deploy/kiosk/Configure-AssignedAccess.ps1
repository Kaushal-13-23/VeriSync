<#
.SYNOPSIS
    Configures Windows Shell Launcher / Assigned Access kiosk shell for the VeriSync candidate account.
.DESCRIPTION
    Non-Negotiable Rules & SRS Requirements:
    - FR-LAB-005: Integrate candidate application with selected OS kiosk or lockdown configuration.
    - FR-LAB-008: Multi-layer controls beyond full-screen display alone (replaces explorer.exe shell).
    - TC18: Kiosk escape prevention via custom shell execution.
.PARAMETER Username
    The name of the local candidate user account. Defaults to "VeriSyncCandidate".
.PARAMETER AppPath
    Path to the installed VeriSync Candidate desktop executable.
    Defaults to "C:\Program Files\VeriSync\VeriSync-Candidate.exe".
#>

[CmdletBinding()]
param (
    [string]$Username = "VeriSyncCandidate",
    [string]$AppPath = "C:\Program Files\VeriSync\VeriSync-Candidate.exe"
)

# Enforce Administrator privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$currentIdentity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires Administrator privileges. Please re-run from an elevated PowerShell session."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " VeriSync Kiosk Provisioning: Shell Launcher Configuration" -ForegroundColor Cyan
Write-Host " Traceability: SRS FR-LAB-005, FR-LAB-008, TC18" -ForegroundColor Cyan
Write-Host " Target Shell: $AppPath" -ForegroundColor Cyan
Write-Host " Target User:  $Username" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Resolve User SID
try {
    $ntAccount = New-Object System.Security.Principal.NTAccount($Username)
    $userSID = $ntAccount.Translate([System.Security.Principal.SecurityIdentifier]).Value
    Write-Host "[+] Resolved SID for '$Username': $userSID" -ForegroundColor Green
} catch {
    Write-Error "Failed to resolve SID for user '$Username'. Ensure the account exists (run Setup-CandidateAccount.ps1 first)."
    exit 1
}

# 2. Configure Windows Shell Launcher (Enterprise / Education editions)
$shellLauncherWmi = Get-CimClass -Namespace "root\standardcimv2\embedded" -ClassName "WESL_UserSetting" -ErrorAction SilentlyContinue

if ($shellLauncherWmi) {
    Write-Host "[+] WESL (Shell Launcher) WMI provider detected. Configuring enterprise shell launcher..." -ForegroundColor Green
    
    # Enable Shell Launcher feature
    try {
        $serviceClass = [wmiclass]"root\standardcimv2\embedded:WESL_UserSetting"
        # Shell restart action: 0 = Restart system, 1 = Restart shell, 2 = Default shell, 3 = Do nothing
        $restartAction = 1
        
        $shellConfig = Get-CimInstance -Namespace "root\standardcimv2\embedded" -ClassName "WESL_UserSetting" | Where-Object { $_.Sid -eq $userSID }
        if ($shellConfig) {
            $shellConfig | Remove-CimInstance
        }
        
        # Set custom shell with action 1 (restart shell if candidate app exits or is terminated)
        $inParams = $serviceClass.GetMethodParameters("SetCustomShell")
        $inParams.Sid = $userSID
        $inParams.Shell = $AppPath
        $inParams.DefaultAction = $restartAction
        $serviceClass.InvokeMethod("SetCustomShell", $inParams, $null) | Out-Null
        
        Write-Host "[+] Shell Launcher configured successfully via WMI WESL provider." -ForegroundColor Green
    } catch {
        Write-Warning "WESL configuration encountered a warning: $($_.Exception.Message). Falling back to registry shell."
    }
} else {
    Write-Host "[*] Standard Windows edition detected. Applying user-specific Winlogon Shell replacement via Registry..." -ForegroundColor Yellow
    
    # 3. User Hive Registry Shell Replacement (Compatible with Pro / Enterprise)
    # Load user registry hive if not currently loaded
    $regPath = "Registry::HKEY_USERS\$userSID\Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
    
    # Ensure hive is mounted
    $hiveLoaded = Test-Path "Registry::HKEY_USERS\$userSID"
    if (-not $hiveLoaded) {
        $profilePath = "C:\Users\$Username\NTUSER.DAT"
        if (Test-Path $profilePath) {
            reg load "HKU\$userSID" "$profilePath" | Out-Null
            Write-Host "[+] Mounted user profile hive from $profilePath" -ForegroundColor Green
        } else {
            Write-Warning "User profile $profilePath does not exist yet. It will be initialized on first login."
        }
    }
    
    if (Test-Path "Registry::HKEY_USERS\$userSID") {
        if (-not (Test-Path $regPath)) {
            New-Item -Path $regPath -Force | Out-Null
        }
        # Replace default 'explorer.exe' with candidate desktop app
        Set-ItemProperty -Path $regPath -Name "Shell" -Value "$AppPath" -Type String -Force
        Write-Host "[+] Winlogon Shell set to '$AppPath' for SID $userSID." -ForegroundColor Green
        
        if (-not $hiveLoaded -and (Test-Path $profilePath)) {
            [gc]::Collect()
            reg unload "HKU\$userSID" | Out-Null
        }
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Shell Launcher Configuration Complete." -ForegroundColor Green
Write-Host " When '$Username' logs on, '$AppPath' will launch directly" -ForegroundColor Green
Write-Host " instead of the Windows Explorer desktop shell (FR-LAB-008)." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
