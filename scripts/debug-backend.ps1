# Debug script to test backend startup
Write-Host "Testing backend startup..." -ForegroundColor Cyan

# Check if backend exe exists
$backendPath = "frontend\src-tauri\target\release\wallet-backend.exe"
if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: Backend exe not found at $backendPath" -ForegroundColor Red
    exit 1
}

Write-Host "Backend exe found: $backendPath" -ForegroundColor Green

# Check port 55001
Write-Host "`nChecking port 55001..." -ForegroundColor Cyan
$portCheck = netstat -ano | findstr :55001
if ($portCheck) {
    Write-Host "WARNING: Port 55001 is already in use:" -ForegroundColor Yellow
    Write-Host $portCheck
} else {
    Write-Host "Port 55001 is free" -ForegroundColor Green
}

# Try to start backend manually
Write-Host "`nStarting backend manually (press Ctrl+C to stop)..." -ForegroundColor Cyan
Write-Host "You should see: 'Server is running on port 55001'" -ForegroundColor Yellow
Write-Host ""

cd frontend\src-tauri\target\release
$env:PORT = "55001"
.\wallet-backend.exe
