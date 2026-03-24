@echo off
setlocal
set "ROOT=%~dp0"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
set "LOG=%ROOT%startup.log"

echo [%date% %time%] Launch start_shukatsu.cmd > "%LOG%"
if not exist "%NPM_CMD%" (
  echo npm.cmd not found: %NPM_CMD% >> "%LOG%"
  exit /b 1
)

call :is_listening 8787
if errorlevel 1 (
  echo starting api:8787 >> "%LOG%"
  start "" /min cmd /c "cd /d \"%ROOT%\" && \"%NPM_CMD%\" run api >> \"%LOG%\" 2>&1"
)

call :is_listening 8789
if errorlevel 1 (
  echo starting api:core 8789 >> "%LOG%"
  start "" /min cmd /c "cd /d \"%ROOT%\" && \"%NPM_CMD%\" run api:core >> \"%LOG%\" 2>&1"
)

set "DEV_PORT="
call :is_listening 5173
if errorlevel 0 set "DEV_PORT=5173"
call :is_listening 5174
if errorlevel 0 if not defined DEV_PORT set "DEV_PORT=5174"

if not defined DEV_PORT (
  echo starting dev:5173 >> "%LOG%"
  start "" /min cmd /c "cd /d \"%ROOT%\" && \"%NPM_CMD%\" run dev -- --host 127.0.0.1 --port 5173 --strictPort >> \"%LOG%\" 2>&1"
  timeout /t 3 /nobreak >nul
  start "" "http://localhost:5173/"
) else (
  start "" "http://localhost:%DEV_PORT%/"
)

exit /b 0

:is_listening
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul
if errorlevel 1 (
  exit /b 1
) else (
  exit /b 0
)
