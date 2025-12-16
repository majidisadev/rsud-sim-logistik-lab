@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================
echo Database Setup and Migration
echo ========================================
echo.

REM Build backend lalu jalankan migrasi database
echo Building backend...
echo.
cd backend
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo.

echo Running database migrations...
echo.
call npm run migrate
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Migration failed!
    pause
    exit /b 1
)
echo.

cd ..
echo ========================================
echo Database setup completed successfully!
echo ========================================
pause

