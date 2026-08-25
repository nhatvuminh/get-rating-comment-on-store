@echo off
title Review Scraper Server - http://localhost:3000
echo ========================================================
echo   Starting Review Scraper Server...
echo ========================================================
echo.
set "PATH=%LOCALAPPDATA%\OpenAI\Codex\runtimes\cua_node\cd454f7c85348168\bin;%PATH%"

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js version:
node -v
echo.
echo Server starting at http://localhost:3000
echo.
node server.js
pause
