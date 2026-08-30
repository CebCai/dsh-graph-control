[CmdletBinding()]
param(
  [string]$Ref,
  [string]$NodeVersion = '24.19.0',
  [string]$NodeExecutable
)

$ErrorActionPreference = 'Stop'

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$upstreamRoot = Join-Path $workspaceRoot '.upstream\deepseek-harness'
$toolsRoot = Join-Path $workspaceRoot '.tools'
$officialRepository = 'https://github.com/deepseek-ai/deepseek-harness.git'

function Resolve-LatestOfficialRelease {
  $headers = @{ 'User-Agent' = 'dsh-graph-control-bootstrap' }
  $response = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri 'https://github.com/deepseek-ai/deepseek-harness/releases.atom' `
    -Headers $headers
  [xml]$feed = $response.Content
  $releaseLink = @($feed.feed.entry)[0].link |
    Where-Object { [string]$_.href -match '/releases/tag/(dsh-v[^/]+)$' } |
    Select-Object -First 1
  if ($null -eq $releaseLink) {
    throw 'The official DeepSeek Harness release feed returned no published dsh release.'
  }
  $tag = [Uri]::UnescapeDataString(([string]$releaseLink.href -split '/')[-1])
  $remoteTag = & git ls-remote --tags --refs $officialRepository "refs/tags/$tag"
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($remoteTag -join ''))) {
    throw "The published official DeepSeek Harness tag cannot be resolved: $tag"
  }
  return $tag
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory)] [string]$Executable,
    [Parameter(Mandatory)] [string[]]$Arguments
  )

  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Executable exited with code $LASTEXITCODE"
  }
}

if ([string]::IsNullOrWhiteSpace($NodeExecutable)) {
  $runtimeName = "node-v$NodeVersion-win-x64"
  $runtimeRoot = Join-Path $toolsRoot $runtimeName
  $NodeExecutable = Join-Path $runtimeRoot 'node.exe'

  if (-not (Test-Path -LiteralPath $NodeExecutable)) {
    New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
    $archivePath = Join-Path $toolsRoot "$runtimeName.zip"
    $downloadUrl = "https://nodejs.org/dist/v$NodeVersion/$runtimeName.zip"
    Write-Host "Downloading Node $NodeVersion from $downloadUrl"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
    Expand-Archive -LiteralPath $archivePath -DestinationPath $toolsRoot -Force
  }
}

$NodeExecutable = (Resolve-Path -LiteralPath $NodeExecutable).Path
$previousNodeOptions = $env:NODE_OPTIONS
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
$nodeVersionText = (& $NodeExecutable --version).Trim()
$nodeMatch = [regex]::Match($nodeVersionText, '^v?(\d+)\.(\d+)\.(\d+)')
if (-not $nodeMatch.Success) {
  throw "Cannot parse Node version: $nodeVersionText"
}
$nodeMajor = [int]$nodeMatch.Groups[1].Value
$nodeMinor = [int]$nodeMatch.Groups[2].Value
if (-not (($nodeMajor -eq 22 -and $nodeMinor -ge 19) -or $nodeMajor -ge 24)) {
  throw "Official DSH requires Node ^22.19.0 or >=24.0.0; selected $nodeVersionText"
}

$useLatestRelease = [string]::IsNullOrWhiteSpace($Ref)
$resolvedRef = if ($useLatestRelease) {
  Resolve-LatestOfficialRelease
} else {
  $Ref
}
Write-Host "Selected official DeepSeek Harness release: $resolvedRef"

if (-not (Test-Path -LiteralPath $upstreamRoot)) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $upstreamRoot) -Force | Out-Null
  Invoke-Checked -Executable 'git' -Arguments @(
    'clone', '--filter=blob:none', $officialRepository, $upstreamRoot
  )
}

if ($useLatestRelease) {
  $tagRef = "refs/tags/$resolvedRef"
  Invoke-Checked -Executable 'git' -Arguments @(
    '-C', $upstreamRoot, 'fetch', 'origin', "$tagRef`:$tagRef", '--depth=1'
  )
  Invoke-Checked -Executable 'git' -Arguments @('-C', $upstreamRoot, 'switch', '--detach', $resolvedRef)
} else {
  Invoke-Checked -Executable 'git' -Arguments @('-C', $upstreamRoot, 'fetch', 'origin', $resolvedRef, '--depth=1')
  Invoke-Checked -Executable 'git' -Arguments @('-C', $upstreamRoot, 'switch', '--detach', 'FETCH_HEAD')
}

$corepack = Join-Path (Split-Path -Parent $NodeExecutable) 'corepack.cmd'
if (-not (Test-Path -LiteralPath $corepack)) {
  throw "corepack.cmd is missing beside the selected Node runtime: $corepack"
}

$previousCi = $env:CI
$previousPath = $env:PATH
$env:CI = 'true'
$env:PATH = "$(Split-Path -Parent $NodeExecutable);$previousPath"
Push-Location $upstreamRoot
try {
  Invoke-Checked -Executable $corepack -Arguments @('pnpm', 'install', '--frozen-lockfile')
  # Reused checkouts can retain ignored outputs from packages removed by a newer release.
  # The official cleaner is bounded to known generated paths and refuses unknown content.
  Invoke-Checked -Executable $corepack -Arguments @('pnpm', 'run', 'clean')
  Invoke-Checked -Executable $corepack -Arguments @('pnpm', 'run', 'build:official')

  $cliEntry = Join-Path $upstreamRoot 'apps\cli\lib\bin.js'
  if (-not (Test-Path -LiteralPath $cliEntry)) {
    throw "Official DSH build did not produce $cliEntry"
  }
  $cliVersion = (& $NodeExecutable $cliEntry --version).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw 'Built DSH CLI version probe failed.'
  }
  if ($resolvedRef -like 'dsh-v*' -and $cliVersion -ne $resolvedRef.Substring(5)) {
    throw "Built DSH CLI version $cliVersion does not match release $resolvedRef"
  }
} finally {
  Pop-Location
  $env:CI = $previousCi
  $env:PATH = $previousPath
  if ([string]::IsNullOrEmpty($previousNodeOptions)) {
    Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  } else {
    $env:NODE_OPTIONS = $previousNodeOptions
  }
}

Write-Host "Official DSH ready: release $resolvedRef, version $cliVersion, Node $nodeVersionText"
Write-Host 'Optional after adapter/upstream changes: pnpm test:official:smoke'
