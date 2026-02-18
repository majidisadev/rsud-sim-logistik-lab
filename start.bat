@echo off
echo Starting Production Server...
echo.

cd /d "%~dp0"
call npm start

if errorlevel 1 (
  echo.
  pause
  exit /b 1
)
