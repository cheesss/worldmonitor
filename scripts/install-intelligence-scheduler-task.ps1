[CmdletBinding()]
param(
  [string]$TaskName = "WorldMonitor-Intelligence-Scheduler",
  [int]$PollMinutes = 5
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runnerPath = (Resolve-Path (Join-Path $PSScriptRoot "run-intelligence-scheduler.ps1")).Path
$powerShellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$startupDir = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs\\Startup"
$startupCmdPath = Join-Path $startupDir ($TaskName + ".cmd")

$taskArguments = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-WindowStyle", "Hidden",
  "-File", ('"{0}"' -f $runnerPath),
  "-PollMinutes", $PollMinutes
) -join " "

$action = New-ScheduledTaskAction -Execute $powerShellPath -Argument $taskArguments -WorkingDirectory $repoRoot
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 5) -ExecutionTimeLimit (New-TimeSpan -Days 3650) -StartWhenAvailable

try {
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  $trigger = New-ScheduledTaskTrigger -AtStartup
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
  Start-ScheduledTask -TaskName $TaskName
  Write-Host ("Installed startup task '{0}' as SYSTEM." -f $TaskName)
} catch {
  Write-Warning ("Failed to install SYSTEM startup task: {0}" -f $_.Exception.Message)
  try {
    $principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Highest
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Write-Host ("Installed logon task '{0}' for {1}." -f $TaskName, $currentUser)
  } catch {
    Write-Warning ("Failed to install current-user logon task: {0}" -f $_.Exception.Message)
    New-Item -ItemType Directory -Force -Path $startupDir | Out-Null
    @(
      "@echo off"
      ('powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -PollMinutes {1}' -f $runnerPath, $PollMinutes)
    ) | Set-Content -Path $startupCmdPath -Encoding ascii
    Start-Process -FilePath $powerShellPath -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", $runnerPath, "-PollMinutes", "$PollMinutes") -WorkingDirectory $repoRoot
    Write-Host ("Installed Startup-folder fallback at '{0}'." -f $startupCmdPath)
  }
}
