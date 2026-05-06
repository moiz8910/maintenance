$ROOT = $PSScriptRoot

# ── Kill any processes already holding ports 8000 / 3000 ──────────────────
foreach ($port in @(8000, 3000)) {
    $pids = (netstat -ano | Select-String ":$port\s") |
            ForEach-Object { ($_ -split '\s+')[-1] } |
            Where-Object { $_ -match '^\d+$' } |
            Select-Object -Unique
    foreach ($p in $pids) {
        Write-Host "Killing PID $p on port $port..."
        taskkill /PID $p /F 2>$null | Out-Null
    }
}

Start-Sleep -Seconds 1

Write-Host "Running inspect_excel.py..."
python "$ROOT\backend\inspect_excel.py"

Write-Host "Running excel_to_sqlite.py..."
python "$ROOT\backend\excel_to_sqlite.py"

Write-Host "Running schedule_pending_wos.py..."
python "$ROOT\schedule_pending_wos.py"

Write-Host "Running assign_permits.py..."
python "$ROOT\assign_permits.py"

Write-Host "Running fix_resource_disciplines.py..."
python "$ROOT\fix_resource_disciplines.py"

Write-Host "Running apply_closure_rules.py..."
python "$ROOT\apply_closure_rules.py"

Write-Host "Starting Backend Server in a new window..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT'; python backend/main.py"

Write-Host "Starting Frontend Server in a new window..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; npm run dev"

Write-Host "All servers launched. Backend on :8000, Frontend on :3000"
