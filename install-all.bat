@echo off
cd /d "%~dp0"
echo Installing all dependencies...
echo.
npm run install:all
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Instalasi berhasil!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Instalasi gagal!
    echo ========================================
)
pause

