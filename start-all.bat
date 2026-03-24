@echo off
echo ==============================================
echo   28syukatsu - Starting All Services
echo ==============================================

echo [1/3] Starting Core API (port 8789)...
start "Core API" cmd /k "node server/shukatsu-api.js"

timeout /t 1 /nobreak >nul

echo [2/3] Starting Email Server (port 8787)...
start "Email Server" cmd /k "node server/email-server.js"

timeout /t 1 /nobreak >nul

echo [3/3] Starting Frontend (port 5173)...
start "Frontend (Vite)" cmd /k "node node_modules/vite/bin/vite.js"

echo.
echo All services started! Check the 3 terminal windows.
echo Frontend: http://localhost:5173
pause
