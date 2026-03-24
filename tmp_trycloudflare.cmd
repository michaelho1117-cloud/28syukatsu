@echo off
setlocal
set "LOG=C:\Users\ADMIN\Desktop\graduate\cloudflared-live.log"
del /f /q "%LOG%" 2>nul
start "cf-tunnel" /min cmd /c "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://127.0.0.1:5173 --no-autoupdate > \"%LOG%\" 2>&1"
timeout /t 10 /nobreak >nul
type "%LOG%"
