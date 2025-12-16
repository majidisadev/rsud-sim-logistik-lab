@echo off
cd /d "%~dp0"
echo Installing all dependencies...
echo.
npm run install:all
pause

