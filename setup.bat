@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title AGent Sweeps — Full Auto Installer

:: =====================================================
::  AGent Sweeps — Windows Setup (Double-click to run)
::  Cài đặt: VS Code + AGent Sweeps + Ollama + AI Model
:: =====================================================

:: Yêu cầu quyền Admin để cài phần mềm hệ thống
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [!] Dang yeu cau quyen Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Chạy PowerShell script chính với bypass ExecutionPolicy
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

pause
