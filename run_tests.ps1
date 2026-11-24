$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outFile = "$env:TEMP\suite_results.html"
$proc = Start-Process -FilePath $edge -ArgumentList @("--headless=new", "--disable-gpu", "--allow-file-access-from-files", "--dump-dom", "file:///d:/Codes/agy/tests/run-tests.html") -NoNewWindow -PassThru -RedirectStandardOutput $outFile
$proc.WaitForExit(10000)
Get-Content $outFile | Select-String -Pattern 'badge|ALL TESTS|PASSED|FAILED'
