[CmdletBinding()]
param(
  [switch]$Once,
  [int]$PollMinutes = 5,
  [string]$RegistryPath,
  [string]$StatePath,
  [string]$EnvFile = ".env.local"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logRoot = Join-Path $repoRoot "data\\automation\\logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

function Import-SimpleEnvFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $separator = $line.IndexOf("=")
    if ($separator -lt 1) {
      return
    }

    $name = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    Set-Item -Path ("Env:{0}" -f $name) -Value $value
  }
}

Import-SimpleEnvFile -Path (Join-Path $repoRoot $EnvFile)
Import-SimpleEnvFile -Path (Join-Path $repoRoot ".env")

$nodeCommand = Get-Command node -ErrorAction Stop
$nodePath = $nodeCommand.Source

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stdoutPath = Join-Path $logRoot "scheduler-$timestamp.out.log"
$stderrPath = Join-Path $logRoot "scheduler-$timestamp.err.log"

$arguments = @("--import", "tsx", "scripts/intelligence-scheduler.mjs")
if ($Once) {
  $arguments += "--once"
} else {
  $arguments += @("--poll", "$PollMinutes")
}
if ($RegistryPath) {
  $arguments += @("--registry", $RegistryPath)
}
if ($StatePath) {
  $arguments += @("--state", $StatePath)
}

Set-Location $repoRoot
"[$([DateTime]::UtcNow.ToString('o'))] starting intelligence scheduler ($($arguments -join ' '))" | Out-File -FilePath $stdoutPath -Encoding utf8 -Append

& $nodePath @arguments 1>> $stdoutPath 2>> $stderrPath
