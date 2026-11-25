# Runs the in-browser unit test suite in headless Chrome or Edge.
# Portable: resolves everything relative to this script, so it works from any folder.
#
#   powershell -ExecutionPolicy Bypass -File .\run_tests.ps1
#
# Exits with code 0 when every test passes, 1 otherwise.

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$testPage = Join-Path $root 'tests\run-tests.html'

if (-not (Test-Path $testPage)) {
  throw "Test page not found: $testPage"
}

$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $browser) {
  throw 'No Chrome or Edge installation found. Install one, or open tests/run-tests.html manually.'
}

# Let the .NET Uri class build the file URL: it percent-encodes non-latin path
# segments (e.g. a Cyrillic checkout folder) while leaving the drive letter
# intact, so the URL Chrome receives is always pure ASCII.
$url = ([Uri](Resolve-Path $testPage).Path).AbsoluteUri
$outFile = Join-Path $env:TEMP 'cv_studio_test_results.html'
$errFile = Join-Path $env:TEMP 'cv_studio_test_stderr.txt'

Write-Host "Browser : $browser"
Write-Host "Suite   : $testPage"
Write-Host ''

$outFile, $errFile | ForEach-Object { if (Test-Path $_) { Remove-Item $_ -Force } }

$proc = Start-Process -FilePath $browser -NoNewWindow -PassThru `
  -ArgumentList @(
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--allow-file-access-from-files',
    '--virtual-time-budget=15000',
    '--dump-dom', $url
  ) -RedirectStandardOutput $outFile -RedirectStandardError $errFile

$proc | Wait-Process -Timeout 90 -ErrorAction SilentlyContinue
if (-not $proc.HasExited) { $proc | Stop-Process -Force }

$dom = if (Test-Path $outFile) { Get-Content -Path $outFile -Raw } else { $null }
if (-not $dom) {
  throw "Browser produced no output. See $errFile for details."
}

# --dump-dom returns the live DOM. The suite renders one row per assertion into
# #test-results, so slice that region (it ends at the summary box) and count badges.
$resultsStart = $dom.IndexOf('id="test-results"')
$summaryStart = $dom.IndexOf('id="test-summary"')
if ($resultsStart -lt 0 -or $summaryStart -le $resultsStart) {
  throw "Could not locate the test results block. Inspect $outFile"
}

$resultsHtml = $dom.Substring($resultsStart, $summaryStart - $resultsStart)
$passed = ([regex]::Matches($resultsHtml, 'class="badge badge-pass"')).Count
$failed = ([regex]::Matches($resultsHtml, 'class="badge badge-fail"')).Count
$total = $passed + $failed

if ($total -eq 0) {
  throw "The suite produced no results - it probably threw during import. Inspect $outFile and $errFile"
}

# Print suite titles so the output is readable at a glance.
[regex]::Matches($resultsHtml, '<div class="suite-header">(.*?)</div>') |
  ForEach-Object { Write-Host ("  - " + [System.Net.WebUtility]::HtmlDecode($_.Groups[1].Value)) }

if ($failed -gt 0) {
  Write-Host ''
  Write-Host 'Failures:' -ForegroundColor Red
  [regex]::Matches($resultsHtml, '<span class="badge badge-fail">FAIL</span>\s*<span>(.*?)</span>') |
    ForEach-Object { Write-Host ("  x " + [System.Net.WebUtility]::HtmlDecode($_.Groups[1].Value)) -ForegroundColor Red }
}

Write-Host ''
if ($failed -eq 0) {
  Write-Host "ALL TESTS PASSED  ($passed passed, 0 failed, $total total)" -ForegroundColor Green
  exit 0
}

Write-Host "SOME TESTS FAILED  ($passed passed, $failed failed, $total total)" -ForegroundColor Red
exit 1
