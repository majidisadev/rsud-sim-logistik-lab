@echo off
cd /d "%~dp0"
echo Building project...
echo.
echo Building backend...
call npm run build:backend
if errorlevel 1 (
    echo Backend build failed!
    pause
    exit /b 1
)
echo.
echo Building frontend...
call npm run build:frontend
if errorlevel 1 (
    echo Frontend build failed!
    pause
    exit /b 1
)
echo.
echo Build completed successfully!
pause

