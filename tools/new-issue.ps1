param(
  [Parameter(Mandatory=$true)][int]$Number,
  [Parameter(Mandatory=$true)][string]$Slug,
  [string]$Title = ""
)

$repo = Split-Path -Parent $PSScriptRoot
$nnn  = "{0:000}" -f $Number
$nn   = "{0:00}" -f $Number
$dest = Join-Path $repo ("{0}-{1}" -f $nnn, $Slug)

if (Test-Path $dest) { Write-Host "Already exists: $dest"; exit 1 }

Copy-Item -Recurse (Join-Path $repo "_template") $dest

foreach ($rel in @("README.md", "template\index.html")) {
  $f = Join-Path $dest $rel
  if (Test-Path $f) {
    $c = Get-Content $f -Raw -Encoding UTF8
    $c = $c -replace '\{\{NN\}\}', $nn
    if ($Title -ne "") { $c = $c -replace '\{\{TITLE\}\}', $Title }
    Set-Content -Path $f -Value $c -Encoding UTF8
  }
}

Write-Host ("Created: {0}" -f $dest)
Write-Host "Next steps:"
Write-Host "  1. Delete the unused subfolder (skill/ or template/)"
Write-Host "  2. Build the asset, add preview.png"
Write-Host "  3. Fill in the issue README.md"
Write-Host "  4. Update the index table in the root README.md"
