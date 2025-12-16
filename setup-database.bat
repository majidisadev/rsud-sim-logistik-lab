@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================
echo Database Setup and Migration
echo ========================================
echo.

REM Check if backend/.env exists
if not exist "backend\.env" (
    echo ERROR: backend\.env file not found!
    echo Please create backend\.env file first.
    pause
    exit /b 1
)

REM Read .env file and extract database configuration
set DB_NAME=
set DB_HOST=
set DB_PORT=
set DB_USER=
set DB_PASSWORD=

for /f "usebackq tokens=1,* delims==" %%a in ("backend\.env") do (
    set "line=%%a"
    set "value=%%b"
    if "!line:~0,8!"=="DB_NAME=" set DB_NAME=!value!
    if "!line:~0,8!"=="DB_HOST=" set DB_HOST=!value!
    if "!line:~0,8!"=="DB_PORT=" set DB_PORT=!value!
    if "!line:~0,8!"=="DB_USER=" set DB_USER=!value!
    if "!line:~0,11!"=="DB_PASSWORD=" set DB_PASSWORD=!value!
)

REM Set defaults if not found
if "!DB_NAME!"=="" set DB_NAME=sim_logistik_lab
if "!DB_HOST!"=="" set DB_HOST=localhost
if "!DB_PORT!"=="" set DB_PORT=5432
if "!DB_USER!"=="" set DB_USER=postgres
if "!DB_PASSWORD!"=="" set DB_PASSWORD=postgres

echo Database Configuration:
echo   DB_NAME: !DB_NAME!
echo   DB_HOST: !DB_HOST!
echo   DB_PORT: !DB_PORT!
echo   DB_USER: !DB_USER!
echo.

REM Check if psql is available
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: psql command not found in PATH.
    echo Please ensure PostgreSQL bin directory is in your PATH.
    echo Or manually create the database: !DB_NAME!
    echo.
    echo Continuing with build and migration...
    echo.
) else (
    echo Creating database: !DB_NAME!
    echo.
    
    REM Set PGPASSWORD environment variable for psql
    set PGPASSWORD=!DB_PASSWORD!
    
    REM Try to create database (will fail if already exists, which is OK)
    psql -h !DB_HOST! -p !DB_PORT! -U !DB_USER! -d postgres -c "CREATE DATABASE !DB_NAME!;" 2>nul
    if %errorlevel% equ 0 (
        echo Database created successfully!
    ) else (
        echo Database already exists or creation failed (this is OK if database already exists).
    )
    echo.
    
    REM Clear PGPASSWORD
    set PGPASSWORD=
)

REM Build backend
echo ========================================
echo Building backend...
echo ========================================
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

REM Run migrations
echo ========================================
echo Running database migrations...
echo ========================================
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

