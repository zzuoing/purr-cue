@echo off
setlocal
set ELECTRON_RUN_AS_NODE=1
"%~dp0PurrCue.exe" "%~dp0resources\cli\purrcue.cjs" %*
