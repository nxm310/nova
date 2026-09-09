@echo off
chcp 65001 >nul
title NOVA — Compagnon Star Citizen
color 0b
cls
echo ==================================================================
echo         🚀  NOVA — COMPAGNON VOCAL STAR CITIZEN
echo ==================================================================
echo.
echo Verification de Python sur votre systeme...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas detecte sur votre ordinateur.
    echo 1. Rendez-vous sur https://www.python.org/downloads/
    echo 2. Important : Cochez "Add Python to PATH" lors de l'installation.
    echo.
    pause
    exit /b
)

echo Demarrage du compagnon et du pont clavier...
echo Votre navigateur va s'ouvrir automatiquement sur l'application !
echo.
python scripts/bridge.py
pause
