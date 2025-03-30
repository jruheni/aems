@echo off
echo Setting up environment...
set MISTRAL_API_KEY=your_mistral_api_key_here

echo Starting backend server...
start cmd /k "cd backend && python app.py"

echo Waiting for backend to start...
timeout /t 2 /nobreak > nul

echo Starting frontend server...
start cmd /k "cd frontend && npm run dev"

echo Both servers are running. Close this window when done. 