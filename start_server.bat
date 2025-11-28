@echo off
cd /d "%~dp0"
echo Starting Movie Night Server at http://localhost:8000
echo Press Ctrl+C to stop.
php -S localhost:8000
pause
