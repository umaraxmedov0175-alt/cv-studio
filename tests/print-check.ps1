# Print / PDF regression check.
#
# Renders index.html to PDF with headless Chrome or Edge and asserts the output
# is a real A4 document rather than a blank page, and that long content
# paginates instead of being clipped to a single viewport.
#
#   powershell -ExecutionPolicy Bypass -File .\tests\print-check.ps1
#
# Exits 0 when every scenario passes, 1 otherwise.

$ErrorActionPreference = 'Stop'

$testsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $testsDir

$harness = Join-Path $testsDir 'print-harness.html'
$indexPage = Join-Path $root 'app\index.html'
foreach ($f in @($harness, $indexPage)) {
  if (-not (Test-Path $f)) { throw "Missing required file: $f" }
}

$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $browser) { throw 'No Chrome or Edge installation found.' }

# A blank PDF is about 1 KB; real CV pages embed fonts and run to tens of KB.
$minRealBytes = 10000

function Get-PdfStats {
  param([string]$Path)
  $latin1 = [System.Text.Encoding]::GetEncoding(28591)
  $raw = [System.IO.File]::ReadAllText($Path, $latin1)
  $pages = ([regex]::Matches($raw, '/Type\s*/Page[^s]')).Count
  $box = [regex]::Match($raw, '/MediaBox\s*\[\s*([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s*\]')
  $w = 0; $h = 0
  if ($box.Success) { $w = [double]$box.Groups[3].Value; $h = [double]$box.Groups[4].Value }
  return [pscustomobject]@{ Pages = $pages; Width = $w; Height = $h; Bytes = (Get-Item $Path).Length }
}

$results = @()
foreach ($mode in @('sample', 'empty', 'long')) {
  $profile = Join-Path $env:TEMP ("cv_print_" + [guid]::NewGuid().ToString('N').Substring(0, 8))
  New-Item -ItemType Directory -Path $profile -Force | Out-Null
  $pdf = Join-Path $env:TEMP ("cv_print_$mode.pdf")
  if (Test-Path $pdf) { Remove-Item $pdf -Force }

  $common = @('--headless=new', '--disable-gpu', '--no-sandbox',
    '--allow-file-access-from-files', "--user-data-dir=$profile")

  # 1) Seed the profile with the requested CV.
  $seedUrl = ([Uri]$harness).AbsoluteUri + "?mode=$mode"
  Start-Process -FilePath $browser -NoNewWindow -Wait `
    -ArgumentList ($common + @('--virtual-time-budget=8000', '--dump-dom', $seedUrl)) `
    -RedirectStandardOutput (Join-Path $env:TEMP "seed_$mode.html") `
    -RedirectStandardError (Join-Path $env:TEMP "seed_$mode.err") | Out-Null

  # 2) Print the app with that same profile.
  $appUrl = ([Uri]$indexPage).AbsoluteUri
  Start-Process -FilePath $browser -NoNewWindow -Wait `
    -ArgumentList ($common + @('--virtual-time-budget=10000', '--no-pdf-header-footer', "--print-to-pdf=$pdf", $appUrl)) `
    -RedirectStandardOutput (Join-Path $env:TEMP "print_$mode.out") `
    -RedirectStandardError (Join-Path $env:TEMP "print_$mode.err") | Out-Null

  Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue

  if (-not (Test-Path $pdf)) {
    $results += [pscustomobject]@{ Mode = $mode; Ok = $false; Note = 'no PDF produced' }
    continue
  }

  $stats = Get-PdfStats -Path $pdf
  $ok = $true
  $note = "$($stats.Pages) page(s), $($stats.Bytes) bytes"

  if ($stats.Bytes -lt $minRealBytes) {
    $ok = $false; $note += ' - BLANK PAGE (print CSS is hiding the sheet)'
  }
  if ($stats.Width -lt 590 -or $stats.Width -gt 600 -or $stats.Height -lt 838 -or $stats.Height -gt 846) {
    $ok = $false; $note += " - not A4 ($($stats.Width) x $($stats.Height) pt)"
  }
  if ($mode -eq 'empty' -and $stats.Pages -ne 1) {
    $ok = $false; $note += ' - empty CV must be exactly 1 page'
  }
  if ($mode -eq 'long' -and $stats.Pages -lt 2) {
    $ok = $false; $note += ' - long CV was clipped instead of paginating'
  }

  $results += [pscustomobject]@{ Mode = $mode; Ok = $ok; Note = $note }
}

Write-Host "Browser: $browser"
Write-Host ''
foreach ($r in $results) {
  $tag = if ($r.Ok) { 'PASS' } else { 'FAIL' }
  $color = if ($r.Ok) { 'Green' } else { 'Red' }
  Write-Host ("  [{0}] {1,-7} {2}" -f $tag, $r.Mode, $r.Note) -ForegroundColor $color
}

$failed = ($results | Where-Object { -not $_.Ok }).Count
Write-Host ''
if ($failed -eq 0) {
  Write-Host "PRINT CHECK PASSED ($($results.Count) scenarios)" -ForegroundColor Green
  exit 0
}
Write-Host "PRINT CHECK FAILED ($failed of $($results.Count) scenarios)" -ForegroundColor Red
exit 1
