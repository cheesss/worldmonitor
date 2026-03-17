[CmdletBinding()]
param(
  [string]$TaskName = "WorldMonitor-Intelligence-Scheduler"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$startupDir = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs\\Startup"
$startupCmdPath = Join-Path $startupDir ($TaskName + ".cmd")

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host ("Removed scheduled task '{0}'." -f $TaskName)
} else {
  Write-Host ("Scheduled task '{0}' does not exist." -f $TaskName)
}

if (Test-Path $startupCmdPath) {
  Remove-Item -Force $startupCmdPath
  Write-Host ("Removed Startup fallback '{0}'." -f $startupCmdPath)
}
