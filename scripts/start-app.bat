@echo off
setlocal

set "APP_DIR=%~dp0.."
set "APP_URL=http://localhost:3001"

cd /d "%APP_DIR%"

echo Starting thesis-reader server...
start "thesis-reader server" cmd /k npm start

:wait_loop
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%APP_URL%' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 goto wait_loop

start "" "%APP_URL%"
