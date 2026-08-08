[CmdletBinding()]
param(
  [switch]$All,
  [string[]]$Issue
)

$repo = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repo 'tools\formula-lab'
$files = @('ui-shell.css', 'ui-shell.js', 'lab-tokens.css', 'v3-shell.css')

if (-not (Test-Path (Join-Path $source 'ui-shell.css'))) { throw "Missing Formula Lab source: $source" }
if (-not $All -and -not $Issue) { throw 'Pass -All or one or more -Issue folder names. Existing releases are only changed explicitly.' }

$destinations = @()
if ($All) {
  $destinations += Join-Path $repo '_template\template'
  $destinations += Get-ChildItem -Path $repo -Directory | Where-Object { $_.Name -match '^\d{3}-' } | ForEach-Object { Join-Path $_.FullName 'template' }
}
foreach ($name in $Issue) { $destinations += Join-Path $repo "$name\template" }

$destinations | Select-Object -Unique | ForEach-Object {
  $destination = $_
  if (-not (Test-Path $destination)) { throw "Template folder not found: $destination" }
  foreach ($file in $files) { Copy-Item -LiteralPath (Join-Path $source $file) -Destination (Join-Path $destination $file) -Force }
  Write-Host "Synced: $destination"
}
