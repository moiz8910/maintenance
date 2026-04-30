Write-Host "Running inspect_excel.py..."
python backend/inspect_excel.py

Write-Host "Running excel_to_sqlite.py..."
python backend/excel_to_sqlite.py

Write-Host "Starting Backend Server in a new window..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python backend/main.py"

Write-Host "Starting Frontend Server in a new window..."
cd frontend
npm install
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

