# Force remove Git lock file
# This script attempts multiple methods to remove the lock file

Write-Host "Attempting to remove Git lock file..." -ForegroundColor Yellow

$lockPath = ".git\index.lock"
$maxAttempts = 10

if (-not (Test-Path $lockPath)) {
    Write-Host "No lock file found. Git should work normally." -ForegroundColor Green
    exit 0
}

Write-Host "Lock file exists. Attempting removal..." -ForegroundColor Yellow

# Method 1: Try normal removal
for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
        Remove-Item -Path $lockPath -Force -ErrorAction Stop
        Write-Host "  ✓ Lock file removed on attempt $i" -ForegroundColor Green
        break
    } catch {
        if ($i -lt $maxAttempts) {
            Write-Host "  Attempt $i failed, waiting 500ms..." -ForegroundColor Gray
            Start-Sleep -Milliseconds 500
        } else {
            Write-Host "  ✗ Could not remove lock file after $maxAttempts attempts" -ForegroundColor Red
        }
    }
}

# Verify removal
if (Test-Path $lockPath) {
    Write-Host "`nLock file still exists. Trying alternative method..." -ForegroundColor Yellow
    
    # Method 2: Try using cmd to delete (sometimes works when PowerShell doesn't)
    $result = cmd /c "del /F /Q `"$lockPath`" 2>&1"
    Start-Sleep -Milliseconds 200
    
    if (-not (Test-Path $lockPath)) {
        Write-Host "  ✓ Lock file removed using cmd" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Still cannot remove lock file" -ForegroundColor Red
        Write-Host "`nSOLUTION: Please close Cursor completely and run this script again, OR" -ForegroundColor Yellow
        Write-Host "manually delete the file using File Explorer or another tool." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "`nVerifying Git status..." -ForegroundColor Cyan
git status
Write-Host "`nLatest commit:" -ForegroundColor Cyan
git log --oneline -1

Write-Host "`n✓ SUCCESS: Lock file removed. Git should work normally now." -ForegroundColor Green



