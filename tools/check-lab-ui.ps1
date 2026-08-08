[CmdletBinding()]
param([switch]$Strict)

$repo = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repo 'tools\formula-lab'
$required = @('ui-shell.css', 'ui-shell.js', 'lab-tokens.css')
$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
$targets = @((Join-Path $repo '_template\template'))
$targets += Get-ChildItem -Path $repo -Directory | Where-Object { $_.Name -match '^\d{3}-' } | ForEach-Object { Join-Path $_.FullName 'template' }

foreach ($target in $targets) {
  if (-not (Test-Path $target)) { continue }
  $name = Split-Path (Split-Path $target -Parent) -Leaf
  foreach ($file in $required) {
    $path = Join-Path $target $file
    if (-not (Test-Path $path)) { $errors.Add("$name is missing $file"); continue }
    if ($Strict) {
      $sourceHash = (Get-FileHash (Join-Path $source $file) -Algorithm SHA256).Hash
      $targetHash = (Get-FileHash $path -Algorithm SHA256).Hash
      if ($sourceHash -ne $targetHash) { $errors.Add("$name has an outdated $file; run .\tools\sync-lab-shell.ps1 -Issue $name") }
    }
  }
  $html = Join-Path $target 'index.html'
  if (-not (Test-Path $html)) { $errors.Add("$name is missing template/index.html"); continue }
  $content = Get-Content -LiteralPath $html -Raw -Encoding UTF8
  $markers = @(
    @{ Label = '.lab-app'; Pattern = 'class\s*=\s*"[^"]*\blab-app\b' },
    @{ Label = '#control-panel'; Pattern = 'id\s*=\s*"control-panel"' },
    @{ Label = 'data-lab-panel-toggle'; Pattern = 'data-lab-panel-toggle' },
    @{ Label = '.lab-panel__header'; Pattern = 'class\s*=\s*"[^"]*\blab-panel__header\b' },
    @{ Label = '.lab-panel__scroll'; Pattern = 'class\s*=\s*"[^"]*\blab-panel__scroll\b' },
    @{ Label = '.lab-panel__actions'; Pattern = 'class\s*=\s*"[^"]*\blab-panel__actions\b' },
    @{ Label = '.lab-stage'; Pattern = 'class\s*=\s*"[^"]*\blab-stage\b' },
    @{ Label = '.lab-stage__header'; Pattern = 'class\s*=\s*"[^"]*\blab-stage__header\b' },
    @{ Label = '.lab-stage__body'; Pattern = 'class\s*=\s*"[^"]*\blab-stage__body\b' },
    @{ Label = 'ui-shell.js'; Pattern = 'ui-shell\.js' }
  )
  foreach ($marker in $markers) {
    if ($content -notmatch $marker.Pattern) { $errors.Add("$name does not include the required shell marker: $($marker.Label)") }
  }
  $legacyPatterns = @(
    @{ Label = 'legacy field wrapper'; Pattern = '<div\s+class\s*=\s*"ctl"' },
    @{ Label = 'legacy check wrapper'; Pattern = '<label\s+class\s*=\s*"chk"' },
    @{ Label = 'legacy modal'; Pattern = '<div\s+class\s*=\s*"modal"' }
  )
  foreach ($legacy in $legacyPatterns) {
    if ($content -match $legacy.Pattern) { $errors.Add("$name still uses a $($legacy.Label); use the Formula Lab component class instead") }
  }
  if ($content -match 'data-lab-dialog' -and $content -notmatch 'aria-labelledby=') { $errors.Add("$name has a Lab dialog without an accessible title reference") }

  $motionSources = @($html) + (Get-ChildItem -LiteralPath $target -File -Recurse -Filter '*.css' | Select-Object -ExpandProperty FullName)
  foreach ($motionSource in $motionSources | Select-Object -Unique) {
    $motionContent = Get-Content -LiteralPath $motionSource -Raw -Encoding UTF8
    if ($motionContent -match 'transition\s*:\s*left') { $errors.Add("$name animates left in $(Split-Path $motionSource -Leaf); use transform instead") }
    if ($motionContent -match 'transition[^;]*(?:3[0-9]{2}|[4-9][0-9]{2})ms') { $errors.Add("$name has a UI transition over 300ms in $(Split-Path $motionSource -Leaf)") }
    if ($motionContent -match 'transition-duration:\s*\.01ms') { $errors.Add("$name uses blanket reduced-motion timing in $(Split-Path $motionSource -Leaf)") }
  }
  if ($content -match 'ALL PROJECTS|Open Controls|复位|上传图片') { $warnings.Add("$name still contains legacy UI copy") }
}

$warnings | ForEach-Object { Write-Warning $_ }
if ($errors.Count) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Host "Formula Lab UI check passed for $($targets.Count) template folders."
