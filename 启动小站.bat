@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing project dependencies...
  call npm.cmd install
  if errorlevel 1 goto failed
)

echo Starting Xiba Little Station...
call npm.cmd run dev -- --host 127.0.0.1 --open
if errorlevel 1 goto failed
exit /b 0

:failed
echo.
echo Startup failed. Check that Node.js is installed and review the error above.
pause
exit /b 1
