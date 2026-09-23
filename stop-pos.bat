@echo off
echo Stopping POS-Polar (port 3100, node only)...
FOR /F "tokens=5" %%P IN ('netstat -aon ^| find ":3100" ^| find "LISTEN"') DO (
  tasklist /FI "PID eq %%P" ^| find /I "node.exe" >nul && taskkill /F /PID %%P
)
echo done
pause
