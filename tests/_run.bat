@echo off
cd /d "%~dp0"

npx http-server -o /index.html -p 8080

pause